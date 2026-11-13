import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Tags,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiService } from "../services/apiService";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Pagination } from "../components/common/Pagination";

type ExpenseFrequency = "once" | "daily" | "weekly" | "monthly";

interface ExpenseRecord {
  _id: string;
  title: string;
  amount: number;
  category: string;
  frequency: ExpenseFrequency;
  startDate: string;
  endDate?: string;
  note?: string;
}

interface ExpenseReport {
  totalExpenses: number;
  totalSalesProfit: number;
  netProfit: number;
  todayExpenses: number;
  todaySalesProfit: number;
  todayNetProfit: number;
  chart: {
    date: string;
    salesProfit: number;
    expenses: number;
    netProfit: number;
  }[];
}

const todayDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
const formatMoney = (amount: number) =>
  `৳${(Number(amount) || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
const getErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || "Something went wrong. Please try again.";

const frequencyLabels: Record<ExpenseFrequency, string> = {
  once: "One time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const emptyForm = (date: string) => ({
  title: "",
  amount: "",
  category: "Salary",
  frequency: "monthly" as ExpenseFrequency,
  startDate: date,
  endDate: "",
  note: "",
});

export function ExpenseManagement() {
  const today = useMemo(todayDate, []);
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("");
  const [sortBy, setSortBy] = useState("startDate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm(today));
  const [newCategory, setNewCategory] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expenseResponse, expenseReport, expenseCategories] =
        await Promise.all([
          apiService.getExpenses({
            search,
            category: categoryFilter,
            frequency: frequencyFilter,
            from,
            to,
            page,
            limit: 10,
            sortBy,
            order,
          }),
          apiService.getExpenseSummary(from, to),
          apiService.getExpenseCategories(),
        ]);
      setExpenses(expenseResponse.data || []);
      setTotal(expenseResponse.meta?.total || 0);
      setReport(expenseReport);
      setCategories(expenseCategories);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [
    categoryFilter,
    frequencyFilter,
    from,
    order,
    page,
    search,
    sortBy,
    to,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setFrequencyFilter("");
    setFrom(monthStart(today));
    setTo(today);
    setPage(1);
  };

  const openNewExpense = () => {
    setEditingExpense(null);
    setForm(emptyForm(today));
    setExpenseDialogOpen(true);
  };

  const openEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      frequency: expense.frequency,
      startDate: expense.startDate,
      endDate: expense.endDate || "",
      note: expense.note || "",
    });
    setExpenseDialogOpen(true);
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Add an expense name and an amount greater than zero.");
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error("End date cannot be before the expense date.");
      return;
    }

    setSaving(true);
    try {
      const expenseData = {
        ...form,
        amount,
        endDate: form.frequency === "once" ? "" : form.endDate,
      };
      if (editingExpense) {
        await apiService.updateExpense(editingExpense._id, expenseData);
        toast.success("Expense updated.");
      } else {
        await apiService.createExpense(expenseData);
        toast.success("Expense added.");
      }
      setExpenseDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    setSaving(true);
    try {
      const savedCategory = await apiService.createExpenseCategory(name);
      const updatedCategories = await apiService.getExpenseCategories();
      setCategories(updatedCategories);
      const selectedCategory =
        updatedCategories.find(
          (category) =>
            category.toLocaleLowerCase() ===
            String(savedCategory?.name || name).toLocaleLowerCase(),
        ) || name;
      setForm((current) => ({ ...current, category: selectedCategory }));
      setNewCategory("");
      setCategoryDialogOpen(false);
      toast.success("Expense category added.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: ExpenseRecord) => {
    if (!window.confirm(`Delete "${expense.title}"? This removes its future expense entries.`)) {
      return;
    }
    try {
      await apiService.deleteExpense(expense._id);
      toast.success("Expense deleted.");
      if (expenses.length === 1 && page > 1) setPage(page - 1);
      else await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const changeSort = (field: string) => {
    if (sortBy === field) setOrder((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setOrder(field === "title" || field === "category" ? "asc" : "desc");
    }
    setPage(1);
  };

  const sortButton = (label: string, field: string) => (
    <button
      type="button"
      onClick={() => changeSort(field)}
      className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-indigo-600"
    >
      {label}
      {sortBy === field &&
        (order === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        ))}
    </button>
  );

  const chartData = report?.chart.map((point) => ({
    ...point,
    label: format(new Date(`${point.date}T00:00:00`), "d MMM"),
  }));
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              Shop finances
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Manage expenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track daily costs and recurring salary, rent, and transport.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2 border-slate-200 bg-white"
            onClick={() => setCategoryDialogOpen(true)}
          >
            <Tags className="h-4 w-4" />
            Add category
          </Button>
          <Button
            className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={openNewExpense}
          >
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Expenses in selected period"
          value={report ? formatMoney(report.totalExpenses) : "—"}
          detail={`${from} to ${to}`}
          icon={<ReceiptText className="h-5 w-5" />}
          color="rose"
        />
        <SummaryCard
          title="Today's expense"
          value={report ? formatMoney(report.todayExpenses) : "—"}
          detail="Includes recurring expense allocations"
          icon={<CalendarDays className="h-5 w-5" />}
          color="amber"
        />
        <SummaryCard
          title="Today's net profit"
          value={report ? formatMoney(report.todayNetProfit) : "—"}
          detail={
            report
              ? `${formatMoney(report.todaySalesProfit)} gross profit − expenses`
              : "Sales profit less today's expenses"
          }
          icon={<ChartNoAxesCombined className="h-5 w-5" />}
          color={report && report.todayNetProfit < 0 ? "rose" : "emerald"}
        />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Profit after expenses
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Monthly amounts are accrued evenly across the days in each month;
                weekly amounts are accrued over 7 days.
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              Period net profit
              <div className="text-lg font-bold text-slate-900">
                {report ? formatMoney(report.netProfit) : "—"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(value: number) => `৳${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.date || ""
                    }
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 12px 24px -8px rgba(15, 23, 42, .16)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="salesProfit"
                    name="Gross profit"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#fb7185"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Line
                    dataKey="netProfit"
                    name="Net profit"
                    type="monotone"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Select a date range to view the expense and profit chart.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="gap-4 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Expense records
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Recurring items stay as one schedule and are automatically included
              in each applicable day's totals.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, category, note..."
                className="h-10 bg-slate-50 pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
              aria-label="Filter by expense category"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={frequencyFilter}
              onChange={(event) => {
                setFrequencyFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
              aria-label="Filter by frequency"
            >
              <option value="">All frequencies</option>
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="h-10 bg-slate-50"
              aria-label="Filter expenses from date"
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className="h-10 bg-slate-50"
                aria-label="Filter expenses to date"
              />
              <Button
                variant="outline"
                className="h-10 shrink-0 border-slate-200"
                onClick={resetFilters}
                title="Reset filters"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3">{sortButton("Expense", "title")}</th>
                <th className="px-5 py-3">{sortButton("Category", "category")}</th>
                <th className="px-5 py-3">{sortButton("Frequency", "frequency")}</th>
                <th className="px-5 py-3 text-right">{sortButton("Amount", "amount")}</th>
                <th className="px-5 py-3">{sortButton("Starts", "startDate")}</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Wallet className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                    <p className="font-medium text-slate-700">No expenses found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try a different filter or add your first expense.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{expense.title}</div>
                      {expense.note && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                          {expense.note}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{expense.category}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {frequencyLabels[expense.frequency]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                      {formatMoney(expense.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{format(new Date(`${expense.startDate}T00:00:00`), "MMM d, yyyy")}</div>
                      {expense.endDate && (
                        <div className="mt-0.5 text-xs text-slate-400">
                          Until {format(new Date(`${expense.endDate}T00:00:00`), "MMM d, yyyy")}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditExpense(expense)}
                          aria-label={`Edit ${expense.title}`}
                          className="text-slate-500 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDelete(expense)}
                          aria-label={`Delete ${expense.title}`}
                          className="text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={total}
          pageSize={10}
          label="expenses"
        />
      </Card>

      <Dialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingExpense ? "Edit expense" : "Add an expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Expense name
                <Input
                  autoFocus
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="e.g. Rashid's salary"
                  maxLength={120}
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Amount (৳)
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="200"
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  required
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Repeat
                <select
                  value={form.frequency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      frequency: event.target.value as ExpenseFrequency,
                      endDate:
                        event.target.value === "once" ? "" : current.endDate,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="once">One time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                {form.frequency === "once" ? "Expense date" : "Starts on"}
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  required
                />
              </label>
              {form.frequency !== "once" && (
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Ends on <span className="font-normal text-slate-400">(optional)</span>
                  <Input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, endDate: event.target.value }))
                    }
                  />
                </label>
              )}
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Note <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Add a note about this expense..."
                maxLength={1000}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            {form.frequency !== "once" && (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-800">
                {form.frequency === "monthly"
                  ? "This monthly amount will be divided across the days in each month and included in daily net profit."
                  : form.frequency === "weekly"
                    ? "This weekly amount will be divided across 7 days and included in daily net profit."
                    : "This amount will be included in daily net profit every day."}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpenseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editingExpense ? "Save changes" : "Save expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add expense category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Category name
              <Input
                autoFocus
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="e.g. Internet bill"
                maxLength={60}
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Add category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon,
  color,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  color: "rose" | "amber" | "emerald";
}) {
  const colors = {
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </div>
          <div className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">{detail}</div>
        </div>
        <div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
