export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-zinc-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-zinc-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="mt-4 h-8 w-16 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl border border-zinc-200 bg-white" />
    </div>
  );
}
