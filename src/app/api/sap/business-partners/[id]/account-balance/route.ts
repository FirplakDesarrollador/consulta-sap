import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardCode = decodeURIComponent(id).trim();

  const { searchParams } = new URL(request.url);
  const monthsParam = parseInt(searchParams.get('months') || '6', 10);
  const customStartDate = searchParams.get('startDate');
  const customEndDate = searchParams.get('endDate');

  // Compute startDate (default: last 6 months from now)
  let startDateStr = '';
  if (customStartDate && /^\d{4}-\d{2}-\d{2}$/.test(customStartDate)) {
    startDateStr = customStartDate.replace(/-/g, '');
  } else if (customStartDate && /^\d{8}$/.test(customStartDate)) {
    startDateStr = customStartDate;
  } else {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsParam);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    startDateStr = `${yyyy}${mm}${dd}`;
  }

  // Compute endDate filter (if provided)
  let endDateStr = '';
  if (customEndDate && /^\d{4}-\d{2}-\d{2}$/.test(customEndDate)) {
    endDateStr = customEndDate.replace(/-/g, '');
  } else if (customEndDate && /^\d{8}$/.test(customEndDate)) {
    endDateStr = customEndDate;
  }

  try {
    const result = await querySapServiceLayer("SQLQueries('AGY_BPSaldoCuenta')/List", {
      params: {
        cardCode: `'${cardCode.replace(/'/g, "''")}'`,
        startDate: `'${startDateStr}'`
      }
    });

    if (!result.success || !Array.isArray(result.data)) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al obtener el saldo de cuenta de SAP',
          data: []
        },
        { status: 500 }
      );
    }

    // Friendly TransType mappings from SAP Business One
    const transTypeLabels: Record<number, string> = {
      13: 'Factura Clientes (FC)',
      14: 'Nota Crédito Clientes (NC)',
      18: 'Factura Proveedor (FP)',
      19: 'Nota Crédito Proveedor (NP)',
      24: 'Pago Recibido (PR)',
      46: 'Pago Efectuado (PE)',
      30: 'Asiento Diario (AS)',
      20: 'Entrada Mercancías (EM)',
      21: 'Devolución Mercancías (DM)',
      [-2]: 'Saldo Inicial (SI)'
    };

    const transTypeShort: Record<number, string> = {
      13: 'FC',
      14: 'NC',
      18: 'FP',
      19: 'NP',
      24: 'PR',
      46: 'PE',
      30: 'AS',
      20: 'EM',
      21: 'DM',
      [-2]: 'SI'
    };

    function formatDate(val: any): string {
      if (!val) return '—';
      const str = String(val).trim();
      if (/^\d{8}$/.test(str)) {
        return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
      }
      if (str.length >= 10) {
        return str.slice(0, 10);
      }
      return str;
    }

    // Filter by endDate if specified
    const rawRows = endDateStr
      ? result.data.filter((r: any) => {
          const rDate = String(r.RefDate || '').slice(0, 8);
          return rDate <= endDateStr;
        })
      : result.data;

    let totalDebit = 0;
    let totalCredit = 0;

    const mapped = rawRows.map((row: any, idx: number) => {
      const debit = Number(row.Debit) || 0;
      const credit = Number(row.Credit) || 0;
      const netAmount = debit - credit;

      totalDebit += debit;
      totalCredit += credit;

      const numTransType = Number(row.TransType);

      return {
        lineNum: idx + 1,
        transId: row.TransId,
        lineId: row.LineId,
        refDate: formatDate(row.RefDate),
        dueDate: formatDate(row.DueDate),
        taxDate: formatDate(row.TaxDate),
        rawRefDate: String(row.RefDate || ''),
        transType: numTransType,
        transTypeLabel: transTypeLabels[numTransType] || `Tipo ${row.TransType}`,
        transTypeShort: transTypeShort[numTransType] || `T${row.TransType}`,
        baseRef: String(row.BaseRef || row.TransId || '—'),
        contraAct: row.ContraAct || '—',
        lineMemo: row.LineMemo || '—',
        debit,
        credit,
        netAmount,
        fcDebit: Number(row.FCDebit) || 0,
        fcCredit: Number(row.FCCredit) || 0,
        fcCurrency: row.FCCurrency || '',
        balDueDeb: Number(row.BalDueDeb) || 0,
        balDueCred: Number(row.BalDueCred) || 0
      };
    });

    return NextResponse.json({
      success: true,
      cardCode,
      startDate: startDateStr,
      endDate: endDateStr || undefined,
      months: monthsParam,
      count: mapped.length,
      totalDebit,
      totalCredit,
      netTotal: totalDebit - totalCredit,
      data: mapped,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error interno del servidor',
        data: []
      },
      { status: 500 }
    );
  }
}
