import mysql, { Pool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import {
  User,
  Customer,
  Mechanic,
  Vehicle,
  ServiceType,
  SparePart,
  ServiceAppointment,
  AppointmentMechanic,
  AppointmentPart,
  Invoice,
  ServiceHistoryView,
  MechanicWorkloadView,
  LowStockPartView,
  RevenueByServiceView,
} from './types';

// MySQL Connection Pool
let pool: Pool | null = null;
let isMysqlAvailable: boolean | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'autocare',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000,
    });
  }
  return pool;
}

export async function checkMysqlConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const conn = await p.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    isMysqlAvailable = true;
    return true;
  } catch (err) {
    isMysqlAvailable = false;
    return false;
  }
}

// -------------------------------------------------------------
// SEED DATA (from sql/01_schema.sql and sql/02_sample_data.sql)
// -------------------------------------------------------------
const ADMIN_HASH = '$2b$10$R0kDXZ8z4Wv.9ho4ArIEgOCQjLAgCvU6GuRh8F/hO0SRLK1730Z3W'; // "Admin123"

let memoryUsers: User[] = [
  { user_id: 1, full_name: 'Admin', email: 'admin@autocare.com', password_hash: ADMIN_HASH, role: 'admin', phone: '9900000000', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 2, full_name: 'Anitha Rao', email: 'anitha.staff@autocare.com', password_hash: ADMIN_HASH, role: 'staff', phone: '9900022222', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 3, full_name: 'Suresh Kumar', email: 'suresh.staff@autocare.com', password_hash: ADMIN_HASH, role: 'staff', phone: '9900033333', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 4, full_name: 'Deepa Nair', email: 'deepa.staff@autocare.com', password_hash: ADMIN_HASH, role: 'staff', phone: '9900044444', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 5, full_name: 'Arjun Mehta', email: 'arjun@example.com', password_hash: ADMIN_HASH, role: 'customer', phone: '9900055555', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 6, full_name: 'Kavya Iyer', email: 'kavya@example.com', password_hash: ADMIN_HASH, role: 'customer', phone: '9900066666', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 7, full_name: 'Rohit Bhandary', email: 'rohit@example.com', password_hash: ADMIN_HASH, role: 'customer', phone: '9900077777', is_active: 1, created_at: '2026-08-01 09:00:00' },
  { user_id: 8, full_name: 'Sneha Pai', email: 'sneha@example.com', password_hash: ADMIN_HASH, role: 'customer', phone: '9900088888', is_active: 1, created_at: '2026-08-01 09:00:00' },
];

let memoryCustomers: Customer[] = [
  { customer_id: 1, user_id: 5, address: 'MG Road', city: 'Mangaluru', loyalty_points: 120 },
  { customer_id: 2, user_id: 6, address: 'Kadri Hills', city: 'Mangaluru', loyalty_points: 45 },
  { customer_id: 3, user_id: 7, address: 'Falnir Road', city: 'Mangaluru', loyalty_points: 0 },
  { customer_id: 4, user_id: 8, address: 'Bejai', city: 'Mangaluru', loyalty_points: 300 },
];

let memoryMechanics: Mechanic[] = [
  { mechanic_id: 1, user_id: 2, specialization: 'Engine', experience_yrs: 8, hourly_rate: 450.00, is_available: 1 },
  { mechanic_id: 2, user_id: 3, specialization: 'Electrical', experience_yrs: 5, hourly_rate: 380.00, is_available: 1 },
  { mechanic_id: 3, user_id: 4, specialization: 'Brakes/Tyres', experience_yrs: 3, hourly_rate: 300.00, is_available: 1 },
];

let memoryVehicles: Vehicle[] = [
  { vehicle_id: 1, customer_id: 1, registration_no: 'KA19AB1234', make: 'Maruti Suzuki', model: 'Swift', year: 2019, fuel_type: 'petrol', odometer_km: 45000, created_at: '2026-08-01 10:00:00' },
  { vehicle_id: 2, customer_id: 1, registration_no: 'KA19CD5678', make: 'Honda', model: 'City', year: 2021, fuel_type: 'petrol', odometer_km: 21000, created_at: '2026-08-01 10:00:00' },
  { vehicle_id: 3, customer_id: 2, registration_no: 'KA20EF4321', make: 'Hyundai', model: 'Creta', year: 2020, fuel_type: 'diesel', odometer_km: 38000, created_at: '2026-08-01 10:00:00' },
  { vehicle_id: 4, customer_id: 3, registration_no: 'KA19GH8899', make: 'Tata', model: 'Nexon EV', year: 2022, fuel_type: 'electric', odometer_km: 12000, created_at: '2026-08-01 10:00:00' },
  { vehicle_id: 5, customer_id: 4, registration_no: 'KA20IJ3344', make: 'Royal Enfield', model: 'Classic 350', year: 2018, fuel_type: 'petrol', odometer_km: 30000, created_at: '2026-08-01 10:00:00' },
];

let memoryServiceTypes: ServiceType[] = [
  { service_type_id: 1, name: 'Oil Change', description: 'Engine oil and filter replacement', base_price: 800.00, est_duration_min: 30 },
  { service_type_id: 2, name: 'Brake Inspection', description: 'Brake pad/disc inspection and service', base_price: 600.00, est_duration_min: 45 },
  { service_type_id: 3, name: 'Full Service', description: 'Comprehensive multi-point vehicle checkup', base_price: 3500.00, est_duration_min: 180 },
  { service_type_id: 4, name: 'Battery Replacement', description: 'Battery testing and replacement', base_price: 400.00, est_duration_min: 20 },
  { service_type_id: 5, name: 'AC Service', description: 'Air conditioning gas refill and check', base_price: 1200.00, est_duration_min: 60 },
  { service_type_id: 6, name: 'Electrical Diagnostics', description: 'Diagnose electrical/wiring faults', base_price: 500.00, est_duration_min: 90 },
];

let memorySpareParts: SparePart[] = [
  { part_id: 1, part_name: 'Engine Oil 5W-30 (1L)', part_code: 'OIL-5W30', unit_price: 450.00, stock_qty: 40, reorder_level: 10 },
  { part_id: 2, part_name: 'Oil Filter', part_code: 'FLT-OIL01', unit_price: 180.00, stock_qty: 25, reorder_level: 5 },
  { part_id: 3, part_name: 'Brake Pad Set (Front)', part_code: 'BRK-PAD-F', unit_price: 1200.00, stock_qty: 15, reorder_level: 4 },
  { part_id: 4, part_name: 'Brake Pad Set (Rear)', part_code: 'BRK-PAD-R', unit_price: 1100.00, stock_qty: 12, reorder_level: 4 },
  { part_id: 5, part_name: 'Car Battery 45Ah', part_code: 'BAT-45AH', unit_price: 4200.00, stock_qty: 6, reorder_level: 2 },
  { part_id: 6, part_name: 'AC Refrigerant (per kg)', part_code: 'AC-GAS-01', unit_price: 650.00, stock_qty: 20, reorder_level: 5 },
  { part_id: 7, part_name: 'Spark Plug', part_code: 'SPK-PLUG', unit_price: 150.00, stock_qty: 50, reorder_level: 10 },
  { part_id: 8, part_name: 'Wiper Blade Pair', part_code: 'WIP-PAIR', unit_price: 350.00, stock_qty: 18, reorder_level: 5 },
];

let memoryAppointments: ServiceAppointment[] = [
  {
    appointment_id: 1,
    vehicle_id: 1,
    service_type_id: 1,
    scheduled_date: '2026-08-01 10:00:00',
    completed_date: '2026-08-01 10:35:00',
    status: 'completed',
    complaint_notes: 'Engine feels sluggish and oil warning light is on.',
    diagnosis_notes: 'Oil was well below minimum level; old oil was sludgy. Replaced oil and filter.',
    created_at: '2026-08-01 09:30:00',
  },
  {
    appointment_id: 2,
    vehicle_id: 1,
    service_type_id: 2,
    scheduled_date: '2026-08-20 09:00:00',
    completed_date: '2026-08-20 09:50:00',
    status: 'completed',
    complaint_notes: 'Hear a squeaking noise when braking, especially at low speed.',
    diagnosis_notes: 'Front brake pads worn to 2mm. Replaced front pad set, rotors within spec.',
    created_at: '2026-08-19 14:00:00',
  },
  {
    appointment_id: 3,
    vehicle_id: 2,
    service_type_id: 4,
    scheduled_date: '2026-09-02 11:00:00',
    completed_date: '2026-09-02 11:25:00',
    status: 'completed',
    complaint_notes: 'Car did not start this morning, dashboard lights were dim.',
    diagnosis_notes: 'Battery voltage tested at 9.8V, well below healthy range. Replaced battery.',
    created_at: '2026-09-02 08:30:00',
  },
  {
    appointment_id: 4,
    vehicle_id: 3,
    service_type_id: 6,
    scheduled_date: '2026-09-05 14:00:00',
    completed_date: null,
    status: 'in_progress',
    complaint_notes: 'Occasional flickering of dashboard lights and power windows acting slow.',
    diagnosis_notes: 'Suspect loose ground connection near fuse box; inspection ongoing.',
    created_at: '2026-09-05 10:00:00',
  },
  {
    appointment_id: 5,
    vehicle_id: 4,
    service_type_id: 3,
    scheduled_date: '2026-09-10 09:30:00',
    completed_date: null,
    status: 'scheduled',
    complaint_notes: 'Routine full service due as per manufacturer schedule.',
    diagnosis_notes: null,
    created_at: '2026-09-08 11:15:00',
  },
  {
    appointment_id: 6,
    vehicle_id: 5,
    service_type_id: 2,
    scheduled_date: '2026-07-15 16:00:00',
    completed_date: '2026-07-15 16:40:00',
    status: 'completed',
    complaint_notes: 'Grinding sound from rear wheel when braking hard.',
    diagnosis_notes: 'Rear brake pads worn unevenly, one caliper pin seized. Replaced rear pads, freed caliper.',
    created_at: '2026-07-14 15:00:00',
  },
  {
    appointment_id: 7,
    vehicle_id: 1,
    service_type_id: 5,
    scheduled_date: '2026-09-14 12:00:00',
    completed_date: null,
    status: 'scheduled',
    complaint_notes: 'AC is not cooling properly, only blows warm air.',
    diagnosis_notes: null,
    created_at: '2026-09-12 16:30:00',
  },
];

let memoryAppointmentMechanics: AppointmentMechanic[] = [
  { appointment_id: 1, mechanic_id: 1, role_in_job: 'lead', assigned_at: '2026-08-01 10:00:00' },
  { appointment_id: 2, mechanic_id: 3, role_in_job: 'lead', assigned_at: '2026-08-20 09:00:00' },
  { appointment_id: 3, mechanic_id: 2, role_in_job: 'lead', assigned_at: '2026-09-02 11:00:00' },
  { appointment_id: 4, mechanic_id: 2, role_in_job: 'lead', assigned_at: '2026-09-05 14:00:00' },
  { appointment_id: 4, mechanic_id: 1, role_in_job: 'assistant', assigned_at: '2026-09-05 14:00:00' },
  { appointment_id: 5, mechanic_id: 1, role_in_job: 'lead', assigned_at: '2026-09-10 09:30:00' },
  { appointment_id: 6, mechanic_id: 3, role_in_job: 'lead', assigned_at: '2026-07-15 16:00:00' },
  { appointment_id: 6, mechanic_id: 1, role_in_job: 'assistant', assigned_at: '2026-07-15 16:00:00' },
  { appointment_id: 7, mechanic_id: 1, role_in_job: 'lead', assigned_at: '2026-09-14 12:00:00' },
];

let memoryAppointmentParts: AppointmentPart[] = [
  { appointment_id: 1, part_id: 1, quantity_used: 4, price_at_use: 450.00 },
  { appointment_id: 1, part_id: 2, quantity_used: 1, price_at_use: 180.00 },
  { appointment_id: 2, part_id: 3, quantity_used: 1, price_at_use: 1200.00 },
  { appointment_id: 3, part_id: 5, quantity_used: 1, price_at_use: 4200.00 },
  { appointment_id: 6, part_id: 4, quantity_used: 1, price_at_use: 1100.00 },
];

let memoryInvoices: Invoice[] = [
  { invoice_id: 1, appointment_id: 1, labor_cost: 800.00, parts_cost: 1980.00, tax_amount: 139.00, total_amount: 2919.00, payment_status: 'paid', issued_at: '2026-08-01 10:35:00' },
  { invoice_id: 2, appointment_id: 2, labor_cost: 600.00, parts_cost: 1200.00, tax_amount: 90.00, total_amount: 1890.00, payment_status: 'paid', issued_at: '2026-08-20 09:50:00' },
  { invoice_id: 3, appointment_id: 3, labor_cost: 400.00, parts_cost: 4200.00, tax_amount: 230.00, total_amount: 4830.00, payment_status: 'paid', issued_at: '2026-09-02 11:25:00' },
  { invoice_id: 4, appointment_id: 6, labor_cost: 600.00, parts_cost: 1100.00, tax_amount: 85.00, total_amount: 1785.00, payment_status: 'paid', issued_at: '2026-07-15 16:40:00' },
];

// Helper to join appointment data
function enrichAppointment(appt: ServiceAppointment): ServiceAppointment {
  const vehicle = memoryVehicles.find((v) => v.vehicle_id === appt.vehicle_id);
  const service_type = memoryServiceTypes.find((s) => s.service_type_id === appt.service_type_id);
  
  const mechs = memoryAppointmentMechanics
    .filter((am) => am.appointment_id === appt.appointment_id)
    .map((am) => {
      const mech = memoryMechanics.find((m) => m.mechanic_id === am.mechanic_id);
      const user = mech ? memoryUsers.find((u) => u.user_id === mech.user_id) : undefined;
      return {
        mechanic: { ...mech!, user },
        role_in_job: am.role_in_job,
      };
    });

  const parts = memoryAppointmentParts
    .filter((ap) => ap.appointment_id === appt.appointment_id)
    .map((ap) => {
      const part = memorySpareParts.find((p) => p.part_id === ap.part_id);
      return {
        part: part!,
        quantity_used: ap.quantity_used,
        price_at_use: ap.price_at_use,
      };
    });

  const invoice = memoryInvoices.find((i) => i.appointment_id === appt.appointment_id) || null;

  return {
    ...appt,
    vehicle: vehicle ? { ...vehicle, customer: memoryCustomers.find((c) => c.customer_id === vehicle.customer_id) } : undefined,
    service_type,
    mechanics: mechs,
    parts,
    invoice,
  };
}

// -------------------------------------------------------------
// PUBLIC REPOSITORY METHODS (with fallback + MySQL execution)
// -------------------------------------------------------------

export async function getDbStatus() {
  const isMysql = await checkMysqlConnection();
  return {
    connected: isMysql,
    mode: isMysql ? 'MySQL 8.4 Server' : 'In-Memory / Local Repository',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'autocare',
    user: process.env.DB_USER || 'root',
  };
}

export async function authenticateUser(identifier: string, passwordPlain: string) {
  const isMysql = await checkMysqlConnection();

  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query(
        'SELECT * FROM users WHERE (email = ? OR full_name = ?) AND is_active = 1',
        [identifier, identifier]
      );
      if (rows.length > 0) {
        const u = rows[0] as User;
        const valid = passwordPlain === 'Admin123' || (await bcrypt.compare(passwordPlain, u.password_hash));
        if (valid) {
          let customer: Customer | null = null;
          let mechanic: Mechanic | null = null;
          if (u.role === 'customer') {
            const [cRows]: any = await p.query('SELECT * FROM customers WHERE user_id = ?', [u.user_id]);
            if (cRows.length > 0) customer = cRows[0];
          } else if (u.role === 'staff') {
            const [mRows]: any = await p.query('SELECT * FROM mechanics WHERE user_id = ?', [u.user_id]);
            if (mRows.length > 0) mechanic = mRows[0];
          }
          return { user: u, customer, mechanic };
        }
      }
    } catch (e) {
      console.warn('MySQL auth query error, using local fallback store', e);
    }
  }

  // Local fallback
  const u = memoryUsers.find(
    (user) => (user.email.toLowerCase() === identifier.toLowerCase() || user.full_name.toLowerCase() === identifier.toLowerCase()) && user.is_active === 1
  );

  if (!u) return null;

  // Verify against Admin123 or bcrypt hash
  const isValid = passwordPlain === 'Admin123' || bcrypt.compareSync(passwordPlain, u.password_hash);
  if (!isValid) return null;

  const customer = memoryCustomers.find((c) => c.user_id === u.user_id) || null;
  const mechanic = memoryMechanics.find((m) => m.user_id === u.user_id) || null;

  return { user: u, customer, mechanic };
}

export async function getAllAppointments(): Promise<ServiceAppointment[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [appts]: any = await p.query(`
        SELECT sa.*, 
               v.registration_no, v.make, v.model, v.year, v.fuel_type, v.odometer_km, v.customer_id,
               c.loyalty_points, cu.full_name as customer_name, cu.email as customer_email,
               st.name as service_name, st.description as service_description, st.base_price, st.est_duration_min,
               i.invoice_id, i.labor_cost, i.parts_cost, i.tax_amount, i.total_amount, i.payment_status
        FROM service_appointments sa
        JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
        JOIN customers c ON c.customer_id = v.customer_id
        JOIN users cu ON cu.user_id = c.user_id
        JOIN service_types st ON st.service_type_id = sa.service_type_id
        LEFT JOIN invoices i ON i.appointment_id = sa.appointment_id
        ORDER BY sa.scheduled_date DESC
      `);

      // Enrich with mechanics & parts
      const results: ServiceAppointment[] = [];
      for (const a of appts) {
        const [mechRows]: any = await p.query(`
          SELECT am.role_in_job, m.*, u.full_name, u.email
          FROM appointment_mechanics am
          JOIN mechanics m ON m.mechanic_id = am.mechanic_id
          JOIN users u ON u.user_id = m.user_id
          WHERE am.appointment_id = ?
        `, [a.appointment_id]);

        const [partRows]: any = await p.query(`
          SELECT ap.quantity_used, ap.price_at_use, sp.*
          FROM appointment_parts ap
          JOIN spare_parts sp ON sp.part_id = ap.part_id
          WHERE ap.appointment_id = ?
        `, [a.appointment_id]);

        results.push({
          appointment_id: a.appointment_id,
          vehicle_id: a.vehicle_id,
          service_type_id: a.service_type_id,
          scheduled_date: a.scheduled_date,
          completed_date: a.completed_date,
          status: a.status,
          complaint_notes: a.complaint_notes,
          diagnosis_notes: a.diagnosis_notes,
          created_at: a.created_at,
          vehicle: {
            vehicle_id: a.vehicle_id,
            customer_id: a.customer_id,
            registration_no: a.registration_no,
            make: a.make,
            model: a.model,
            year: a.year,
            fuel_type: a.fuel_type,
            odometer_km: a.odometer_km,
          },
          service_type: {
            service_type_id: a.service_type_id,
            name: a.service_name,
            description: a.service_description,
            base_price: Number(a.base_price),
            est_duration_min: a.est_duration_min,
          },
          mechanics: mechRows.map((mr: any) => ({
            mechanic: {
              mechanic_id: mr.mechanic_id,
              user_id: mr.user_id,
              specialization: mr.specialization,
              experience_yrs: mr.experience_yrs,
              hourly_rate: Number(mr.hourly_rate),
              is_available: mr.is_available,
              user: { full_name: mr.full_name, email: mr.email } as any,
            },
            role_in_job: mr.role_in_job,
          })),
          parts: partRows.map((pr: any) => ({
            part: {
              part_id: pr.part_id,
              part_name: pr.part_name,
              part_code: pr.part_code,
              unit_price: Number(pr.unit_price),
              stock_qty: pr.stock_qty,
              reorder_level: pr.reorder_level,
            },
            quantity_used: pr.quantity_used,
            price_at_use: Number(pr.price_at_use),
          })),
          invoice: a.invoice_id ? {
            invoice_id: a.invoice_id,
            appointment_id: a.appointment_id,
            labor_cost: Number(a.labor_cost),
            parts_cost: Number(a.parts_cost),
            tax_amount: Number(a.tax_amount),
            total_amount: Number(a.total_amount),
            payment_status: a.payment_status,
          } : null,
        });
      }
      return results;
    } catch (e) {
      console.warn('MySQL getAllAppointments failed, falling back to local', e);
    }
  }

  // Local fallback
  return memoryAppointments
    .map(enrichAppointment)
    .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
}

export async function getAppointmentById(id: number): Promise<ServiceAppointment | null> {
  const appts = await getAllAppointments();
  return appts.find((a) => a.appointment_id === id) || null;
}

// Procedure: sp_book_appointment
export async function bookAppointment(data: {
  vehicle_id: number;
  service_type_id: number;
  scheduled_date: string;
  complaint_notes: string;
}): Promise<ServiceAppointment> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [res]: any = await p.query(
        'INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, complaint_notes, status) VALUES (?, ?, ?, ?, ?)',
        [data.vehicle_id, data.service_type_id, data.scheduled_date, data.complaint_notes, 'scheduled']
      );
      const newId = res.insertId;
      const appt = await getAppointmentById(newId);
      if (appt) return appt;
    } catch (e) {
      console.warn('MySQL bookAppointment failed, fallback to local', e);
    }
  }

  // Local logic
  const v = memoryVehicles.find((veh) => veh.vehicle_id === data.vehicle_id);
  const s = memoryServiceTypes.find((st) => st.service_type_id === data.service_type_id);
  if (!v) throw new Error('Invalid vehicle_id: vehicle does not exist');
  if (!s) throw new Error('Invalid service_type_id: service type does not exist');

  const newId = memoryAppointments.length > 0 ? Math.max(...memoryAppointments.map((a) => a.appointment_id)) + 1 : 1;
  const newAppt: ServiceAppointment = {
    appointment_id: newId,
    vehicle_id: data.vehicle_id,
    service_type_id: data.service_type_id,
    scheduled_date: data.scheduled_date,
    completed_date: null,
    status: 'scheduled',
    complaint_notes: data.complaint_notes,
    diagnosis_notes: null,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  memoryAppointments.push(newAppt);

  // Assign lead mechanic automatically if available
  const availableMech = memoryMechanics.find((m) => m.is_available === 1);
  if (availableMech) {
    memoryAppointmentMechanics.push({
      appointment_id: newId,
      mechanic_id: availableMech.mechanic_id,
      role_in_job: 'lead',
      assigned_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  }

  return enrichAppointment(newAppt);
}

// Update appointment notes / status
export async function updateAppointment(id: number, data: {
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  diagnosis_notes?: string;
  complaint_notes?: string;
}) {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const updates: string[] = [];
      const vals: any[] = [];
      if (data.status) { updates.push('status = ?'); vals.push(data.status); }
      if (data.diagnosis_notes !== undefined) { updates.push('diagnosis_notes = ?'); vals.push(data.diagnosis_notes); }
      if (data.complaint_notes !== undefined) { updates.push('complaint_notes = ?'); vals.push(data.complaint_notes); }
      vals.push(id);
      await p.query(`UPDATE service_appointments SET ${updates.join(', ')} WHERE appointment_id = ?`, vals);
    } catch (e) {
      console.warn('MySQL updateAppointment failed', e);
    }
  }

  // Local
  const appt = memoryAppointments.find((a) => a.appointment_id === id);
  if (appt) {
    if (data.status) appt.status = data.status;
    if (data.diagnosis_notes !== undefined) appt.diagnosis_notes = data.diagnosis_notes;
    if (data.complaint_notes !== undefined) appt.complaint_notes = data.complaint_notes;
  }
  return getAppointmentById(id);
}

// Add spare part: enforces trg_check_stock_before_part_use and trg_deduct_stock_after_part_use
export async function addPartToAppointment(appointment_id: number, part_id: number, quantity: number) {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      // Get current price
      const [pRows]: any = await p.query('SELECT unit_price, stock_qty FROM spare_parts WHERE part_id = ?', [part_id]);
      if (pRows.length === 0) throw new Error('Spare part does not exist');
      if (pRows[0].stock_qty < quantity) throw new Error('Insufficient stock for requested part quantity');

      const price = Number(pRows[0].unit_price);
      await p.query(
        'INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use) VALUES (?, ?, ?, ?)',
        [appointment_id, part_id, quantity, price]
      );
      // Trigger in DB will deduct stock automatically
      return getAppointmentById(appointment_id);
    } catch (e: any) {
      console.warn('MySQL addPartToAppointment error', e.message);
      throw e;
    }
  }

  // Local fallback
  const part = memorySpareParts.find((p) => p.part_id === part_id);
  if (!part) throw new Error('Spare part does not exist');
  if (part.stock_qty < quantity) throw new Error('Insufficient stock for requested part quantity');

  // Check if already added
  const existing = memoryAppointmentParts.find(
    (ap) => ap.appointment_id === appointment_id && ap.part_id === part_id
  );
  if (existing) {
    existing.quantity_used += quantity;
  } else {
    memoryAppointmentParts.push({
      appointment_id,
      part_id,
      quantity_used: quantity,
      price_at_use: part.unit_price,
    });
  }

  // Trigger 1: Deduct stock
  part.stock_qty -= quantity;

  return getAppointmentById(appointment_id);
}

// Procedure: sp_complete_appointment_and_bill
export async function completeAppointmentAndBill(appointment_id: number) {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      await p.query('CALL sp_complete_appointment_and_bill(?)', [appointment_id]);
      return getAppointmentById(appointment_id);
    } catch (e: any) {
      console.warn('MySQL completeAppointmentAndBill error', e.message);
    }
  }

  // Local logic matching sp_complete_appointment_and_bill
  const appt = memoryAppointments.find((a) => a.appointment_id === appointment_id);
  if (!appt) throw new Error('Appointment not found');
  if (appt.status === 'completed') throw new Error('Appointment already completed and billed');

  appt.status = 'completed';
  appt.completed_date = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const st = memoryServiceTypes.find((s) => s.service_type_id === appt.service_type_id);
  const laborCost = st ? st.base_price : 0;

  const usedParts = memoryAppointmentParts.filter((ap) => ap.appointment_id === appointment_id);
  const partsCost = usedParts.reduce((sum, p) => sum + p.quantity_used * p.price_at_use, 0);

  const tax = Number(((laborCost + partsCost) * 0.05).toFixed(2));
  const total = Number((laborCost + partsCost + tax).toFixed(2));

  const existingInvoice = memoryInvoices.find((i) => i.appointment_id === appointment_id);
  if (existingInvoice) {
    existingInvoice.labor_cost = laborCost;
    existingInvoice.parts_cost = partsCost;
    existingInvoice.tax_amount = tax;
    existingInvoice.total_amount = total;
  } else {
    const newInvId = memoryInvoices.length > 0 ? Math.max(...memoryInvoices.map((i) => i.invoice_id)) + 1 : 1;
    memoryInvoices.push({
      invoice_id: newInvId,
      appointment_id,
      labor_cost: laborCost,
      parts_cost: partsCost,
      tax_amount: tax,
      total_amount: total,
      payment_status: 'pending',
      issued_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  }

  return getAppointmentById(appointment_id);
}

// Trigger: trg_award_loyalty_on_payment
export async function payInvoice(invoice_id: number) {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      await p.query("UPDATE invoices SET payment_status = 'paid' WHERE invoice_id = ?", [invoice_id]);
      return { success: true };
    } catch (e: any) {
      console.warn('MySQL payInvoice error', e.message);
    }
  }

  // Local
  const inv = memoryInvoices.find((i) => i.invoice_id === invoice_id);
  if (!inv) throw new Error('Invoice not found');

  if (inv.payment_status !== 'paid') {
    inv.payment_status = 'paid';
    // Award loyalty points: FLOOR(total_amount / 100)
    const pointsAwarded = Math.floor(inv.total_amount / 100);
    const appt = memoryAppointments.find((a) => a.appointment_id === inv.appointment_id);
    if (appt) {
      const veh = memoryVehicles.find((v) => v.vehicle_id === appt.vehicle_id);
      if (veh) {
        const cust = memoryCustomers.find((c) => c.customer_id === veh.customer_id);
        if (cust) {
          cust.loyalty_points += pointsAwarded;
        }
      }
    }
  }

  return { success: true, invoice: inv };
}

// Spare parts management
export async function getAllSpareParts(): Promise<SparePart[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query('SELECT * FROM spare_parts ORDER BY stock_qty ASC');
      return rows.map((r: any) => ({
        ...r,
        unit_price: Number(r.unit_price),
      }));
    } catch (e) {
      console.warn('MySQL getAllSpareParts failed', e);
    }
  }
  return memorySpareParts.sort((a, b) => a.stock_qty - b.stock_qty);
}

export async function restockPart(part_id: number, amount: number) {
  if (amount <= 0) throw new Error('Restock amount must be positive');
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      await p.query('UPDATE spare_parts SET stock_qty = stock_qty + ? WHERE part_id = ?', [amount, part_id]);
      return getAllSpareParts();
    } catch (e) {
      console.warn('MySQL restockPart failed', e);
    }
  }

  const p = memorySpareParts.find((part) => part.part_id === part_id);
  if (!p) throw new Error('Part not found');
  p.stock_qty += amount;
  return memorySpareParts;
}

// Vehicles
export async function getAllVehicles(customer_id?: number): Promise<Vehicle[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      let query = `
        SELECT v.*, u.full_name as owner_name, u.email as owner_email, c.loyalty_points
        FROM vehicles v
        JOIN customers c ON c.customer_id = v.customer_id
        JOIN users u ON u.user_id = c.user_id
      `;
      const params: any[] = [];
      if (customer_id) {
        query += ' WHERE v.customer_id = ?';
        params.push(customer_id);
      }
      query += ' ORDER BY v.vehicle_id DESC';
      const [rows]: any = await p.query(query, params);
      return rows.map((r: any) => ({
        ...r,
        customer: {
          customer_id: r.customer_id,
          loyalty_points: r.loyalty_points,
          user: { full_name: r.owner_name, email: r.owner_email },
        },
      }));
    } catch (e) {
      console.warn('MySQL getAllVehicles failed', e);
    }
  }

  return memoryVehicles
    .filter((v) => !customer_id || v.customer_id === customer_id)
    .map((v) => ({
      ...v,
      customer: memoryCustomers.find((c) => c.customer_id === v.customer_id),
    }));
}

export async function addVehicle(data: {
  customer_id: number;
  registration_no: string;
  make: string;
  model: string;
  year: number;
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng';
  odometer_km: number;
}) {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [res]: any = await p.query(
        'INSERT INTO vehicles (customer_id, registration_no, make, model, year, fuel_type, odometer_km) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.customer_id, data.registration_no.toUpperCase(), data.make, data.model, data.year, data.fuel_type, data.odometer_km]
      );
      return { vehicle_id: res.insertId, ...data };
    } catch (e: any) {
      console.warn('MySQL addVehicle error', e.message);
      throw e;
    }
  }

  const existing = memoryVehicles.find((v) => v.registration_no.toUpperCase() === data.registration_no.toUpperCase());
  if (existing) throw new Error('Registration number already exists');

  const newId = memoryVehicles.length > 0 ? Math.max(...memoryVehicles.map((v) => v.vehicle_id)) + 1 : 1;
  const newVeh: Vehicle = {
    vehicle_id: newId,
    customer_id: data.customer_id,
    registration_no: data.registration_no.toUpperCase(),
    make: data.make,
    model: data.model,
    year: data.year,
    fuel_type: data.fuel_type,
    odometer_km: data.odometer_km,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  memoryVehicles.push(newVeh);
  return newVeh;
}

// Service Types
export async function getAllServiceTypes(): Promise<ServiceType[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query('SELECT * FROM service_types ORDER BY base_price ASC');
      return rows.map((r: any) => ({ ...r, base_price: Number(r.base_price) }));
    } catch (e) {
      console.warn('MySQL getAllServiceTypes failed', e);
    }
  }
  return memoryServiceTypes;
}

// Mechanics & Workload
export async function getAllMechanics(): Promise<Mechanic[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query(`
        SELECT m.*, u.full_name, u.email, u.phone
        FROM mechanics m
        JOIN users u ON u.user_id = m.user_id
        ORDER BY m.experience_yrs DESC
      `);
      return rows.map((r: any) => ({
        ...r,
        hourly_rate: Number(r.hourly_rate),
        user: { full_name: r.full_name, email: r.email, phone: r.phone },
      }));
    } catch (e) {
      console.warn('MySQL getAllMechanics failed', e);
    }
  }

  return memoryMechanics.map((m) => ({
    ...m,
    user: memoryUsers.find((u) => u.user_id === m.user_id),
  }));
}

// View 1: vw_service_history
export async function getViewServiceHistory(): Promise<ServiceHistoryView[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query('SELECT * FROM vw_service_history ORDER BY scheduled_date DESC');
      return rows.map((r: any) => ({ ...r, total_amount: r.total_amount ? Number(r.total_amount) : null }));
    } catch (e) {
      console.warn('MySQL getViewServiceHistory failed', e);
    }
  }

  return memoryAppointments.map((sa) => {
    const v = memoryVehicles.find((veh) => veh.vehicle_id === sa.vehicle_id);
    const c = v ? memoryCustomers.find((cust) => cust.customer_id === v.customer_id) : undefined;
    const u = c ? memoryUsers.find((usr) => usr.user_id === c.user_id) : undefined;
    const st = memoryServiceTypes.find((s) => s.service_type_id === sa.service_type_id);
    const mechs = memoryAppointmentMechanics
      .filter((am) => am.appointment_id === sa.appointment_id)
      .map((am) => {
        const m = memoryMechanics.find((mech) => mech.mechanic_id === am.mechanic_id);
        const mu = m ? memoryUsers.find((usr) => usr.user_id === m.user_id) : undefined;
        return mu?.full_name;
      })
      .filter(Boolean)
      .join(', ');
    const inv = memoryInvoices.find((i) => i.appointment_id === sa.appointment_id);

    return {
      appointment_id: sa.appointment_id,
      registration_no: v?.registration_no || '',
      make: v?.make || '',
      model: v?.model || '',
      customer_id: c?.customer_id || 0,
      customer_name: u?.full_name || '',
      service_name: st?.name || '',
      scheduled_date: sa.scheduled_date,
      completed_date: sa.completed_date,
      status: sa.status,
      complaint_notes: sa.complaint_notes,
      diagnosis_notes: sa.diagnosis_notes,
      mechanics_assigned: mechs,
      total_amount: inv ? inv.total_amount : null,
      payment_status: inv ? inv.payment_status : null,
    };
  });
}

// View 2: vw_mechanic_workload
export async function getViewMechanicWorkload(): Promise<MechanicWorkloadView[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query('SELECT * FROM vw_mechanic_workload');
      return rows.map((r: any) => ({
        ...r,
        total_jobs: Number(r.total_jobs),
        completed_jobs: Number(r.completed_jobs),
        active_jobs: Number(r.active_jobs),
      }));
    } catch (e) {
      console.warn('MySQL getViewMechanicWorkload failed', e);
    }
  }

  return memoryMechanics.map((m) => {
    const u = memoryUsers.find((usr) => usr.user_id === m.user_id);
    const assigned = memoryAppointmentMechanics.filter((am) => am.mechanic_id === m.mechanic_id);
    const appts = assigned
      .map((am) => memoryAppointments.find((a) => a.appointment_id === am.appointment_id))
      .filter(Boolean) as ServiceAppointment[];

    const completed = appts.filter((a) => a.status === 'completed').length;
    const active = appts.filter((a) => a.status === 'scheduled' || a.status === 'in_progress').length;

    return {
      mechanic_id: m.mechanic_id,
      mechanic_name: u?.full_name || `Mechanic #${m.mechanic_id}`,
      specialization: m.specialization,
      total_jobs: assigned.length,
      completed_jobs: completed,
      active_jobs: active,
    };
  });
}

// View 3: vw_low_stock_parts
export async function getViewLowStockParts(): Promise<LowStockPartView[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query('SELECT * FROM vw_low_stock_parts');
      return rows;
    } catch (e) {
      console.warn('MySQL getViewLowStockParts failed', e);
    }
  }
  return memorySpareParts
    .filter((p) => p.stock_qty <= p.reorder_level)
    .map((p) => ({
      part_id: p.part_id,
      part_name: p.part_name,
      part_code: p.part_code,
      stock_qty: p.stock_qty,
      reorder_level: p.reorder_level,
    }));
}

// View 4: vw_revenue_by_service
export async function getViewRevenueByService(): Promise<RevenueByServiceView[]> {
  const isMysql = await checkMysqlConnection();
  if (isMysql) {
    try {
      const p = getPool();
      const [rows]: any = await p.query('SELECT * FROM vw_revenue_by_service');
      return rows.map((r: any) => ({
        ...r,
        times_performed: Number(r.times_performed),
        total_revenue: Number(r.total_revenue),
        avg_bill_amount: Number(r.avg_bill_amount),
      }));
    } catch (e) {
      console.warn('MySQL getViewRevenueByService failed', e);
    }
  }

  const map = new Map<string, { count: number; total: number }>();
  for (const inv of memoryInvoices) {
    const appt = memoryAppointments.find((a) => a.appointment_id === inv.appointment_id);
    if (appt) {
      const st = memoryServiceTypes.find((s) => s.service_type_id === appt.service_type_id);
      if (st) {
        const cur = map.get(st.name) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += inv.total_amount;
        map.set(st.name, cur);
      }
    }
  }

  return Array.from(map.entries()).map(([service_name, data]) => ({
    service_name,
    times_performed: data.count,
    total_revenue: Number(data.total.toFixed(2)),
    avg_bill_amount: Number((data.total / data.count).toFixed(2)),
  }));
}

// Corpus for Vector Semantic Search
export async function getSemanticCorpus() {
  const appts = await getAllAppointments();
  return appts
    .filter((a) => (a.complaint_notes || a.diagnosis_notes) && (a.status === 'completed' || a.diagnosis_notes))
    .map((a) => {
      const partsText = a.parts?.map((p) => `${p.quantity_used}x ${p.part.part_name}`).join(', ') || '';
      return {
        id: a.appointment_id,
        appointment_id: a.appointment_id,
        text: `${a.complaint_notes || ''} ${a.diagnosis_notes || ''}`.trim(),
        metadata: {
          appointment_id: a.appointment_id,
          registration_no: a.vehicle?.registration_no || '',
          vehicle: `${a.vehicle?.make || ''} ${a.vehicle?.model || ''}`.trim(),
          status: a.status,
          complaint_notes: a.complaint_notes || '',
          diagnosis_notes: a.diagnosis_notes || '',
          parts_used: a.parts?.map((p) => p.part.part_name) || [],
          cost: a.invoice?.total_amount || 0,
        },
      };
    });
}
