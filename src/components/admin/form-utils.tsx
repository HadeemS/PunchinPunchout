"use client";

import {
  useActionState,
  useCallback,
  useTransition,
  type FormEvent,
} from "react";

export type FormResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Wraps useActionState and submits the form inside a transition without the
 * automatic React 19 form reset, so user input survives validation errors.
 */
export function useActionForm<S extends FormResult>(
  action: (prev: S | null, formData: FormData) => Promise<S>
): {
  state: S | null;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
} {
  const [state, formAction, actionPending] = useActionState<
    S | null,
    FormData
  >(action, null);
  const [transitionPending, startTransition] = useTransition();

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => {
        formAction(formData);
      });
    },
    [formAction]
  );

  return { state, pending: actionPending || transitionPending, onSubmit };
}

export function getFieldError(
  state: FormResult | null,
  key: string
): string | undefined {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key]?.[0];
}

export function FieldError({
  state,
  name,
}: {
  state: FormResult | null;
  name: string;
}) {
  const message = getFieldError(state, name);
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

export function FormError({ state }: { state: FormResult | null }) {
  if (!state || state.ok) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {state.error}
    </div>
  );
}
