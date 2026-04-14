export type OpType = "all" | "expense" | "income";

export type DashboardFilters = {
  from?: string;
  to?: string;
  type: OpType;
  currency?: string;
  q?: string;
  categories: string[];
};

export type SummaryResponse = {
  totals: { income: number; expense: number; net: number };
  byMonth: Array<{ ym: string; income: number; expense: number; net: number }>;
  topCategories: Array<{ name: string; amount: number }>;
  currencies: string[];
};

export type CategoriesResponse = {
  categories: Array<{ name: string; count: number; expense: number; income: number }>;
};

export type TransactionsResponse = {
  total: number;
  page: number;
  pageSize: number;
  rows: Array<{
    operation_datetime: string | null;
    payment_date: string | null;
    category: string | null;
    description: string | null;
    operation_amount: number | null;
    operation_currency: string | null;
    status: string | null;
    card: string | null;
  }>;
};

