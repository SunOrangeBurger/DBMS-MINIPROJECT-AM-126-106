// Client-safe shared types (no server imports here).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export type Role = 'admin' | 'staff' | 'customer';

export interface AppointmentDetailData {
  appointment: Row;
  parts: Row[];
  mechanics: Row[];
  log: Row[];
}
