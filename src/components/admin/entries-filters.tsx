"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EntryStatusFilter = "all" | "open" | "closed";

export interface FilterEmployee {
  id: string;
  fullName: string;
}

export interface EntriesFiltersDefaults {
  employee?: string;
  from: string;
  to: string;
  status: string;
}

const ALL = "all";

function normalizeStatus(value: string): EntryStatusFilter {
  return value === "open" || value === "closed" ? value : "all";
}

export function EntriesFilters({
  employees,
  defaults,
}: {
  employees: FilterEmployee[];
  defaults: EntriesFiltersDefaults;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function reset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const employeeValue =
    defaults.employee && employees.some((e) => e.id === defaults.employee)
      ? defaults.employee
      : ALL;
  const statusValue = normalizeStatus(defaults.status);
  const resetKey = `${employeeValue}|${defaults.from}|${defaults.to}|${statusValue}`;

  return (
    <div
      key={resetKey}
      className={cn(
        "grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end",
        pending && "opacity-70"
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="filter-employee">Employee</Label>
        <Select
          defaultValue={employeeValue}
          onValueChange={(value) => update("employee", value === ALL ? null : value)}
        >
          <SelectTrigger id="filter-employee">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-from">From</Label>
        <Input
          id="filter-from"
          type="date"
          defaultValue={defaults.from}
          onChange={(event) => update("from", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-to">To</Label>
        <Input
          id="filter-to"
          type="date"
          defaultValue={defaults.to}
          onChange={(event) => update("to", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          defaultValue={statusValue}
          onValueChange={(value) => update("status", value === ALL ? null : value)}
        >
          <SelectTrigger id="filter-status">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={reset}
          disabled={pending}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
