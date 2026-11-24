import { NextResponse } from 'next/server';
import { querySapServiceLayer, queryAllSapServiceLayer } from '@/lib/sapClient';
import { BusinessPartnerDetail, SapPriceList, SapPaymentTerm } from '@/types/sapBusiness';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decodedCardCode = decodeURIComponent(id).trim();

  if (!decodedCardCode) {
    return NextResponse.json(
      { success: false, error: 'Código de socio no especificado' },
      { status: 400 }
    );
  }

  const sanitized = decodedCardCode.replace(/'/g, "''");

  // Query SAP Service Layer by CardCode filter + PriceLists & PaymentTermsTypes catalogs in parallel
  const [filterResult, priceListsResult, paymentTermsResult] = await Promise.all([
    querySapServiceLayer('BusinessPartners', {
      params: {
        '$filter': `CardCode eq '${sanitized}'`,
        '$top': '1'
      }
    }),
    queryAllSapServiceLayer('PriceLists', {
      pageSize: 200,
      params: {
        '$orderby': 'PriceListNo asc',
        '$select': 'PriceListNo,PriceListName,BasePriceList,Factor,IsGrossPrice,Active,DefaultPrimeCurrency,ValidFrom,ValidTo'
      }
    }),
    queryAllSapServiceLayer('PaymentTermsTypes', {
      pageSize: 200,
      params: {
        '$orderby': 'GroupNumber asc',
        '$select': 'GroupNumber,PaymentTermsGroupName,PriceListNo'
      }
    })
  ]);

  if (!filterResult.success || !Array.isArray(filterResult.data) || filterResult.data.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: filterResult.error || `No se encontró el socio de negocio con código ${decodedCardCode} en SAP`
      },
      { status: 404 }
    );
  }

  const bp = filterResult.data[0];

  const priceLists: SapPriceList[] =
    priceListsResult.success && Array.isArray(priceListsResult.data)
      ? priceListsResult.data.map((pl: any) => ({
          priceListNo: Number(pl.PriceListNo),
          priceListName: pl.PriceListName || `Lista ${pl.PriceListNo}`,
          basePriceList: Number(pl.BasePriceList) || 1,
          factor: Number(pl.Factor) || 1.0,
          isGrossPrice: pl.IsGrossPrice === 'tYES',
          active: pl.Active === 'tYES',
          currency: pl.DefaultPrimeCurrency === '$' ? 'COP' : pl.DefaultPrimeCurrency || 'COP',
          validFrom: pl.ValidFrom ? String(pl.ValidFrom).slice(0, 10) : null,
          validTo: pl.ValidTo ? String(pl.ValidTo).slice(0, 10) : null
        }))
      : [];

  const paymentTermsList: SapPaymentTerm[] =
    paymentTermsResult.success && Array.isArray(paymentTermsResult.data)
      ? paymentTermsResult.data.map((pt: any) => ({
          groupNumber: Number(pt.GroupNumber),
          paymentTermsGroupName: pt.PaymentTermsGroupName || `Condición ${pt.GroupNumber}`,
          priceListNo: pt.PriceListNo !== undefined && pt.PriceListNo !== null ? Number(pt.PriceListNo) : null
        }))
      : [];

  const payTermsGrpCode =
    bp.PayTermsGrpCode !== undefined && bp.PayTermsGrpCode !== null ? Number(bp.PayTermsGrpCode) : null;
  const matchedPaymentTerm =
    payTermsGrpCode !== null ? paymentTermsList.find((pt) => pt.groupNumber === payTermsGrpCode) : undefined;

  const priceListNum =
    bp.PriceListNum !== undefined && bp.PriceListNum !== null ? Number(bp.PriceListNum) : null;
  const matchedPriceList =
    priceListNum !== null ? priceLists.find((pl) => pl.priceListNo === priceListNum) : undefined;

  const specialPriceListNames: Record<number, string> = {
    [-1]: 'Último precio de compra',
    [-2]: 'Último precio determinado'
  };

  const resolvedPriceListName =
    matchedPriceList?.priceListName ||
    (priceListNum !== null && specialPriceListNames[priceListNum]) ||
    (priceListNum !== null ? `Lista #${priceListNum}` : 'Sin lista asignada');

  let friendlyType: 'Cliente' | 'Proveedor' | 'Lead' = 'Cliente';
  if (bp.CardType === 'cSupplier') friendlyType = 'Proveedor';
  else if (bp.CardType === 'cLid') friendlyType = 'Lead';

  // Addresses formatting
  const addresses = Array.isArray(bp.BPAddresses)
    ? bp.BPAddresses.map((addr: any) => ({
        addressName: addr.AddressName || 'Dirección',
        street: addr.Street || addr.AddressName || '—',
        block: addr.Block || '',
        city: addr.City || '—',
        state: addr.State || '',
        country: addr.Country || 'CO',
        addressType: addr.AddressType === 'bo_BillTo' ? 'Facturación' : 'Envío',
        taxId: addr.FederalTaxID || ''
      }))
    : [];

  // Contact Employees formatting
  const contacts = Array.isArray(bp.ContactEmployees)
    ? bp.ContactEmployees.map((c: any) => ({
        id: c.InternalCode,
        name: c.Name || `${c.FirstName || ''} ${c.LastName || ''}`.trim() || 'Contacto',
        firstName: c.FirstName || '',
        lastName: c.LastName || '',
        position: c.Position || '—',
        address: c.Address || '',
        phone: c.Phone1 || '',
        cellPhone: c.MobilePhone || '',
        email: c.E_Mail || ''
      }))
    : [];

  // Payment methods
  const paymentMethods = Array.isArray(bp.BPPaymentMethods)
    ? bp.BPPaymentMethods.map((pm: any) => ({
        code: pm.PaymentMethodCode
      }))
    : [];

  const detail: BusinessPartnerDetail = {
    cardCode: bp.CardCode || '',
    cardName: bp.CardName || '',
    foreignName: bp.CardForeignName || bp.AliasName || '',
    aliasName: bp.AliasName || '',
    cardType: friendlyType,
    rawCardType: bp.CardType,
    taxId: bp.FederalTaxID || '—',
    currency: bp.Currency === '$' ? 'COP' : bp.Currency || 'COP',
    balance: Number(bp.CurrentAccountBalance) || 0,
    openOrdersBalance: Number(bp.OpenOrdersBalance) || 0,
    openOpportunities: Number(bp.OpenOpportunities) || 0,
    groupCode: bp.GroupCode,
    groupName: `Grupo ${bp.GroupCode || 'General'}`,
    status: bp.Frozen === 'tYES' ? 'Inactivo' : 'Activo',
    phone: bp.Phone1 || bp.Cellular || bp.Phone2 || '—',
    phone1: bp.Phone1 || '',
    phone2: bp.Phone2 || '',
    cellular: bp.Cellular || '',
    fax: bp.Fax || '',
    email: bp.EmailAddress || '',
    website: bp.Website || '',
    city: bp.City || '—',
    address: bp.Address || '—',
    shippingType: bp.ShippingType || '',
    contactPerson: bp.ContactPerson || '',
    projectCode: bp.ProjectCode || '',
    industry: bp.Industry || '',
    additionalId: bp.AdditionalID || '',
    unifiedFederalTaxId: bp.UnifiedFederalTaxID || '',
    notes: bp.FreeText || bp.Notes || '',
    channelPartnerCode: bp.ChannelPartnerCode || '',
    territory: bp.Territory ? String(bp.Territory) : '',
    languageCode: bp.LanguageCode,
    globalLocationNumber: bp.GlobalLocationNumber || '',
    blockMarketing: bp.BlockSendingMarketingContent === 'tYES',
    createDate: bp.CreateDate ? String(bp.CreateDate).slice(0, 10) : '',
    addresses,
    contacts,
    paymentMethods,
    paymentTerms: {
      payTermsGrpCode,
      payTermsGrpName:
        matchedPaymentTerm?.paymentTermsGroupName ||
        (payTermsGrpCode !== null ? `Condición #${payTermsGrpCode}` : 'Sin condición asignada'),
      interestRatePercent: Number(bp.IntrestRatePercent ?? bp.InterestRatePercent ?? 0) || 0,
      priceListNum,
      priceListName: resolvedPriceListName,
      discountPercent: Number(bp.DiscountPercent ?? 0) || 0,
      creditLimit: Number(bp.CreditLimit ?? 0) || 0,
      maxCommitment: Number(bp.MaxCommitment ?? 0) || 0
    },
    hbtLocalization: {
      tipDoc: bp.U_HBT_TipDoc,
      nombres: bp.U_HBT_Nombres,
      apellido1: bp.U_HBT_Apellido1,
      apellido2: bp.U_HBT_Apellido2,
      regTrib: bp.U_HBT_RegTrib,
      munMed: bp.U_HBT_MunMed,
      aplicaFel: bp.U_HBT_AplicaFel
    },
    raw: bp
  };

  return NextResponse.json({
    success: true,
    data: detail,
    priceLists,
    paymentTermsList,
    timestamp: new Date().toISOString()
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedCardCode = decodeURIComponent(id).trim();

    if (!decodedCardCode) {
      return NextResponse.json(
        { success: false, error: 'Código de socio no especificado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      contact,
      contacts,
      priceListNum,
      payTermsGrpCode,
      interestRatePercent,
      discountPercent,
      creditLimit,
      maxCommitment
    } = body;

    const list = Array.isArray(contacts) ? contacts : contact ? [contact] : [];
    const sapPatchBody: Record<string, any> = {};

    if (list.length > 0) {
      // Format for SAP Service Layer ContactEmployees sub-collection
      sapPatchBody.ContactEmployees = list.map((c: any) => {
        const item: Record<string, any> = {};

        // If id is provided, it's an existing contact update (InternalCode in OCPR)
        if (c.id !== undefined && c.id !== null && c.id !== '') {
          item.InternalCode = Number(c.id);
        }

        if (c.name !== undefined) item.Name = c.name;
        if (c.firstName !== undefined) item.FirstName = c.firstName;
        if (c.lastName !== undefined) item.LastName = c.lastName;
        if (c.position !== undefined) item.Position = c.position;
        if (c.phone !== undefined) item.Phone1 = c.phone;
        if (c.cellPhone !== undefined) item.MobilePhone = c.cellPhone;
        if (c.email !== undefined) item.E_Mail = c.email;
        if (c.address !== undefined) item.Address = c.address;

        return item;
      });
    }

    if (priceListNum !== undefined && priceListNum !== null && priceListNum !== '') {
      const parsedPriceList = Number(priceListNum);
      if (!Number.isInteger(parsedPriceList)) {
        return NextResponse.json(
          { success: false, error: 'El número de lista de precios no es válido' },
          { status: 400 }
        );
      }
      sapPatchBody.PriceListNum = parsedPriceList;
    }

    if (payTermsGrpCode !== undefined && payTermsGrpCode !== null && payTermsGrpCode !== '') {
      const parsedPayTerms = Number(payTermsGrpCode);
      if (Number.isInteger(parsedPayTerms)) {
        sapPatchBody.PayTermsGrpCode = parsedPayTerms;
      }
    }

    if (interestRatePercent !== undefined && interestRatePercent !== null && interestRatePercent !== '') {
      const parsedInterest = Number(interestRatePercent);
      if (Number.isFinite(parsedInterest)) {
        sapPatchBody.IntrestRatePercent = parsedInterest;
      }
    }

    if (discountPercent !== undefined && discountPercent !== null && discountPercent !== '') {
      const parsedDiscount = Number(discountPercent);
      if (Number.isFinite(parsedDiscount)) {
        sapPatchBody.DiscountPercent = parsedDiscount;
      }
    }

    if (creditLimit !== undefined && creditLimit !== null && creditLimit !== '') {
      const parsedCreditLimit = Number(creditLimit);
      if (Number.isFinite(parsedCreditLimit)) {
        sapPatchBody.CreditLimit = parsedCreditLimit;
      }
    }

    if (maxCommitment !== undefined && maxCommitment !== null && maxCommitment !== '') {
      const parsedMaxCommitment = Number(maxCommitment);
      if (Number.isFinite(parsedMaxCommitment)) {
        sapPatchBody.MaxCommitment = parsedMaxCommitment;
      }
    }

    if (Object.keys(sapPatchBody).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se enviaron datos válidos para actualizar en SAP' },
        { status: 400 }
      );
    }

    const sanitized = decodedCardCode.replace(/'/g, "''");

    // In SAP Service Layer, updates are performed using PATCH on the BusinessPartners entity
    const sapResult = await querySapServiceLayer(`BusinessPartners('${sanitized}')`, {
      method: 'PATCH',
      body: sapPatchBody
    });

    if (!sapResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sapResult.error || 'Error al actualizar el socio de negocio en SAP Service Layer'
        },
        { status: 500 }
      );
    }

    const message =
      sapPatchBody.PriceListNum !== undefined && list.length === 0
        ? `Lista de precios (#${sapPatchBody.PriceListNum}) actualizada correctamente en SAP Business One`
        : list.length > 0
        ? 'Contacto(s) actualizado(s) correctamente en SAP Business One'
        : 'Socio de negocio actualizado correctamente en SAP Business One';

    return NextResponse.json({
      success: true,
      message,
      updatedFields: sapPatchBody
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error interno del servidor al procesar la actualización' },
      { status: 500 }
    );
  }
}

// Support PUT as an alias for PATCH so both methods can be used
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return PATCH(request, props);
}
