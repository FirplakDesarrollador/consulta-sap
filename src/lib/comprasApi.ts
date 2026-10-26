/**
 * Cliente (navegador) para las rutas de escritura de Compras.
 * Normaliza la respuesta: éxito, error de validación, error del SAP Service Layer, simulación (dryRun)
 * o escrituras deshabilitadas (SAP_ALLOW_WRITES).
 */
export interface WriteResult {
  ok: boolean;
  message: string;
  dryRun?: boolean;
  writesDisabled?: boolean;
  request?: { method: string; path: string; body: unknown };
  data?: unknown;
}

export async function sapWrite(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  opts: { dryRun?: boolean } = {}
): Promise<WriteResult> {
  const finalUrl = opts.dryRun ? `${url}${url.includes('?') ? '&' : '?'}dryRun=1` : url;
  try {
    const res = await fetch(finalUrl, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (json.dryRun) {
      return { ok: true, dryRun: true, message: json.message || 'Simulación', request: json.request };
    }
    if (json.writesDisabled) {
      return { ok: false, writesDisabled: true, message: json.error, request: json.request };
    }
    if (!res.ok || !json.success) {
      return { ok: false, message: json.error || `Error HTTP ${res.status}` };
    }
    return { ok: true, message: json.message || 'Operación realizada', data: json.data };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : 'Error de red' };
  }
}

export const money = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2 });
export const qty = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
export const today = () => new Date().toISOString().slice(0, 10);
