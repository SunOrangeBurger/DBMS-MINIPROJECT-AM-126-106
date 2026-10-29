export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone?: string | null;
  is_active: number;
  created_at?: string;
}

export interface Customer {
  customer_id: number;
  user_id: number;
  address?: string | null;
  city?: string | null;
  loyalty_points: number;
  user?: User;
}

export interface Mechanic {
  mechanic_id: number;
  user_id: number;
  specialization?: string | null;
  experience_yrs: number;
  hourly_rate: number;
  is_available: number;
  user?: User;
}

export interface Vehicle {
  vehicle_id: number;
  customer_id: number;
  registration_no: string;
  make: string;
  model: string;
  year: number;
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng';
  odometer_km: number;
  created_at?: string;
  customer?: Customer;
}

export interface ServiceType {
  service_type_id: number;
  name: string;
  description?: string | null;
  base_price: number;
  est_duration_min: number;
}

export interface SparePart {
  part_id: number;
  part_name: string;
  part_code: string;
  unit_price: number;
  stock_qty: number;
  reorder_level: number;
}

export interface ServiceAppointment {
  appointment_id: number;
  vehicle_id: number;
  service_type_id: number;
  scheduled_date: string;
  completed_date?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  complaint_notes?: string | null;
  diagnosis_notes?: string | null;
  created_at?: string;
  
  // Joined fields for display
  vehicle?: Vehicle;
  service_type?: ServiceType;
  mechanics?: { mechanic: Mechanic; role_in_job: string }[];
  parts?: { part: SparePart; quantity_used: number; price_at_use: number }[];
  invoice?: Invoice | null;
}

export interface AppointmentMechanic {
  appointment_id: number;
  mechanic_id: number;
  role_in_job: string;
  assigned_at?: string;
}

export interface AppointmentPart {
  appointment_id: number;
  part_id: number;
  quantity_used: number;
  price_at_use: number;
}

export interface Invoice {
  invoice_id: number;
  appointment_id: number;
  labor_cost: number;
  parts_cost: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  issued_at?: string;
}

// Views
export interface ServiceHistoryView {
  appointment_id: number;
  registration_no: string;
  make: string;
  model: string;
  customer_id: number;
  customer_name: string;
  service_name: string;
  scheduled_date: string;
  completed_date?: string | null;
  status: string;
  complaint_notes?: string | null;
  diagnosis_notes?: string | null;
  mechanics_assigned?: string | null;
  total_amount?: number | null;
  payment_status?: string | null;
}

export interface MechanicWorkloadView {
  mechanic_id: number;
  mechanic_name: string;
  specialization?: string | null;
  total_jobs: number;
  completed_jobs: number;
  active_jobs: number;
}

export interface LowStockPartView {
  part_id: number;
  part_name: string;
  part_code: string;
  stock_qty: number;
  reorder_level: number;
}

export interface RevenueByServiceView {
  service_name: string;
  times_performed: number;
  total_revenue: number;
  avg_bill_amount: number;
}
