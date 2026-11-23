import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  toURLSearchParams,
  type SearchParamsRecord,
} from "@/lib/query-string";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("ellipsis-start");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: SearchParamsRecord;
}) {
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);

  function hrefFor(target: number): string {
    const params = toURLSearchParams(searchParams, ["page"]);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const items = getPageItems(current, totalPages);
  const prevDisabled = current <= 1;
  const nextDisabled = current >= totalPages;
  const edgeClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-zinc-500">
        Page {current} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        {prevDisabled ? (
          <span
            aria-disabled="true"
            className={cn(edgeClass, "pointer-events-none opacity-50")}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </span>
        ) : (
          <Link href={hrefFor(current - 1)} className={edgeClass} rel="prev">
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Link>
        )}

        <div className="hidden items-center gap-1 sm:flex">
          {items.map((item) =>
            typeof item === "string" ? (
              <span key={item} className="px-2 text-sm text-zinc-400">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={hrefFor(item)}
                aria-current={item === current ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: item === current ? "success" : "ghost",
                    size: "sm",
                  }),
                  "min-w-9 px-2"
                )}
              >
                {item}
              </Link>
            )
          )}
        </div>

        {nextDisabled ? (
          <span
            aria-disabled="true"
            className={cn(edgeClass, "pointer-events-none opacity-50")}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link href={hrefFor(current + 1)} className={edgeClass} rel="next">
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
