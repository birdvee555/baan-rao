import RealtimeSync from "@/components/RealtimeSync";
import { requireMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { family } = await requireMember();

  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-5">{children}</main>
      <RealtimeSync channelKey={family.realtime_key} />
    </>
  );
}
