import { route } from '@/lib/api';
import { HttpError } from '@/lib/errors';
import { assertOwnsAppointment } from '@/lib/guards';
import { loadAppointmentDetail } from '@/lib/queries';
import { idParam } from '@/lib/validate';

export const GET = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertOwnsAppointment(session, id);
    const detail = await loadAppointmentDetail(id);
    if (!detail) throw new HttpError(404, 'Appointment not found');
    return detail;
  },
  { roles: ['customer'] }
);
