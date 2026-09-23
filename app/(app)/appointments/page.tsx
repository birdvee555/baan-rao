import AppointmentList from "@/components/AppointmentList";
import { requireMember } from "@/lib/auth";
import { getAppointments, getPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const { family } = await requireMember();
  const [appointments, people] = await Promise.all([
    getAppointments(family.id),
    getPeople(family.id),
  ]);

  return (
    <AppointmentList
      initialAppointments={appointments}
      initialPeople={people}
    />
  );
}
