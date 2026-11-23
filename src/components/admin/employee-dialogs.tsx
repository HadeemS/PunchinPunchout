"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createEmployeeAction,
  generatePasswordAction,
  resetPasswordAction,
  setEmployeeActiveAction,
  updateEmployeeAction,
  type EmployeeActionResult,
} from "@/actions/employees";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export type EmployeeRole = "ADMIN" | "EMPLOYEE";

export interface EmployeeDialogEmployee {
  id: string;
  fullName: string;
  role: EmployeeRole;
  active: boolean;
}

export type EmployeeRef = Pick<EmployeeDialogEmployee, "id" | "fullName">;

const ROLE_OPTIONS: readonly { value: EmployeeRole; label: string }[] = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "ADMIN", label: "Admin" },
];

function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      disabled={value.length === 0}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}

function TempPasswordPanel({
  title,
  description,
  password,
  onDone,
}: {
  title: string;
  description: string;
  password: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          Temporary password
        </p>
        <p className="mt-1 select-all break-all font-mono text-lg font-semibold text-zinc-900">
          {password}
        </p>
      </div>
      <p className="text-sm text-zinc-500">
        This password is shown only once. The employee will be required to
        change it at next sign-in.
      </p>
      <DialogFooter className="gap-2 sm:gap-0">
        <CopyButton value={password} label="Copy password" />
        <Button type="button" variant="success" onClick={onDone}>
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add employee                                                               */
/* -------------------------------------------------------------------------- */

function AddEmployeeBody({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");
  const [generating, startGenerating] = useTransition();

  const { state, pending, onSubmit } = useActionForm<EmployeeActionResult>(
    async (prev, formData) => {
      const result = await createEmployeeAction(prev, formData);
      if (result.ok) {
        setCreatedUsername(String(formData.get("username") ?? ""));
        toast.success("Employee created");
        router.refresh();
      }
      return result;
    }
  );

  function generate() {
    startGenerating(async () => {
      try {
        const result = await generatePasswordAction();
        setPassword(result.password);
      } catch {
        toast.error("Could not generate a password.");
      }
    });
  }

  if (state?.ok) {
    return (
      <TempPasswordPanel
        title="Employee created"
        description={
          createdUsername
            ? `Share these credentials with ${createdUsername}.`
            : "Share this temporary password with the new employee."
        }
        password={state.tempPassword ?? password}
        onDone={onDone}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add employee</DialogTitle>
        <DialogDescription>
          Create an account with a temporary password. The employee must change
          it at first sign-in.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="add-employee-full-name">Full name</Label>
        <Input
          id="add-employee-full-name"
          name="fullName"
          autoComplete="off"
          maxLength={100}
          required
        />
        <FieldError state={state} name="fullName" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="add-employee-username">Username</Label>
        <Input
          id="add-employee-username"
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={32}
          required
        />
        <FieldError state={state} name="username" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="add-employee-role">Role</Label>
        <Select name="role" defaultValue="EMPLOYEE">
          <SelectTrigger id="add-employee-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError state={state} name="role" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="add-employee-password">Temporary password</Label>
        <div className="flex gap-2">
          <Input
            id="add-employee-password"
            name="password"
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={generate}
            disabled={generating}
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "…" : "Generate"}
          </Button>
          <CopyButton value={password} />
        </div>
        <p className="text-xs text-zinc-500">
          At least 8 characters with a letter and a number.
        </p>
        <FieldError state={state} name="password" />
      </div>

      <FormError state={state} />

      <DialogFooter>
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Creating…" : "Create employee"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <AddEmployeeBody onDone={close} />
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit employee                                                              */
/* -------------------------------------------------------------------------- */

function EditEmployeeForm({
  employee,
  onDone,
}: {
  employee: EmployeeDialogEmployee;
  onDone: () => void;
}) {
  const router = useRouter();
  const { state, pending, onSubmit } = useActionForm<EmployeeActionResult>(
    async (prev, formData) => {
      const result = await updateEmployeeAction(prev, formData);
      if (result.ok) {
        toast.success("Employee updated");
        onDone();
        router.refresh();
      }
      return result;
    }
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit employee</DialogTitle>
        <DialogDescription>
          Update the name or role for {employee.fullName}.
        </DialogDescription>
      </DialogHeader>

      <input type="hidden" name="id" value={employee.id} />

      <div className="space-y-2">
        <Label htmlFor={`edit-employee-name-${employee.id}`}>Full name</Label>
        <Input
          id={`edit-employee-name-${employee.id}`}
          name="fullName"
          defaultValue={employee.fullName}
          maxLength={100}
          required
        />
        <FieldError state={state} name="fullName" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`edit-employee-role-${employee.id}`}>Role</Label>
        <Select name="role" defaultValue={employee.role}>
          <SelectTrigger id={`edit-employee-role-${employee.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError state={state} name="role" />
      </div>

      <FormError state={state} />

      <DialogFooter>
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditEmployeeDialog({
  employee,
}: {
  employee: EmployeeDialogEmployee;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <EditEmployeeForm employee={employee} onDone={close} />
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Reset password                                                             */
/* -------------------------------------------------------------------------- */

export function ResetPasswordButton({ employee }: { employee: EmployeeRef }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function reset() {
    startTransition(async () => {
      try {
        const result = await resetPasswordAction(employee.id);
        if (result.ok && result.tempPassword) {
          setTempPassword(result.tempPassword);
          router.refresh();
        } else if (!result.ok) {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not reset the password.");
      }
    });
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            <KeyRound className="h-4 w-4" />
            {pending ? "Resetting…" : "Reset password"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be generated for{" "}
              {employee.fullName} and any active sessions will be signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Reset password</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={tempPassword !== null}
        onOpenChange={(next) => {
          if (!next) setTempPassword(null);
        }}
      >
        <DialogContent>
          {tempPassword !== null ? (
            <TempPasswordPanel
              title="Password reset"
              description={`A new temporary password was generated for ${employee.fullName}.`}
              password={tempPassword}
              onDone={() => setTempPassword(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Deactivate / reactivate                                                    */
/* -------------------------------------------------------------------------- */

export function DeactivateButton({ employee }: { employee: EmployeeRef }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function deactivate() {
    startTransition(async () => {
      try {
        const result = await setEmployeeActiveAction(employee.id, false);
        if (result.ok) {
          toast.success(`${employee.fullName} deactivated`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not deactivate the employee.");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          disabled={pending}
        >
          {pending ? "Deactivating…" : "Deactivate"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {employee.fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will be signed out and unable to log in or punch. Their time
            entries are kept, and you can reactivate them at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={deactivate}
          >
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReactivateButton({ employee }: { employee: EmployeeRef }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function reactivate() {
    startTransition(async () => {
      try {
        const result = await setEmployeeActiveAction(employee.id, true);
        if (result.ok) {
          toast.success(`${employee.fullName} reactivated`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not reactivate the employee.");
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-emerald-700 hover:text-emerald-800"
      onClick={reactivate}
      disabled={pending}
    >
      {pending ? "Reactivating…" : "Reactivate"}
    </Button>
  );
}
