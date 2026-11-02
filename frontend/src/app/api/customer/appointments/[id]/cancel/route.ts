import { route } from '@/lib/api';
import { callProc } from '@/lib/db';
import { assertOwnsAppointment } from '@/lib/guards';
import { idParam } from '@/lib/validate';

export const POST = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertOwnsAppointment(session, id);
    // The procedure refuses anything but 'scheduled' and returns reserved parts to stock atomically
    await callProc('sp_cancel_appointment', [id]);
    return { ok: true };
  },
  { roles: ['customer'] }
);
