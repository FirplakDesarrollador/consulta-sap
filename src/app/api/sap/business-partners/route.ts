import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { BusinessPartner } from '@/types/sapBusiness';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10)));
  const skip = (page - 1) * limit;

  const search = searchParams.get('search')?.trim();
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  // Build OData $filter
  const filterParts: string[] = [];

  // Type filter: cCustomer (Cliente), cSupplier (Proveedor), cLid (Lead)
  if (type && type !== 'ALL') {
    if (type === 'Cliente' || type === 'cCustomer') {
      filterParts.push(`CardType eq 'cCustomer'`);
    } else if (type === 'Proveedor' || type === 'cSupplier') {
      filterParts.push(`CardType eq 'cSupplier'`);
    } else if (type === 'Lead' || type === 'cLid') {
      filterParts.push(`CardType eq 'cLid'`);
    }
  }

  // Status filter: Valid vs Frozen
  if (status && status !== 'ALL') {
    if (status === 'Activo') {
      filterParts.push(`Valid eq 'tYES'`);
    } else if (status === 'Inactivo') {
      filterParts.push(`Frozen eq 'tYES'`);
    }
  }

  // Search filter across CardCode, CardName, FederalTaxID (NIT), and AliasName
  if (search) {
    const sanitized = search.replace(/'/g, "''");
    filterParts.push(
      `(contains(CardName, '${sanitized}') or contains(CardCode, '${sanitized}') or contains(FederalTaxID, '${sanitized}') or contains(AliasName, '${sanitized}'))`
    );
  }

  const filterString = filterParts.length > 0 ? filterParts.join(' and ') : undefined;

  const params: Record<string, string> = {
    '$skip': String(skip),
    '$orderby': 'CardCode asc',
    '$select': 'CardCode,CardName,CardType,FederalTaxID,Phone1,Phone2,Cellular,EmailAddress,City,Address,CurrentAccountBalance,Currency,Valid,Frozen,ContactPerson,GroupCode,AliasName,Website,Notes,FreeText,CreateDate'
  };

  if (filterString) {
    params['$filter'] = filterString;
  }

  const result = await querySapServiceLayer('BusinessPartners', {
    pageSize: limit,
    params
  });

  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'No se pudieron obtener los socios de negocio de SAP',
        data: [],
        page,
        limit,
        total: 0,
        hasMore: false
      },
      { status: 500 }
    );
  }

  const mappedPartners: BusinessPartner[] = result.data.map((bp: any) => {
    let friendlyType: 'Cliente' | 'Proveedor' | 'Lead' = 'Cliente';
    if (bp.CardType === 'cSupplier') friendlyType = 'Proveedor';
    else if (bp.CardType === 'cLid') friendlyType = 'Lead';

    return {
      cardCode: bp.CardCode || '',
      cardName: bp.CardName || 'Sin Nombre Registrado',
      cardType: friendlyType,
      rawCardType: bp.CardType,
      taxId: bp.FederalTaxID || '—',
      phone: bp.Phone1 || bp.Cellular || bp.Phone2 || '—',
      phone1: bp.Phone1 || '',
      phone2: bp.Phone2 || '',
      cellular: bp.Cellular || '',
      email: bp.EmailAddress || '—',
      website: bp.Website || '',
      city: bp.City || '—',
      address: bp.Address || '—',
      balance: Number(bp.CurrentAccountBalance) || 0,
      currency: bp.Currency === '$' ? 'COP' : bp.Currency || 'COP',
      groupCode: bp.GroupCode,
      groupName: `Grupo ${bp.GroupCode || 'General'}`,
      status: bp.Frozen === 'tYES' ? 'Inactivo' : 'Activo',
      contactPerson: bp.ContactPerson || '',
      aliasName: bp.AliasName || '',
      notes: bp.FreeText || bp.Notes || ''
    };
  });

  const hasMore = Boolean(result.nextLink || mappedPartners.length >= limit);

  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    page,
    limit,
    count: mappedPartners.length,
    hasMore,
    nextLink: result.nextLink,
    data: mappedPartners,
    timestamp: new Date().toISOString()
  });
}
