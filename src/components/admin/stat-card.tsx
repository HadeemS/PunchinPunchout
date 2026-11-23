import { Card } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
