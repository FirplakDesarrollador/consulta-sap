import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';

export interface SapPriceList {
  priceListNo: number;
  priceListName: string;
  basePriceList: number;
  factor: number;
  isGrossPrice: boolean;
  active: boolean;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface ItemPriceRow {
  itemCode: string;
  itemName: string;
  foreignName?: string;
  groupCode?: number;
  uom?: string;
  priceListNo: number;
  priceListName?: string;
  price: number;
  currency: string;
  factor?: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priceListNoParam = searchParams.get('priceListNo');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(10, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // 1. Fetch Price Lists catalog from SAP
    const plRes = await querySapServiceLayer('PriceLists', {
      params: {
        '$orderby': 'PriceListNo asc',
        '$select': 'PriceListNo,PriceListName,BasePriceList,Factor,IsGrossPrice,Active,DefaultPrimeCurrency,ValidFrom,ValidTo'
      }
    });

    if (!plRes.success || !Array.isArray(plRes.data)) {
      return NextResponse.json(
        { success: false, error: plRes.error || 'No se pudieron obtener las listas de precios de SAP' },
        { status: 500 }
      );
    }

    const priceLists: SapPriceList[] = plRes.data.map((pl: any) => ({
      priceListNo: Number(pl.PriceListNo),
      priceListName: pl.PriceListName || `Lista ${pl.PriceListNo}`,
      basePriceList: Number(pl.BasePriceList) || 1,
      factor: Number(pl.Factor) || 1.0,
      isGrossPrice: pl.IsGrossPrice === 'tYES',
      active: pl.Active === 'tYES',
      currency: pl.DefaultPrimeCurrency === '$' ? 'COP' : pl.DefaultPrimeCurrency || 'COP',
      validFrom: pl.ValidFrom ? String(pl.ValidFrom).slice(0, 10) : null,
      validTo: pl.ValidTo ? String(pl.ValidTo).slice(0, 10) : null
    }));

    // If client only requested the lists catalog:
    const onlyLists = searchParams.get('onlyLists') === 'true';
    if (onlyLists) {
      return NextResponse.json({
        success: true,
        priceLists,
        timestamp: new Date().toISOString()
      });
    }

    // Determine target price list (default to first active or list 1)
    const selectedListNo = priceListNoParam ? parseInt(priceListNoParam, 10) : (priceLists[0]?.priceListNo || 1);
    const targetList = priceLists.find((pl) => pl.priceListNo === selectedListNo) || priceLists[0];
    const withPrice = searchParams.get('withPrice') === 'true';

    let itemsWithPrices: ItemPriceRow[] = [];
    let hasMore = false;

    // 2. If withPrice is requested, query items that have Price > 0 directly from SAP via AGY_PriceListItems
    if (withPrice) {
      const sqlRes = await querySapServiceLayer("SQLQueries('AGY_PriceListItems')/List", {
        params: {
          priceListNo: String(selectedListNo)
        },
        pageSize: 5000
      });

      if (sqlRes.success && Array.isArray(sqlRes.data)) {
        let allWithPrice: ItemPriceRow[] = sqlRes.data.map((r: any) => ({
          itemCode: r.ItemCode || '',
          itemName: r.ItemName || '',
          foreignName: r.ForeignName || '',
          groupCode: r.GroupCode,
          uom: r.Uom || 'UND',
          priceListNo: selectedListNo,
          priceListName: targetList?.priceListName || `Lista ${selectedListNo}`,
          price: Number(r.Price) || 0,
          currency: r.Currency === '$' ? 'COP' : r.Currency || targetList?.currency || 'COP',
          factor: Number(r.Factor) || 1
        }));

        if (search) {
          const s = search.toLowerCase();
          allWithPrice = allWithPrice.filter(
            (it) =>
              it.itemCode.toLowerCase().includes(s) ||
              it.itemName.toLowerCase().includes(s) ||
              (it.foreignName && it.foreignName.toLowerCase().includes(s))
          );
        }

        const totalFiltered = allWithPrice.length;
        itemsWithPrices = allWithPrice.slice(skip, skip + limit);
        hasMore = skip + limit < totalFiltered;
      }
    }

    // Fallback or standard fetch from Items catalog
    if (!withPrice || itemsWithPrices.length === 0) {
      if (!withPrice) {
        const filterParts: string[] = ["(ItemClass eq 'itcMaterial' or ItemClass eq 'itcService')"];
        if (search) {
          const sanitized = search.replace(/'/g, "''");
          filterParts.push(`(contains(ItemCode, '${sanitized}') or contains(ItemName, '${sanitized}'))`);
        }

        const itemsParams: Record<string, string> = {
          '$skip': String(skip),
          '$top': String(limit),
          '$select': 'ItemCode,ItemName,ForeignName,ItemsGroupCode,InventoryUOM,ItemPrices',
          '$orderby': 'ItemCode asc'
        };

        if (filterParts.length > 0) {
          itemsParams['$filter'] = filterParts.join(' and ');
        }

        const itemsRes = await querySapServiceLayer('Items', {
          params: itemsParams,
          pageSize: limit
        });

        if (itemsRes.success && Array.isArray(itemsRes.data)) {
          itemsWithPrices = itemsRes.data.map((item: any) => {
            const itemPricesArr = Array.isArray(item.ItemPrices) ? item.ItemPrices : [];
            const matchedPrice = itemPricesArr.find((ip: any) => Number(ip.PriceList) === selectedListNo);

            return {
              itemCode: item.ItemCode || '',
              itemName: item.ItemName || '',
              foreignName: item.ForeignName || '',
              groupCode: item.ItemsGroupCode,
              uom: item.InventoryUOM || 'UND',
              priceListNo: selectedListNo,
              priceListName: targetList?.priceListName || `Lista ${selectedListNo}`,
              price: matchedPrice ? Number(matchedPrice.Price) || 0 : 0,
              currency: matchedPrice?.Currency === '$' ? 'COP' : matchedPrice?.Currency || targetList?.currency || 'COP',
              factor: matchedPrice ? Number(matchedPrice.Factor) || 1 : 1
            };
          });
          hasMore = itemsWithPrices.length >= limit;
        }
      }
    }

    return NextResponse.json({
      success: true,
      selectedPriceList: targetList,
      priceLists,
      items: itemsWithPrices,
      page,
      limit,
      hasMore: itemsWithPrices.length >= limit,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al consultar listas de precios en SAP' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { itemCode, priceListNo, price, currency } = body;

    if (!itemCode || priceListNo === undefined || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Parámetros incompletos (itemCode, priceListNo, price son requeridos)' },
        { status: 400 }
      );
    }

    const sanitizedItemCode = String(itemCode).replace(/'/g, "''");

    const payload = {
      ItemPrices: [
        {
          PriceList: Number(priceListNo),
          Price: Number(price),
          Currency: currency === 'COP' ? '$' : currency || '$'
        }
      ]
    };

    const updateRes = await querySapServiceLayer(`Items('${sanitizedItemCode}')`, {
      method: 'PATCH',
      body: payload
    });

    if (!updateRes.success) {
      return NextResponse.json(
        { success: false, error: updateRes.error || 'Error al actualizar precio en SAP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Precio actualizado exitosamente en la lista ${priceListNo} para el artículo ${itemCode}`
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error interno al actualizar precio en SAP' },
      { status: 500 }
    );
  }
}
