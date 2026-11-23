"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateSettingsAction,
  type SettingsActionResult,
} from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldError,
  FormError,
  useActionForm,
} from "@/components/admin/form-utils";
import { COMMON_TIMEZONES } from "@/lib/time";

export interface SettingsFormDefaults {
  timezone: string;
  kioskAutoLogout: boolean;
  businessName: string;
}

export function SettingsForm({ defaults }: { defaults: SettingsFormDefaults }) {
  const router = useRouter();
  const [kioskAutoLogout, setKioskAutoLogout] = useState(
    defaults.kioskAutoLogout
  );

  const { state, pending, onSubmit } = useActionForm<SettingsActionResult>(
    async (prev, formData) => {
      const result = await updateSettingsAction(prev, formData);
      if (result.ok) {
        toast.success("Settings saved");
        router.refresh();
      }
      return result;
    }
  );

  const timezones: readonly string[] = (
    COMMON_TIMEZONES as readonly string[]
  ).includes(defaults.timezone)
    ? COMMON_TIMEZONES
    : [defaults.timezone, ...COMMON_TIMEZONES];

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="settings-business-name">Business name</Label>
        <Input
          id="settings-business-name"
          name="businessName"
          defaultValue={defaults.businessName}
          maxLength={100}
          required
        />
        <FieldError state={state} name="businessName" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-timezone">Timezone</Label>
        <Select name="timezone" defaultValue={defaults.timezone}>
          <SelectTrigger id="settings-timezone">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500">
          Used for punch times, reports, and entry editing.
        </p>
        <FieldError state={state} name="timezone" />
      </div>

      <div className="rounded-xl border border-zinc-200 p-4">
        <div className="flex items-start gap-3">
          <input
            id="settings-kiosk-auto-logout"
            type="checkbox"
            checked={kioskAutoLogout}
            onChange={(event) => setKioskAutoLogout(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
          />
          <div className="space-y-1">
            <Label htmlFor="settings-kiosk-auto-logout">
              Kiosk auto logout
            </Label>
            <p className="text-sm text-zinc-500">
              Automatically sign employees out of the clock screen after they
              punch in or out.
            </p>
          </div>
        </div>
        <input
          type="hidden"
          name="kioskAutoLogout"
          value={kioskAutoLogout ? "true" : "false"}
        />
        <FieldError state={state} name="kioskAutoLogout" />
      </div>

      <FormError state={state} />

      <Button type="submit" variant="success" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
