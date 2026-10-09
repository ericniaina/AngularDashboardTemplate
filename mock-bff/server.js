// Dev-only mock BFF. Simulates the SSO/session/CRUD contract in docs/PROJECT_SPEC.md §13.
// Not a security reference: sessions live in memory and the "IdP" is a user picker.
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import {
  activitySeries,
  countries,
  departments,
  employees,
  orderLines,
  products,
  recentActivity,
  REGIONS,
  USERS,
} from './data.js';

const PORT = Number(process.env.PORT ?? 3000);
const ACCESS_TTL_MS = Number(process.env.ACCESS_TTL_MS ?? 60_000);
const REFRESH_TTL_MS = Number(process.env.REFRESH_TTL_MS ?? 1_800_000);
const LATENCY_MS = Number(process.env.LATENCY_MS ?? 250);
const COOKIE = 'bff_session';

/** sid -> { userId, accessExpiresAt, refreshExpiresAt } */
const sessions = new Map();

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Simulated network latency.
app.use((_req, _res, next) => (LATENCY_MS > 0 ? setTimeout(next, LATENCY_MS) : next()));

// ---------------------------------------------------------------- helpers

/** Only same-origin paths: "/x", never "//evil.com" or "/\evil.com". */
function sanitizeReturnUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}

function setSessionCookie(res, sid) {
  res.cookie(COOKIE, sid, { httpOnly: true, sameSite: 'lax', path: '/' });
}

function currentSession(req) {
  const sid = req.cookies[COOKIE];
  return sid ? { sid, session: sessions.get(sid) } : { sid: undefined, session: undefined };
}

function userOf(session) {
  return USERS.find((u) => u.id === session.userId);
}

const isIsoDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

// CSRF: cookie-authenticated mutations must carry X-CSRF: 1 (browsers can't add it cross-site).
// The IdP callback is exempt: it is a plain form post from the IdP page, before any session exists.
app.use((req, res, next) => {
  const safe = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (safe || req.path === '/bff/login/callback') return next();
  if (req.get('X-CSRF') !== '1') return res.status(403).json({ error: 'csrf' });
  next();
});

// ---------------------------------------------------------------- /bff (session)

app.get('/bff/login', (req, res) => {
  const returnUrl = sanitizeReturnUrl(req.query.returnUrl);
  const buttons = USERS.map(
    (u) => `
      <button name="userId" value="${u.id}">
        <strong>${escapeHtml(u.name)}</strong><span>${escapeHtml(u.roles.join(', '))}</span>
      </button>`,
  ).join('');
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock identity provider</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: Canvas; }
  main { width: min(360px, calc(100% - 32px)); border: 1px solid color-mix(in srgb, CanvasText 15%, transparent); border-radius: 8px; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; } p { margin: 0 0 16px; font-size: 14px; opacity: .7; }
  form { display: grid; gap: 8px; }
  button { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; font: inherit; font-size: 14px; cursor: pointer;
    border: 1px solid color-mix(in srgb, CanvasText 15%, transparent); background: transparent; color: CanvasText; }
  button:hover { background: color-mix(in srgb, CanvasText 6%, transparent); }
  span { opacity: .6; font-size: 12px; }
</style></head>
<body><main>
  <h1>Mock identity provider</h1>
  <p>Development only. Pick a demo user to sign in.</p>
  <form method="post" action="/bff/login/callback">
    <input type="hidden" name="returnUrl" value="${escapeHtml(returnUrl)}">
    ${buttons}
  </form>
</main></body></html>`);
});

app.post('/bff/login/callback', (req, res) => {
  const user = USERS.find((u) => u.id === req.body.userId);
  if (!user) return res.status(400).send('Unknown user');
  const now = Date.now();
  const sid = randomUUID();
  sessions.set(sid, {
    userId: user.id,
    accessExpiresAt: now + ACCESS_TTL_MS,
    refreshExpiresAt: now + REFRESH_TTL_MS,
  });
  setSessionCookie(res, sid);
  res.redirect(302, sanitizeReturnUrl(req.body.returnUrl));
});

app.get('/bff/user', (req, res) => {
  const { session } = currentSession(req);
  if (!session || session.accessExpiresAt < Date.now()) return res.sendStatus(401);
  const { id, name, email, roles } = userOf(session);
  res.json({ id, name, email, roles });
});

app.post('/bff/refresh', (req, res) => {
  const { sid, session } = currentSession(req);
  const now = Date.now();
  if (!session || session.refreshExpiresAt < now) {
    if (sid) sessions.delete(sid);
    res.clearCookie(COOKIE, { path: '/' });
    return res.sendStatus(401);
  }
  // Rotate the session id on every refresh.
  sessions.delete(sid);
  const newSid = randomUUID();
  sessions.set(newSid, { ...session, accessExpiresAt: now + ACCESS_TTL_MS });
  setSessionCookie(res, newSid);
  res.sendStatus(204);
});

app.post('/bff/logout', (req, res) => {
  const { sid } = currentSession(req);
  if (sid) sessions.delete(sid);
  res.clearCookie(COOKIE, { path: '/' });
  res.sendStatus(204);
});

// ---------------------------------------------------------------- /api (auth + roles)

const api = express.Router();

api.use((req, res, next) => {
  const { session } = currentSession(req);
  if (!session || session.accessExpiresAt < Date.now()) return res.sendStatus(401);
  req.user = userOf(session);
  next();
});

const requireRoles =
  (...roles) =>
  (req, res, next) =>
    req.user.roles.some((r) => roles.includes(r))
      ? next()
      : res.status(403).json({ requiredRoles: roles });

const WRITERS = ['Admin', 'Manager'];

// Dashboard
api.get('/dashboard/summary', (_req, res) => {
  const regionCounts = REGIONS.map((region) => ({
    region,
    count: countries.filter((c) => c.region === region).length,
  }));
  res.json({
    kpis: [
      { key: 'referentialItems', value: countries.length, delta: 6.5 },
      { key: 'openOrderLines', value: orderLines.length, delta: -2.1 },
      { key: 'activeUsers', value: 123, delta: 3.4 },
      { key: 'pendingApprovals', value: 4, delta: 12 },
    ],
    activity: activitySeries(30),
    regions: regionCounts,
    recentActivity,
    recentCountries: [...countries]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
  });
});

api.get('/restricted-demo', (_req, res) => res.status(403).json({ requiredRoles: ['SuperAdmin'] }));

// Countries
function validateCountry(body, excludeId) {
  const code = String(body.code ?? '')
    .trim()
    .toUpperCase();
  const name = String(body.name ?? '').trim();
  if (!/^[A-Z]{2,3}$/.test(code)) return { status: 400, error: 'code' };
  if (!name || name.length > 60) return { status: 400, error: 'name' };
  if (!REGIONS.includes(body.region)) return { status: 400, error: 'region' };
  if (countries.some((c) => c.code === code && c.id !== excludeId))
    return { status: 409, error: 'duplicateCode' };
  return { value: { code, name, region: body.region, active: body.active !== false } };
}

api.get('/countries', (_req, res) => res.json(countries));

api.post('/countries', requireRoles(...WRITERS), (req, res) => {
  const result = validateCountry(req.body);
  if (result.error) return res.status(result.status).json({ error: result.error });
  const country = { id: randomUUID(), ...result.value, updatedAt: new Date().toISOString() };
  countries.push(country);
  res.status(201).json(country);
});

api.put('/countries/:id', requireRoles(...WRITERS), (req, res) => {
  const index = countries.findIndex((c) => c.id === req.params.id);
  if (index < 0) return res.sendStatus(404);
  const result = validateCountry(req.body, req.params.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  countries[index] = { ...countries[index], ...result.value, updatedAt: new Date().toISOString() };
  res.json(countries[index]);
});

api.delete('/countries/:id', requireRoles(...WRITERS), (req, res) => {
  const index = countries.findIndex((c) => c.id === req.params.id);
  if (index < 0) return res.sendStatus(404);
  countries.splice(index, 1);
  res.sendStatus(204);
});

// Departments (lookup) + employees
api.get('/departments', (_req, res) => res.json(departments));

function validateEmployee(body) {
  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const email = String(body.email ?? '').trim();
  if (!firstName || !lastName) return { error: 'name' };
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) return { error: 'email' };
  if (!departments.some((d) => d.id === body.departmentId)) return { error: 'departmentId' };
  if (!isIsoDate(body.hireDate)) return { error: 'hireDate must be an ISO yyyy-MM-dd date' };
  return {
    value: { firstName, lastName, email, departmentId: body.departmentId, hireDate: body.hireDate },
  };
}

api.get('/employees', requireRoles(...WRITERS), (_req, res) => res.json(employees));

api.post('/employees', requireRoles(...WRITERS), (req, res) => {
  const result = validateEmployee(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  const employee = { id: randomUUID(), ...result.value };
  employees.push(employee);
  res.status(201).json(employee);
});

api.put('/employees/:id', requireRoles(...WRITERS), (req, res) => {
  const index = employees.findIndex((e) => e.id === req.params.id);
  if (index < 0) return res.sendStatus(404);
  const result = validateEmployee(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  employees[index] = { ...employees[index], ...result.value };
  res.json(employees[index]);
});

api.delete('/employees/:id', requireRoles(...WRITERS), (req, res) => {
  const index = employees.findIndex((e) => e.id === req.params.id);
  if (index < 0) return res.sendStatus(404);
  employees.splice(index, 1);
  res.sendStatus(204);
});

// Onboarding wizard
api.post('/onboarding', requireRoles(...WRITERS), (req, res) => {
  const { personal, job, access } = req.body ?? {};
  if (!personal?.firstName || !personal?.lastName)
    return res.status(400).json({ error: 'personal' });
  if (!isIsoDate(personal.birthDate) || !isIsoDate(job?.startDate)) {
    return res.status(400).json({ error: 'dates must be ISO yyyy-MM-dd' });
  }
  if (!departments.some((d) => d.id === job.departmentId))
    return res.status(400).json({ error: 'departmentId' });
  if (!Array.isArray(access?.roles) || access.roles.length === 0)
    return res.status(400).json({ error: 'roles' });
  res.status(201).json({ id: randomUUID() });
});

// Products + order lines
api.get('/products', requireRoles('Admin'), (_req, res) => res.json(products));

api.get('/order-lines', requireRoles('Admin'), (_req, res) => res.json(orderLines));

api.put('/order-lines', requireRoles('Admin'), (req, res) => {
  const lines = req.body;
  if (!Array.isArray(lines)) return res.status(400).json({ error: 'array expected' });
  const valid = lines.every(
    (l) =>
      typeof l.id === 'string' &&
      products.some((p) => p.id === l.productId) &&
      Number.isInteger(l.quantity) &&
      l.quantity >= 1 &&
      typeof l.unitPrice === 'number' &&
      l.unitPrice >= 0,
  );
  if (!valid) return res.status(400).json({ error: 'invalid lines' });
  orderLines.splice(
    0,
    orderLines.length,
    ...lines.map(({ id, productId, quantity, unitPrice }) => ({
      id,
      productId,
      quantity,
      unitPrice,
    })),
  );
  res.json(orderLines);
});

// Admin
api.get('/admin/users', requireRoles('Admin'), (_req, res) => res.json(USERS));

app.use('/api', api);

// Express 5 hands listen errors to this callback; without the check, a busy port would still log
// "mock BFF on …" and then exit silently, leaving another (stale) BFF answering on that port.
app.listen(PORT, (error) => {
  if (error) {
    console.error(
      error.code === 'EADDRINUSE'
        ? `mock BFF: port ${PORT} is already in use (another BFF still running?). Stop it or set PORT.`
        : `mock BFF: could not start: ${error.message}`,
    );
    process.exit(1);
  }
  console.log(
    `mock BFF on http://localhost:${PORT} (access ${ACCESS_TTL_MS} ms, refresh ${REFRESH_TTL_MS} ms, latency ${LATENCY_MS} ms)`,
  );
});
