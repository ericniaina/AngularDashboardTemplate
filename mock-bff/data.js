// In-memory seed data. Everything resets when the server restarts.

export const USERS = [
  { id: 'u-admin', name: 'Alice Admin', email: 'alice.admin@example.com', roles: ['Admin'] },
  { id: 'u-manager', name: 'Marc Manager', email: 'marc.manager@example.com', roles: ['Manager'] },
  { id: 'u-viewer', name: 'Vera Viewer', email: 'vera.viewer@example.com', roles: ['Viewer'] },
];

export const REGIONS = ['africa', 'americas', 'asia', 'europe', 'oceania'];

const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();

export const countries = [
  { code: 'FR', name: 'France', region: 'europe', active: true },
  { code: 'DE', name: 'Germany', region: 'europe', active: true },
  { code: 'ES', name: 'Spain', region: 'europe', active: true },
  { code: 'IT', name: 'Italy', region: 'europe', active: false },
  { code: 'MG', name: 'Madagascar', region: 'africa', active: true },
  { code: 'MA', name: 'Morocco', region: 'africa', active: true },
  { code: 'SN', name: 'Senegal', region: 'africa', active: true },
  { code: 'US', name: 'United States', region: 'americas', active: true },
  { code: 'CA', name: 'Canada', region: 'americas', active: true },
  { code: 'BR', name: 'Brazil', region: 'americas', active: false },
  { code: 'JP', name: 'Japan', region: 'asia', active: true },
  { code: 'IN', name: 'India', region: 'asia', active: true },
  { code: 'VN', name: 'Vietnam', region: 'asia', active: true },
  { code: 'AU', name: 'Australia', region: 'oceania', active: true },
  { code: 'NZ', name: 'New Zealand', region: 'oceania', active: true },
].map((c, i) => ({ id: `c-${i + 1}`, ...c, updatedAt: daysAgo(30 - i * 2) }));

export const departments = [
  { id: 'd-eng', name: 'Engineering' },
  { id: 'd-fin', name: 'Finance' },
  { id: 'd-hr', name: 'Human Resources' },
  { id: 'd-ops', name: 'Operations' },
  { id: 'd-sales', name: 'Sales' },
];

export const employees = [
  ['Jeanne', 'Martin', 'd-eng', '2021-03-15'],
  ['Hugo', 'Bernard', 'd-eng', '2019-09-02'],
  ['Nadia', 'Rakoto', 'd-fin', '2022-01-10'],
  ['Omar', 'Diallo', 'd-ops', '2020-06-22'],
  ['Clara', 'Schmidt', 'd-sales', '2023-04-03'],
  ['Kenji', 'Sato', 'd-eng', '2018-11-19'],
  ['Lucia', 'Garcia', 'd-hr', '2024-02-12'],
  ['Tom', 'Wilson', 'd-sales', '2017-07-31'],
].map(([firstName, lastName, departmentId, hireDate], i) => ({
  id: `e-${i + 1}`,
  firstName,
  lastName,
  email: `${firstName}.${lastName}@example.com`.toLowerCase(),
  departmentId,
  hireDate,
}));

export const products = [
  { id: 'p-1', name: 'Laptop 14"', listPrice: 1199 },
  { id: 'p-2', name: 'Monitor 27"', listPrice: 329.9 },
  { id: 'p-3', name: 'Docking station', listPrice: 189 },
  { id: 'p-4', name: 'Keyboard', listPrice: 79.5 },
  { id: 'p-5', name: 'Mouse', listPrice: 39 },
  { id: 'p-6', name: 'Headset', listPrice: 129 },
];

export const orderLines = [
  { id: 'l-1', productId: 'p-1', quantity: 2, unitPrice: 1199 },
  { id: 'l-2', productId: 'p-2', quantity: 4, unitPrice: 309 },
  { id: 'l-3', productId: 'p-5', quantity: 10, unitPrice: 35 },
];

/** Deterministic pseudo-random series so the dashboard looks the same on every restart. */
export function activitySeries(days = 30) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date: iso,
      signIns: Math.round(55 + 25 * Math.sin(i / 3) + (i % 5) * 3),
      changes: Math.round(20 + 12 * Math.cos(i / 4) + (i % 3) * 4),
    };
  });
}

export const recentActivity = [
  {
    type: 'create',
    entity: 'country',
    label: 'New Zealand',
    user: 'Alice Admin',
    at: daysAgo(0.05),
  },
  {
    type: 'update',
    entity: 'employee',
    label: 'Jeanne Martin',
    user: 'Marc Manager',
    at: daysAgo(0.3),
  },
  { type: 'delete', entity: 'country', label: 'Atlantis', user: 'Alice Admin', at: daysAgo(1.2) },
  { type: 'save', entity: 'orderLines', label: '3', user: 'Alice Admin', at: daysAgo(2.5) },
  {
    type: 'create',
    entity: 'employee',
    label: 'Lucia Garcia',
    user: 'Marc Manager',
    at: daysAgo(4),
  },
];
