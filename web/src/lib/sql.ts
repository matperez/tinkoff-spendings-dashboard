export type OpType = "all" | "expense" | "income";

export type Filters = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  type?: OpType;
  categories?: string[];
  excludeCategories?: string[];
  currency?: string;
  q?: string;
};

export function normalizeFilters(u: URL): Filters {
  const from = u.searchParams.get("from") ?? undefined;
  const to = u.searchParams.get("to") ?? undefined;
  const type = (u.searchParams.get("type") ?? "all") as OpType;
  const categories = u.searchParams.getAll("category").filter(Boolean);
  const excludeCategories = u.searchParams.getAll("excludeCategory").filter(Boolean);
  const currency = u.searchParams.get("currency") ?? undefined;
  const q = u.searchParams.get("q") ?? undefined;

  return {
    from,
    to,
    type: type === "expense" || type === "income" ? type : "all",
    categories: categories.length ? categories : undefined,
    excludeCategories: excludeCategories.length ? excludeCategories : undefined,
    currency: currency || undefined,
    q: q?.trim() ? q.trim() : undefined,
  };
}

export function buildWhere(f: Filters) {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  // operation_datetime is ISO like '2026-04-14T18:04:20'
  if (f.from) {
    clauses.push("operation_datetime >= @from");
    params.from = `${f.from}T00:00:00`;
  }
  if (f.to) {
    clauses.push("operation_datetime <= @to");
    params.to = `${f.to}T23:59:59`;
  }

  if (f.type === "expense") clauses.push("operation_amount < 0");
  if (f.type === "income") clauses.push("operation_amount > 0");

  if (f.categories?.length) {
    const inParams = f.categories.map((_, i) => `@cat${i}`);
    clauses.push(`COALESCE(category,'') IN (${inParams.join(",")})`);
    f.categories.forEach((c, i) => (params[`cat${i}`] = c));
  }

  if (f.excludeCategories?.length) {
    const notInParams = f.excludeCategories.map((_, i) => `@xcat${i}`);
    clauses.push(`COALESCE(category,'') NOT IN (${notInParams.join(",")})`);
    f.excludeCategories.forEach((c, i) => (params[`xcat${i}`] = c));
  }

  if (f.currency) {
    clauses.push("operation_currency = @currency");
    params.currency = f.currency;
  }

  if (f.q) {
    clauses.push("description LIKE @q");
    params.q = `%${f.q}%`;
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export function andWhere(whereSql: string, extraClause: string) {
  if (!extraClause.trim()) return whereSql;
  return whereSql ? `${whereSql} AND ${extraClause}` : `WHERE ${extraClause}`;
}

