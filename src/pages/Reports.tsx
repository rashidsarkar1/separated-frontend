import React, { useState, useEffect } from "react";
import { Package, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTransactions } from "../store/slices/transactionSlice";
import { apiService } from "../services/apiService";

interface InventoryValuation {
  productCount: number;
  totalQuantity: number;
  stockValue: number;
  retailValue: number;
}

export function Reports() {
  const dispatch = useAppDispatch();
  const {
    transactions: profitLogs,
    loading,
    meta,
  } = useAppSelector((state) => state.transactions);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");
  const [activeTab, setActiveTab] = useState<"transactions" | "stock">(
    "transactions",
  );
  const [valuation, setValuation] = useState<InventoryValuation | null>(null);
  const [valuationLoading, setValuationLoading] = useState(true);
  const [valuationError, setValuationError] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    dispatch(
      fetchTransactions({ search: searchTerm, page, limit: pageSize, range }),
    );
  }, [dispatch, searchTerm, page, range]);

  useEffect(() => {
    let isCurrent = true;
    apiService
      .getInventoryValuation()
      .then((data: InventoryValuation) => {
        if (isCurrent) setValuation(data);
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setValuationError(
            error instanceof Error
              ? error.message
              : "Failed to load inventory valuation.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setValuationLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const filteredLogs = profitLogs;

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Financial Reports
          </h2>
          <p className="text-sm text-slate-500">
            Track and analyze your profit performance.
          </p>
        </div>
        {activeTab === "transactions" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by Order ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 w-[280px] bg-white border-slate-200 rounded-xl"
              />
            </div>
            <DateRangeSelect
              value={range}
              onChange={(nextRange) => {
                setRange(nextRange);
                setPage(1);
              }}
              className="h-10 w-full sm:w-36 bg-white"
            />
          </div>
        )}
      </div>
      <div
        role="tablist"
        aria-label="Financial report sections"
        className="flex gap-2 border-b border-slate-200"
      >
        <button
          id="transactions-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "transactions"}
          aria-controls="transactions-panel"
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "transactions"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Transactions
        </button>
        <button
          id="stock-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "stock"}
          aria-controls="stock-panel"
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "stock"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Stock Value
        </button>
      </div>
      {activeTab === "transactions" ? (
        <div
          id="transactions-panel"
          role="tabpanel"
          aria-labelledby="transactions-tab"
        >
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-white">
              <CardTitle className="text-base font-black uppercase text-slate-800">
                Financial Transaction Ledger
              </CardTitle>
              <CardDescription>
                Invoices filtered by the selected date range.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-slate-400"
                        >
                          Loading ledger…
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length ? (
                      filteredLogs.map((order: any) => {
                        const date = new Date(
                          order.createdAt || order.orderDate || order.date,
                        );
                        const total = Number(order.totalAmount) || 0;
                        const paid = Number(order.amountPaid ?? total) || 0;
                        const due =
                          Number(order.dueAmount ?? Math.max(0, total - paid)) ||
                          0;
                        return (
                          <TableRow key={order._id || order.id}>
                            <TableCell className="whitespace-nowrap">
                              {Number.isNaN(date.getTime())
                                ? "N/A"
                                : format(date, "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              #
                              {String(order._id || order.id)
                                .slice(-8)
                                .toUpperCase()}
                            </TableCell>
                            <TableCell>
                              {order.customerName || "Walk-in Customer"}
                            </TableCell>
                            <TableCell className="text-right">
                              ৳{total.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              ৳{paid.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              ৳{due.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ৳
                              {(Number(order.totalProfit) || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-slate-400"
                        >
                          No transactions found for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={page}
                totalPages={Math.max(
                  1,
                  Math.ceil((meta?.total || 0) / pageSize),
                )}
                onPageChange={setPage}
                totalItems={meta?.total || 0}
                pageSize={pageSize}
                label="invoices"
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div id="stock-panel" role="tabpanel" aria-labelledby="stock-tab">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase text-slate-800">
                <Package className="h-5 w-5 text-blue-600" />
                Current Inventory Value
              </CardTitle>
              <CardDescription>
                Value of active products currently in stock.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-5 sm:col-span-2 lg:col-span-1">
                <p className="text-sm font-medium text-blue-700">
                  Stock value at buy price
                </p>
                {valuationLoading ? (
                  <p className="mt-2 text-2xl font-bold text-slate-400">
                    Loading…
                  </p>
                ) : valuationError ? (
                  <p className="mt-2 text-sm text-red-600">{valuationError}</p>
                ) : (
                  <p className="mt-2 text-3xl font-black text-blue-900">
                    ৳{(valuation?.stockValue || 0).toLocaleString()}
                  </p>
                )}
              </div>
              {!valuationLoading && !valuationError && valuation && (
                <>
                  <div className="rounded-xl border border-slate-200 p-5">
                    <p className="text-sm font-medium text-slate-500">
                      Potential selling value
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">
                      ৳{valuation.retailValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-5">
                    <p className="text-sm font-medium text-slate-500">
                      Products · Units in stock
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">
                      {valuation.productCount.toLocaleString()} ·{" "}
                      {valuation.totalQuantity.toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
