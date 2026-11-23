"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { changePasswordAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    changePasswordAction,
    null
  );

  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="h-12"
        />
        {fieldError("currentPassword") && (
          <p className="text-sm text-red-600">{fieldError("currentPassword")}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={pending}
          className="h-12"
        />
        {fieldError("newPassword") && (
          <p className="text-sm text-red-600">{fieldError("newPassword")}</p>
        )}
        <p className="text-xs text-zinc-500">
          At least 8 characters, with one letter and one number.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={pending}
          className="h-12"
        />
        {fieldError("confirmPassword") && (
          <p className="text-sm text-red-600">{fieldError("confirmPassword")}</p>
        )}
      </div>
      {state && !state.ok && !state.fieldErrors && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state && !state.ok && state.fieldErrors && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-14 w-full text-base" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
