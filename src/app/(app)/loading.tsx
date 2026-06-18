export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="surface h-36 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
      <div className="surface h-96 animate-pulse rounded-lg bg-white" />
    </div>
  );
}
