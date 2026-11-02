// End-to-end smoke test for the running app. It signs in as each role and checks the
// database rules (triggers, stored procedures, constraints) through the real API.
//
//   1. start MySQL, then `npm run dev` in another terminal
//   2. npm run test:api
//
// It creates a few test rows (a test customer, vehicles, appointments). Re-run
// sql/00_install_all.sql + `npm run seed` to reset the database afterwards.
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.DEMO_PASSWORD || 'Admin123';

class Client {
  constructor() { this.cookie = ''; }
  async call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const pair = c.split(';')[0];
      if (pair.endsWith('=')) this.cookie = '';
      else this.cookie = pair;
    }
    let data = {};
    try { data = await res.json(); } catch { /* no body */ }
    return { status: res.status, data };
  }
  get(p) { return this.call('GET', p); }
  post(p, b) { return this.call('POST', p, b ?? {}); }
  patch(p, b) { return this.call('PATCH', p, b); }
  del(p) { return this.call('DELETE', p); }
  async login(email, password = PASSWORD) { return this.post('/api/auth/login', { email, password }); }
}

const results = [];
async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || '' });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }
function expectStatus(res, status, what) { expect(res.status === status, `${what}: expected ${status}, got ${res.status} (${res.data.error || JSON.stringify(res.data).slice(0, 80)})`); }

const stamp = Date.now();
const farDay = (days, hhmm) => { const d = new Date(Date.now() + days * 86400000); return `${d.toISOString().slice(0, 10)}T${hhmm}`; };

const anon = new Client(), admin = new Client(), staff = new Client(), cust = new Client();
const state = {};

await test('Database and procedures are reachable (/api/status)', async () => {
  const r = await anon.get('/api/status');
  expectStatus(r, 200, 'status');
  expect(r.data.db?.ok, `database not ready: ${r.data.db?.message}`);
  return `semantic search service: ${r.data.vector?.up ? 'running' : 'not running (optional)'}`;
});

await test('AUTH: wrong password is rejected', async () => {
  expectStatus(await anon.login('arjun@example.com', 'definitely-wrong-1'), 401, 'login');
});
await test('AUTH: API without a session is rejected (401)', async () => {
  expectStatus(await new Client().get('/api/admin/dashboard'), 401, 'dashboard');
});
await test('AUTH: demo accounts can sign in (admin, mechanic, customer)', async () => {
  expectStatus(await admin.login('admin@autocare.com'), 200, 'admin login');
  expectStatus(await staff.login('anitha.staff@autocare.com'), 200, 'staff login');
  expectStatus(await cust.login('arjun@example.com'), 200, 'customer login');
});
await test('ROLES: customer cannot open admin API (403)', async () => {
  expectStatus(await cust.get('/api/admin/dashboard'), 403, 'customer -> admin');
  expectStatus(await cust.get('/api/staff/jobs'), 403, 'customer -> staff');
});
await test('ROLES: mechanic cannot open admin or customer API (403)', async () => {
  expectStatus(await staff.get('/api/admin/users'), 403, 'staff -> admin');
  expectStatus(await staff.get('/api/customer/vehicles'), 403, 'staff -> customer');
});

const email = `test${stamp}@example.com`;
await test('AUTH: registration (stored procedure) + no master password', async () => {
  const c = new Client();
  expectStatus(await c.post('/api/auth/register', { full_name: 'Test Customer', email, password: 'Secret9999', phone: '9811122233', city: 'Mangaluru' }), 200, 'register');
  expectStatus(await c.post('/api/auth/register', { full_name: 'Dup', email, password: 'Secret9999', phone: '9811122233' }), 409, 'duplicate email');
  expectStatus(await new Client().login(email, PASSWORD), 401, 'demo password on a different account');
  expectStatus(await new Client().login(email, 'Secret9999'), 200, 'real password');
  state.cust = c;
});

await test('VALIDATION: weak password and bad email are rejected (400)', async () => {
  expectStatus(await anon.post('/api/auth/register', { full_name: 'X Y', email: 'nope', password: 'Secret9999', phone: '9811122233' }), 400, 'bad email');
  expectStatus(await anon.post('/api/auth/register', { full_name: 'X Y', email: `w${stamp}@example.com`, password: 'short', phone: '9811122233' }), 400, 'weak password');
});

let vehicleId;
await test('CUSTOMER: add vehicle; duplicate plate rejected (UNIQUE -> 409)', async () => {
  const c = state.cust;
  const plate = `TS${String(stamp).slice(-6)}`;
  const r = await c.post('/api/customer/vehicles', { registration_no: plate, make: 'Tata', model: 'Tiago', year: 2021, fuel_type: 'petrol', odometer_km: 1000 });
  expectStatus(r, 200, 'add vehicle');
  vehicleId = r.data.vehicle_id;
  expectStatus(await c.post('/api/customer/vehicles', { registration_no: plate, make: 'Tata', model: 'Tiago', year: 2021, fuel_type: 'petrol', odometer_km: 1000 }), 409, 'duplicate plate');
});
await test('CHECK constraint: vehicle year 1800 rejected', async () => {
  const r = await state.cust.post('/api/customer/vehicles', { registration_no: `YR${String(stamp).slice(-6)}`, make: 'A', model: 'B', year: 1800, fuel_type: 'petrol', odometer_km: 0 });
  expect(r.status === 400 || r.status === 422, `expected 400/422, got ${r.status}`);
});
await test('TRIGGER: odometer cannot go backwards (422)', async () => {
  expectStatus(await state.cust.patch(`/api/customer/vehicles/${vehicleId}`, { odometer_km: 500 }), 422, 'odometer decrease');
  expectStatus(await state.cust.patch(`/api/customer/vehicles/${vehicleId}`, { odometer_km: 1500 }), 200, 'odometer increase');
});
await test("OWNERSHIP: a customer cannot touch another customer's vehicle (404)", async () => {
  expectStatus(await cust.patch(`/api/customer/vehicles/${vehicleId}`, { odometer_km: 9999 }), 404, "other customer's vehicle");
});

let apptA, apptB;
const slot = farDay(500, '05:00');
await test('PROCEDURE: book appointments (sp_book_appointment); past date rejected', async () => {
  const c = state.cust;
  const svc = (await c.get('/api/service-types')).data.services.find((s) => s.name === 'Oil Change');
  expect(svc, 'Oil Change service missing');
  state.svc = svc;
  const a = await c.post('/api/customer/appointments', { vehicle_id: vehicleId, service_type_id: svc.service_type_id, scheduled_date: slot, complaint_notes: 'Engine ticking noise at idle, oil change due.' });
  expectStatus(a, 200, 'book A');
  apptA = a.data.appointment_id;
  const b = await c.post('/api/customer/appointments', { vehicle_id: vehicleId, service_type_id: svc.service_type_id, scheduled_date: slot, complaint_notes: 'Second job at the very same time (for the double-booking test).' });
  expectStatus(b, 200, 'book B');
  apptB = b.data.appointment_id;
  expectStatus(await c.post('/api/customer/appointments', { vehicle_id: vehicleId, service_type_id: svc.service_type_id, scheduled_date: '2020-01-01T10:00', complaint_notes: 'in the past' }), 400, 'past date');
});

let anithaMechId;
await test('PROCEDURE + TRIGGER: assign mechanic; overlapping job is rejected (double-booking trigger)', async () => {
  const users = (await admin.get('/api/admin/users')).data.users;
  anithaMechId = users.find((u) => u.email === 'anitha.staff@autocare.com').mechanic_id;
  expectStatus(await admin.post(`/api/admin/appointments/${apptA}/assign`, { mechanic_id: anithaMechId, role_in_job: 'lead' }), 200, 'assign A');
  expectStatus(await admin.post(`/api/admin/appointments/${apptB}/assign`, { mechanic_id: anithaMechId, role_in_job: 'lead' }), 422, 'assign B at the same time');
});

await test('PROCEDURE: cancel only works while scheduled (B cancelled, second cancel -> 422)', async () => {
  expectStatus(await state.cust.post(`/api/customer/appointments/${apptB}/cancel`), 200, 'cancel B');
  expectStatus(await state.cust.post(`/api/customer/appointments/${apptB}/cancel`), 422, 'cancel B again');
});

await test('MECHANIC: sees the job; cannot open a job that is not theirs (404)', async () => {
  const jobs = (await staff.get('/api/staff/jobs')).data.jobs;
  expect(jobs.some((j) => j.appointment_id === apptA), 'assigned job missing from My jobs');
  expectStatus(await staff.get(`/api/staff/jobs/${apptB}`), 404, 'unassigned job');
});

await test('TRIGGERS: stock deducted on use, overselling rejected, stock restored on removal', async () => {
  expectStatus(await staff.post(`/api/staff/jobs/${apptA}/start`), 200, 'start job');
  const stock = async () => (await staff.get('/api/parts')).data.parts.find((p) => p.part_code === 'OIL-5W30');
  const before = (await stock()).stock_qty;
  const part = await stock();
  expectStatus(await staff.post(`/api/staff/jobs/${apptA}/parts`, { part_id: part.part_id, quantity: before + 1 }), 422, 'oversell (more than the stock)');
  expectStatus(await staff.post(`/api/staff/jobs/${apptA}/parts`, { part_id: part.part_id, quantity: 2 }), 200, 'use 2');
  expect((await stock()).stock_qty === before - 2, 'stock was not deducted by the trigger');
  expectStatus(await staff.del(`/api/staff/jobs/${apptA}/parts/${part.part_id}`), 200, 'remove part');
  expect((await stock()).stock_qty === before, 'stock was not restored by the trigger');
  expectStatus(await staff.post(`/api/staff/jobs/${apptA}/parts`, { part_id: part.part_id, quantity: 4 }), 200, 'use 4 for the invoice');
  return `stock ${before} -> ${before - 2} -> ${before} -> ${before - 4}`;
});

let invoice;
await test('PROCEDURE + TRANSACTION: complete job creates the invoice (labour + parts + 5% tax)', async () => {
  expectStatus(await staff.patch(`/api/staff/jobs/${apptA}`, { diagnosis_notes: 'Oil was low and sludgy. Replaced oil.' }), 200, 'save diagnosis');
  const r = await staff.post(`/api/staff/jobs/${apptA}/complete`);
  expectStatus(r, 200, 'complete');
  invoice = r.data.invoice;
  const expected = Math.round((state.svc.base_price + 4 * 450) * 1.05 * 100) / 100;
  expect(Math.abs(invoice.total_amount - expected) < 0.02, `total ${invoice.total_amount}, expected about ${expected}`);
  expectStatus(await staff.post(`/api/staff/jobs/${apptA}/complete`), 422, 'complete twice');
  return `invoice total ${invoice.total_amount}`;
});

await test('TRIGGER: paying the invoice awards loyalty points; cannot pay twice', async () => {
  const before = (await state.cust.get('/api/customer/summary')).data.summary.loyalty_points;
  const inv = (await state.cust.get('/api/customer/invoices')).data.invoices.find((i) => i.appointment_id === apptA);
  expect(inv, 'invoice not visible to the customer');
  expectStatus(await state.cust.post(`/api/customer/invoices/${inv.invoice_id}/pay`), 200, 'pay');
  const after = (await state.cust.get('/api/customer/summary')).data.summary.loyalty_points;
  expect(after === before + Math.floor(inv.total_amount / 100), `points ${before} -> ${after}`);
  expectStatus(await state.cust.post(`/api/customer/invoices/${inv.invoice_id}/pay`), 422, 'pay twice');
  return `loyalty points ${before} -> ${after}`;
});

await test('ADMIN: dashboard (views + functions) and all 12 SQL reports run', async () => {
  expectStatus(await admin.get('/api/admin/dashboard'), 200, 'dashboard');
  const list = (await admin.get('/api/admin/reports')).data.reports;
  for (const r of list) expectStatus(await admin.get(`/api/admin/reports?name=${r.name}`), 200, `report ${r.name}`);
  return `${list.length} reports`;
});
await test('ADMIN: restock (transaction + audit row); deleting a used part is blocked (FK RESTRICT -> 409)', async () => {
  const parts = (await admin.get('/api/admin/parts')).data.parts;
  const oil = parts.find((p) => p.part_code === 'OIL-5W30');
  expectStatus(await admin.post(`/api/admin/parts/${oil.part_id}/restock`, { quantity: 5 }), 200, 'restock');
  expectStatus(await admin.del(`/api/admin/parts/${oil.part_id}`), 409, 'delete used part');
});
await test('ADMIN: create mechanic; deactivated account is locked out immediately', async () => {
  const mail = `mech${stamp}@autocare.com`;
  const r = await admin.post('/api/admin/users', { full_name: 'Temp Mechanic', email: mail, password: 'Mechanic123', phone: '9822233344', specialization: 'Tyres', experience_yrs: 2, hourly_rate: 250 });
  expectStatus(r, 200, 'create staff');
  const tmp = new Client();
  expectStatus(await tmp.login(mail, 'Mechanic123'), 200, 'new mechanic login');
  expectStatus(await tmp.get('/api/staff/jobs'), 200, 'jobs before');
  expectStatus(await admin.patch(`/api/admin/users/${r.data.user_id}`, { is_active: false }), 200, 'deactivate');
  expectStatus(await tmp.get('/api/staff/jobs'), 401, 'jobs after deactivation');
});
await test('SEARCH: keyword (MySQL FULLTEXT) and semantic (Chroma, or labelled fallback)', async () => {
  const ft = await admin.get('/api/search?q=brake&mode=fulltext');
  expectStatus(ft, 200, 'fulltext');
  expect(ft.data.results.length > 0, 'no full-text hits for "brake"');
  const sem = await staff.get(`/api/search?q=${encodeURIComponent('weird noise when braking')}&mode=semantic`);
  expectStatus(sem, 200, 'semantic');
  return sem.data.mode === 'semantic' ? `semantic OK (model ${sem.data.model}), ${sem.data.results.length} hits` : 'vector service not running -> fell back to full-text (start it for the semantic demo)';
});
await test('SESSION: sign out ends the session', async () => {
  const c = new Client();
  await c.login('arjun@example.com');
  expectStatus(await c.get('/api/customer/summary'), 200, 'before logout');
  await c.post('/api/auth/logout');
  expectStatus(await c.get('/api/customer/summary'), 401, 'after logout');
});

const pad = (s, n) => String(s).padEnd(n);
console.log('\nAutoCare API smoke test against ' + BASE + '\n');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${pad(r.name, 100)}${r.detail ? '  [' + r.detail + ']' : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}.`);
process.exit(failed ? 1 : 0);
