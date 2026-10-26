'use client';

import { useCallback, useEffect, useState } from 'react';

/** Respuesta JSON estándar de las rutas /api/sap/* */
export interface SapApiJson<T> {
  success: boolean;
  data?: T;
  error?: string;
  hasMore?: boolean;
  writesEnabled?: boolean;
  [k: string]: unknown;
}

interface QueryState<T> {
  key: string;
  json: SapApiJson<T> | null;
  error: string | null;
}

/**
 * GET contra una ruta /api/sap/* sin setState síncrono dentro del efecto:
 * el estado de carga se deriva comparando la clave de la última respuesta con la clave actual.
 * `deps` adicionales (p.ej. refreshKey del Header) fuerzan una nueva consulta.
 */
export function useSapQuery<T>(url: string | null, deps: (string | number)[] = []) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<QueryState<T>>({ key: '', json: null, error: null });
  const key = url ? `${url}#${version}#${deps.join('|')}` : '';

  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((res) => res.json() as Promise<SapApiJson<T>>)
      .then((json) => {
        if (!alive) return;
        setState({
          key,
          json,
          error: json.success ? null : json.error || 'Error al conectar con SAP Service Layer'
        });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setState({ key, json: null, error: err instanceof Error ? err.message : 'Error al conectar con SAP' });
      });
    return () => {
      alive = false;
    };
    // `key` ya incluye url, versión y deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const isLoading = Boolean(url) && state.key !== key;

  return {
    isLoading,
    json: state.json,
    data: state.json?.success ? (state.json.data ?? null) : null,
    error: isLoading ? null : state.error,
    reload
  };
}
