import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/time";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const businessName = await getSetting("businessName", "TimeClock");

  return (
    <div className="min-h-screen bg-zinc-50 md:flex">
      <AdminSidebar businessName={businessName} userName={user.fullName} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
