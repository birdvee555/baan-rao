import RealtimeSync from "@/components/RealtimeSync";
import Tabs from "@/components/Tabs";
import { requireMember } from "@/lib/auth";
import { getActive } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { family } = await requireMember();
  const { items } = await getActive(family.id);
  const remaining = items.filter((i) => !i.is_purchased).length;

  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pb-48 pt-5">{children}</main>
      <Tabs remaining={remaining} />
      <RealtimeSync channelKey={family.realtime_key} />
    </>
  );
}
