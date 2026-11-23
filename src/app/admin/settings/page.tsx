import { requireAdmin } from "@/lib/auth";
import { getSetting, getTimezone } from "@/lib/time";
import { SettingsForm } from "@/components/admin/settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  await requireAdmin();
  const [timezone, kiosk, businessName] = await Promise.all([
    getTimezone(),
    getSetting("kioskAutoLogout", "true"),
    getSetting("businessName", "TimeClock"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Business preferences for TimeClock
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Time zone, kiosk mode, and login branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaults={{
              timezone,
              kioskAutoLogout: kiosk === "true",
              businessName,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
