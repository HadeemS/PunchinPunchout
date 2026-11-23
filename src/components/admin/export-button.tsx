"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  toURLSearchParams,
  type SearchParamsInput,
} from "@/lib/query-string";

export function ExportButton({
  searchParams,
  label = "Export CSV",
}: {
  searchParams: SearchParamsInput;
  label?: string;
}) {
  const query = toURLSearchParams(searchParams, ["page"]).toString();
  const href = query ? `/api/admin/export?${query}` : "/api/admin/export";

  return (
    <Button asChild variant="outline">
      <a href={href} download>
        <Download className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
