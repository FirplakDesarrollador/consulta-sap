import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

export interface SAPSession {
  sessionId: string;
  version: string;
  sessionTimeout: number;
  routeId?: string;
  cookies: string[];
  expiresAt: number;
}

let cachedSession: SAPSession | null = null;

const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1';
const SAP_COMPANY_DB = process.env.SAP_COMPANY_DB || 'Firplak_SA';
const SAP_USERNAME = process.env.SAP_USERNAME || 'manager';
const SAP_PASSWORD = process.env.SAP_PASSWORD || '2023Fir#.*';

function parseUrl(urlStr: string) {
  const u = new URL(urlStr);
  return {
    hostname: u.hostname,
    port: u.port ? parseInt(u.port) : 50000,
    basePath: u.pathname.replace(/\/$/, '')
  };
}

/**
 * Performs low-level HTTPS request to SAP Service Layer with 45s timeout
 */
function makeHttpsRequest(options: {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ statusCode: number; headers: Record<string, any>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: options.hostname,
        port: options.port,
        path: options.path,
        method: options.method,
        headers: options.headers || {},
        agent: agent,
        timeout: 45000
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body: responseBody
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('SAP Service Layer request timed out (45s)'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Login and get B1SESSION
 */
export async function getSapSession(): Promise<SAPSession> {
  const now = Date.now();
  if (cachedSession && cachedSession.expiresAt > now + 2 * 60 * 1000) {
    return cachedSession;
  }

  const { hostname, port, basePath } = parseUrl(SAP_BASE_URL);
  const payload = JSON.stringify({
    CompanyDB: SAP_COMPANY_DB,
    UserName: SAP_USERNAME,
    Password: SAP_PASSWORD
  });

  const res = await makeHttpsRequest({
    hostname,
    port,
    path: `${basePath}/Login`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString()
    },
    body: payload
  });

  if (res.statusCode !== 200) {
    throw new Error(`SAP Login Failed (HTTP ${res.statusCode}): ${res.body}`);
  }

  const data = JSON.parse(res.body);
  const setCookie = res.headers['set-cookie'] || [];
  const sessionTimeout = data.SessionTimeout || 30;

  cachedSession = {
    sessionId: data.SessionId,
    version: data.Version,
    sessionTimeout,
    cookies: Array.isArray(setCookie) ? setCookie : [setCookie],
    expiresAt: now + sessionTimeout * 60 * 1000
  };

  return cachedSession;
}

/**
 * Execute query on SAP Service Layer with pagination support
 */
export async function querySapServiceLayer<T = any>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    params?: Record<string, string>;
    pageSize?: number;
  }
): Promise<{ success: boolean; data?: T; total?: number; nextLink?: string; error?: string }> {
  try {
    const session = await getSapSession();
    const { hostname, port, basePath } = parseUrl(SAP_BASE_URL);

    let path = `${basePath}/${endpoint.replace(/^\//, '')}`;
    if (options?.params) {
      const searchParams = new URLSearchParams(options.params).toString();
      path += (path.includes('?') ? '&' : '?') + searchParams;
    }

    const cookieHeader = session.cookies.map((c) => c.split(';')[0]).join('; ');
    const reqBody = options?.body ? JSON.stringify(options.body) : undefined;
    const pageSize = options?.pageSize || 100;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Cookie: cookieHeader,
      'B1S-CaseInsensitive': 'true',
      Prefer: `odata.maxpagesize=${pageSize}`,
      'B1S-PageSize': String(pageSize)
    };

    if (reqBody) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(reqBody).toString();
    }

    const res = await makeHttpsRequest({
      hostname,
      port,
      path,
      method: options?.method || 'GET',
      headers,
      body: reqBody
    });

    if (res.statusCode >= 400) {
      return {
        success: false,
        error: `SAP Service Layer HTTP ${res.statusCode}: ${res.body}`
      };
    }

    if (res.statusCode === 204) {
      return { success: true };
    }

    const json = JSON.parse(res.body);
    return {
      success: true,
      data: json.value !== undefined ? json.value : json,
      total: json['odata.count'] || (Array.isArray(json.value) ? json.value.length : 1),
      nextLink: json['odata.nextLink']
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de conexión con SAP Service Layer'
    };
  }
}
