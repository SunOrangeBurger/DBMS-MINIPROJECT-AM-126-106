import { HttpError } from './errors';
import { str, int, oneOf } from './validate';

export const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'cng'] as const;

export function parseVehicle(body: Record<string, unknown>) {
  const registration = str(body.registration_no, { name: 'Registration number', min: 4, max: 20 })
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{4,20}$/.test(registration)) {
    throw new HttpError(400, 'Registration number may only contain letters, digits and hyphens');
  }
  return {
    registration_no: registration,
    make: str(body.make, { name: 'Make', max: 50 }),
    model: str(body.model, { name: 'Model', max: 50 }),
    year: int(body.year, { name: 'Year', min: 1950, max: 2100 }),
    fuel_type: oneOf(body.fuel_type, FUEL_TYPES, 'Fuel type'),
    odometer_km: int(body.odometer_km ?? 0, { name: 'Odometer', min: 0, max: 5000000 }),
  };
}
