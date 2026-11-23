"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEntryAction,
  editEntryAction,
  type EntryActionResult,
} from "@/actions/entries";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FormError,
  useActionForm,
} from "@/components/admin/form-utils";

export interface EntryActionsEntry {
  id: string;
  clockInLocal: string;
  clockOutLocal: string | null;
  editNote: string | null;
}

function EditEntryForm({
  entry,
  onDone,
}: {
  entry: EntryActionsEntry;
  onDone: () => void;
}) {
  const router = useRouter();
  const { state, pending, onSubmit } = useActionForm<EntryActionResult>(
    async (prev, formData) => {
      const result = await editEntryAction(prev, formData);
      if (result.ok) {
        toast.success("Time entry updated");
        onDone();
        router.refresh();
      }
      return result;
    }
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit time entry</DialogTitle>
        <DialogDescription>
          Times are in the business timezone. A reason note is required and is
          recorded in the audit log.
        </DialogDescription>
      </DialogHeader>

      <input type="hidden" name="id" value={entry.id} />

      <div className="space-y-2">
        <Label htmlFor={`edit-clock-in-${entry.id}`}>Clock in</Label>
        <Input
          id={`edit-clock-in-${entry.id}`}
          name="clockIn"
          type="datetime-local"
          defaultValue={entry.clockInLocal}
          required
        />
        <FieldError state={state} name="clockIn" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`edit-clock-out-${entry.id}`}>
          Clock out{" "}
          <span className="font-normal text-zinc-500">
            (leave empty to keep open)
          </span>
        </Label>
        <Input
          id={`edit-clock-out-${entry.id}`}
          name="clockOut"
          type="datetime-local"
          defaultValue={entry.clockOutLocal ?? ""}
        />
        <FieldError state={state} name="clockOut" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`edit-note-${entry.id}`}>Reason for change</Label>
        <Textarea
          id={`edit-note-${entry.id}`}
          name="note"
          rows={3}
          maxLength={500}
          required
          placeholder="e.g. Employee forgot to clock out"
        />
        {entry.editNote ? (
          <p className="text-xs text-zinc-500">
            Previous note: {entry.editNote}
          </p>
        ) : null}
        <FieldError state={state} name="note" />
      </div>

      <FormError state={state} />

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteEntryForm({
  entryId,
  onDone,
}: {
  entryId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const { state, pending, onSubmit } = useActionForm<EntryActionResult>(
    async (prev, formData) => {
      const result = await deleteEntryAction(prev, formData);
      if (result.ok) {
        toast.success("Time entry deleted");
        onDone();
        router.refresh();
      }
      return result;
    }
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <AlertDialogHeader>
        <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently removes the entry. Enter a reason; it will be kept in
          the audit log.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <input type="hidden" name="id" value={entryId} />

      <div className="space-y-2">
        <Label htmlFor={`delete-note-${entryId}`}>Reason for deletion</Label>
        <Textarea
          id={`delete-note-${entryId}`}
          name="note"
          rows={3}
          maxLength={500}
          required
          placeholder="e.g. Duplicate entry"
        />
        <FieldError state={state} name="note" />
      </div>

      <FormError state={state} />

      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete entry"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

export function EntryActions({ entry }: { entry: EntryActionsEntry }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const closeDelete = useCallback(() => setDeleteOpen(false), []);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Entry actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4 text-zinc-500" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:bg-red-50"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <EditEntryForm entry={entry} onDone={closeEdit} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <DeleteEntryForm entryId={entry.id} onDone={closeDelete} />
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
