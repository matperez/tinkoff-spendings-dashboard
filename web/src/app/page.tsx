export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <div className="text-2xl font-semibold tracking-tight">Spendings</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Локальный дашборд по `spendings.sqlite`
        </div>
      </div>
      <a
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        href="/dashboard"
      >
        Открыть дашборд
      </a>
    </div>
  );
}
