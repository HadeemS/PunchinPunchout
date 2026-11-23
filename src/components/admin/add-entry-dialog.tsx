"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createEntryAction, type EntryActionResult } from "@/actions/entries";
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
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FormError,
  useActionForm,
} from "@/components/admin/form-utils";

export interface AddEntryEmployee {
  id: string;
  fullName: string;
}

function AddEntryForm({
  employees,
  onDone,
}: {
  employees: AddEntryEmployee[];
  onDone: () => void;
}) {
  const router = useRouter();
  const { state, pending, onSubmit } = useActionForm<EntryActionResult>(
    async (prev, formData) => {
      const result = await createEntryAction(prev, formData);
      if (result.ok) {
        toast.success("Manual entry added");
        onDone();
        router.refresh();
      }
      return result;
    }
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add manual entry</DialogTitle>
        <DialogDescription>
          Times are in the business timezone. A note is required and is recorded
          in the audit log.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="add-entry-employee">Employee</Label>
        <Select name="userId">
          <SelectTrigger id="add-entry-employee">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError state={state} name="userId" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="add-entry-clock-in">Clock in</Label>
        <Input
          id="add-entry-clock-in"
          name="clockIn"
          type="datetime-local"
          required
        />
        <FieldError state={state} name="clockIn" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="add-entry-clock-out">
          Clock out{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </Label>
        <Input id="add-entry-clock-out" name="clockOut" type="datetime-local" />
        <FieldError state={state} name="clockOut" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="add-entry-note">Note</Label>
        <Textarea
          id="add-entry-note"
          name="note"
          rows={3}
          maxLength={500}
          required
          placeholder="e.g. Forgot to punch in; confirmed with manager"
        />
        <FieldError state={state} name="note" />
      </div>

      <FormError state={state} />

      <DialogFooter>
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Adding…" : "Add entry"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddEntryDialog({
  employees,
}: {
  employees: AddEntryEmployee[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add manual entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <AddEntryForm employees={employees} onDone={close} />
      </DialogContent>
    </Dialog>
  );
}
