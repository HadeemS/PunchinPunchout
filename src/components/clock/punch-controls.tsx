"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { punchInAction, punchOutAction } from "@/actions/punch";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  isClockedIn: boolean;
  kioskAutoLogout: boolean;
};

export function PunchControls({ isClockedIn, kioskAutoLogout }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [staySignedIn, setStaySignedIn] = useState(false);

  useEffect(() => {
    if (countdown === null || staySignedIn) return;
    if (countdown <= 0) {
      void logoutAction();
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, staySignedIn]);

  function startKioskLogout() {
    if (kioskAutoLogout && !staySignedIn) {
      setCountdown(10);
    }
  }

  function handlePunchIn() {
    startTransition(async () => {
      const result = await punchInAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.refresh();
      startKioskLogout();
    });
  }

  function handlePunchOut() {
    startTransition(async () => {
      const result = await punchOutAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.refresh();
      startKioskLogout();
    });
  }

  return (
    <div className="space-y-4">
      {!isClockedIn ? (
        <Button
          type="button"
          variant="success"
          size="lg"
          className="h-16 w-full text-lg"
          disabled={pending || countdown !== null}
          onClick={handlePunchIn}
          aria-label="Punch in"
        >
          {pending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Punching in…
            </>
          ) : (
            "Punch In"
          )}
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="lg"
              className="h-16 w-full text-lg"
              disabled={pending || countdown !== null}
              aria-label="Punch out"
            >
              {pending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Punching out…
                </>
              ) : (
                "Punch Out"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm punch out</AlertDialogTitle>
              <AlertDialogDescription>
                End your current shift and record a punch out now?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePunchOut}>
                Punch Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {countdown !== null && !staySignedIn && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center">
          <p className="text-sm text-zinc-600">
            Signing out in{" "}
            <span className="font-semibold text-zinc-900 tabular-nums">
              {countdown}s
            </span>{" "}
            for the next employee.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setStaySignedIn(true);
              setCountdown(null);
            }}
          >
            Stay signed in
          </Button>
        </div>
      )}
    </div>
  );
}
