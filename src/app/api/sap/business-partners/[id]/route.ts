import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { BusinessPartnerDetail } from '@/types/sapBusiness';

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

  // Query SAP Service Layer by CardCode filter
  const filterResult = await querySapServiceLayer('BusinessPartners', {
    params: {
      '$filter': `CardCode eq '${sanitized}'`,
      '$top': '1'
    }
  });

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
    const { contact, contacts } = body;

    const list = Array.isArray(contacts) ? contacts : contact ? [contact] : [];

    if (list.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se enviaron datos de contacto para actualizar' },
        { status: 400 }
      );
    }

    // Format for SAP Service Layer ContactEmployees sub-collection
    const sapContactEmployees = list.map((c: any) => {
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

    const sanitized = decodedCardCode.replace(/'/g, "''");

    // In SAP Service Layer, child collection updates are performed using PATCH on the parent BusinessPartners entity
    const sapResult = await querySapServiceLayer(`BusinessPartners('${sanitized}')`, {
      method: 'PATCH',
      body: {
        ContactEmployees: sapContactEmployees
      }
    });

    if (!sapResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sapResult.error || 'Error al actualizar contactos en SAP Service Layer'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contacto(s) actualizado(s) correctamente en SAP Business One'
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
