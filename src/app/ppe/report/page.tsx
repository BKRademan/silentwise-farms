'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Building2, RefreshCw, ShoppingCart, TrendingDown, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateRangeFields } from '@/components/filters/date-range-fields';
import { PPENav } from '@/components/ppe/ppe-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiData } from '@/hooks/use-api-data';
import {
  FINANCIAL_YEAR_START_MONTH,
  getFinancialYearStart,
  isBeforeStockTracking,
  PPE_STOCK_TRACKING_START,
} from '@/lib/constants/ppe';
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency, formatDisplayDate, formatQuantity } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PPEReport } from '@/types/database';

const CHART_SERIES = [
  { key: 'Purchased', name: 'Purchased', color: '#16a34a' },
  { key: 'Deducted', name: 'Deducted from employees', color: '#2563eb' },
  { key: 'ChargedToGrowers', name: 'Charged to growers', color: '#ea580c' },
] as const;

export default function PPEReportPage() {
  const [startDate, setStartDate] = useState<Date>(() => getFinancialYearStart(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => new Date());

  const url = useMemo(() => {
    if (startDate > endDate) return null;
    const params = new URLSearchParams({
      startDate: toDateOnlyFromDateParts(startDate),
      endDate: toDateOnlyFromDateParts(endDate),
    });
    return `/api/ppe/report?${params}`;
  }, [startDate, endDate]);
  const { data: report, isLoading, error, reload } = useApiData<PPEReport | null>(url, null);

  const chartData = useMemo(
    () =>
      (report?.months ?? []).map((month) => ({
        ...month,
        label: format(new Date(Number(month.Month.slice(0, 4)), Number(month.Month.slice(5, 7)) - 1, 1), 'MMM yy'),
      })),
    [report]
  );

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">PPE</h1>
          <Button onClick={reload} disabled={isLoading} size="sm" variant="outline" className="h-8 px-2 sm:h-10 sm:px-4">
            <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
            Refresh
          </Button>
        </div>

        <PPENav />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <DateRangeFields
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Button
            variant="outline"
            onClick={() => {
              setStartDate(getFinancialYearStart(new Date()));
              setEndDate(new Date());
            }}
          >
            Financial year to date
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          The financial year starts on {format(new Date(2000, FINANCIAL_YEAR_START_MONTH - 1, 1), 'd MMMM')}. Purchases and grower charges exclude VAT; employee deductions have no VAT.
        </p>

        {isBeforeStockTracking(startDate) && (
          <div className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Supplier invoices and grower charges are only captured from {formatDisplayDate(PPE_STOCK_TRACKING_START)}.
              Employee deductions go back to 2021, so before that date the report shows deductions without matching
              purchase costs. Don&apos;t read the earlier period as profit.
            </span>
          </div>
        )}

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          report && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <StatCard label="Purchased" value={formatCurrency(report.summary.Purchased)} icon={ShoppingCart} accent="text-green-600" />
                <StatCard label="Deducted from employees" value={formatCurrency(report.summary.Deducted)} icon={Wallet} accent="text-blue-600" />
                <StatCard label="Charged to growers" value={formatCurrency(report.summary.ChargedToGrowers)} icon={Building2} accent="text-orange-600" />
                <StatCard
                  label="Net cost to business"
                  value={formatCurrency(report.summary.NetCost)}
                  icon={TrendingDown}
                  accent={report.summary.NetCost > 0 ? 'text-red-600' : 'text-green-600'}
                />
              </div>
              <p className="mb-4 sm:mb-6 -mt-2 text-xs text-muted-foreground">
                Net cost = purchased − deducted from employees − charged to growers. A negative net cost means more was
                recovered than spent.
              </p>

              <Card className="bg-white shadow-md mb-4 sm:mb-6">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">By Item</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {report.items.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No PPE purchased or issued in this period.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty Purchased</TableHead>
                          <TableHead className="text-right">Purchase Cost</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Avg Unit Cost</TableHead>
                          <TableHead className="text-right">Qty Issued</TableHead>
                          <TableHead className="text-right">Deducted</TableHead>
                          <TableHead className="text-right" title="Deducted minus the cost of the issued items at the average unit cost">
                            Difference
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.items.map((row) => (
                          <TableRow key={row.PPE_Item_ID ?? 'unknown'}>
                            <TableCell className="py-1.5 font-medium">
                              {row.PPE_Item_ID === null ? (
                                <span className="text-amber-700">No item recorded</span>
                              ) : (
                                row.PPE_Item || 'Unnamed item'
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-right">{formatQuantity(row.QtyPurchased)}</TableCell>
                            <TableCell className="py-1.5 text-right">{formatCurrency(row.PurchaseCost)}</TableCell>
                            <TableCell className="py-1.5 text-right hidden md:table-cell">
                              {row.AverageUnitCost == null ? '-' : formatCurrency(row.AverageUnitCost)}
                            </TableCell>
                            <TableCell className="py-1.5 text-right">{formatQuantity(row.QtyIssued)}</TableCell>
                            <TableCell className="py-1.5 text-right">{formatCurrency(row.AmountDeducted)}</TableCell>
                            <TableCell
                              className={cn(
                                'py-1.5 text-right font-medium',
                                row.Difference != null && row.Difference < 0 && 'text-red-600'
                              )}
                            >
                              {row.Difference == null ? '-' : formatCurrency(row.Difference)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                    Difference = deducted − (qty issued × average unit cost), shown only where the item was purchased in
                    this period. Negative means employees were charged less than the items cost.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md mb-4 sm:mb-6">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Charged to Growers</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {report.growers.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No grower charges in this period.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grower</TableHead>
                          <TableHead className="text-right">Charges</TableHead>
                          <TableHead className="text-right">Amount excl VAT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.growers.map((row) => (
                          <TableRow key={row.Grower_ID}>
                            <TableCell className="py-1.5 font-medium">{row.GrowerName || 'Unnamed Grower'}</TableCell>
                            <TableCell className="py-1.5 text-right">{row.ChargeCount}</TableCell>
                            <TableCell className="py-1.5 text-right">{formatCurrency(row.Amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {chartData.length > 0 && (
                <Card className="bg-white shadow-md">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">By Month</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px] p-2 sm:p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(value: number) => `R${formatQuantity(value)}`} width={80} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        {CHART_SERIES.map((series) => (
                          <Bar key={series.key} dataKey={series.key} name={series.name} fill={series.color} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
