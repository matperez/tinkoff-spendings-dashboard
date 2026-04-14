"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

function NavLink(props: { href: string; label: string; active: boolean }) {
  return (
    <a href={props.href}>
      <Button variant={props.active ? "default" : "secondary"} size="sm">
        {props.label}
      </Button>
    </a>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isPatterns = pathname === "/patterns";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <NavLink href="/dashboard" label="Дашборд" active={isDashboard} />
        <NavLink href="/patterns" label="Закономерности" active={isPatterns} />
      </div>
      <a className="text-xs text-muted-foreground hover:underline" href="/">
        Главная
      </a>
    </div>
  );
}

