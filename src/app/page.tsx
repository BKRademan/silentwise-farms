"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Maximize2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  format,
  isBefore,
  lastDayOfMonth,
  setDay,
  startOfDay,
  subMonths,
  subWeeks,
} from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from '@/lib/contexts/data-context';
import type { Grower, HourRecord } from "@/types/database";

interface DashboardStats {
  hours: {
    periodStart: Date;
    periodEnd: Date;
    comparisonStart: Date;
    comparisonEnd: Date;
    chartData: DailyEmployeeCount[];
    totalEmployeesWorked: number;
    comparisonTotalEmployeesWorked: number;
    growerDifferences: GrowerEmployeeDifference[];
  };
}

interface DailyEmployeeCount {
  date: string;
  currentDate: string;
  comparisonDate: string;
  currentEmployees: number;
  comparisonEmployees: number;
  currentGrowers: GrowerBreakdown[];
  comparisonGrowers: GrowerBreakdown[];
}

interface GrowerBreakdown {
  growerName: string;
  employees: number;
}

interface GrowerEmployeeDifference {
  growerName: string;
  currentEmployees: number;
  comparisonEmployees: number;
  difference: number;
}

// Function to get the payroll period start marker for a month:
// the Tuesday before that month's last Friday.
function getPeriodStartForMonth(date: Date): Date {
  const lastDay = lastDayOfMonth(date);
  // Find last Friday (5 = Friday)
  let lastFriday = setDay(lastDay, 5);
  
  // If the last Friday is after the last day of the month, go back a week
  if (isBefore(lastDay, lastFriday)) {
    lastFriday = addWeeks(lastFriday, -1);
  }
  
  // Get the Tuesday before this Friday (2 = Tuesday)
  let lastTuesday = setDay(lastFriday, 2);
  
  // If the Tuesday is after the Friday, go back a week
  if (isBefore(lastFriday, lastTuesday)) {
    lastTuesday = addWeeks(lastTuesday, -1);
  }
  
  return startOfDay(lastTuesday);
}

function getPayrollPeriod(referenceDate: Date) {
  const periodStart = getPeriodStartForMonth(subMonths(referenceDate, 1));
  const nextPeriodStart = getPeriodStartForMonth(referenceDate);
  return {
    periodStart,
    periodEnd: endOfDay(addDays(nextPeriodStart, -1)),
  };
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [growers, setGrowers] = useState<Grower[]>([]);
  const [selectedGrowerId, setSelectedGrowerId] = useState('all');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [fullscreenChart, setFullscreenChart] = useState<'daily' | 'grower' | null>(null);
  const [dailyChartType, setDailyChartType] = useState<'bar' | 'line'>('line');
  const { refreshData } = useData();
  const [stats, setStats] = useState<DashboardStats>({
    hours: {
      periodStart: new Date(),
      periodEnd: new Date(),
      comparisonStart: subWeeks(new Date(), 52),
      comparisonEnd: subWeeks(new Date(), 52),
      chartData: [],
      totalEmployeesWorked: 0,
      comparisonTotalEmployeesWorked: 0,
      growerDifferences: [],
    }
  });

  const fetchGrowers = useCallback(async () => {
    try {
      const response = await fetch('/api/growers');
      const data = await response.json();
      setGrowers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching growers:', error);
    }
  }, []);

  const buildHoursUrl = (startDate: Date, endDate: Date) => {
    const params = new URLSearchParams({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    });
    if (selectedGrowerId !== 'all') {
      params.set('growerId', selectedGrowerId);
    }
    return `/api/hours?${params.toString()}`;
  };

  const employeeKey = (record: HourRecord): string | null => {
    if (record.Employee_ID_FK != null) return String(record.Employee_ID_FK);
    return record.Employee;
  };

  const growerKey = (record: HourRecord): string => {
    if (record.Grower_ID != null) return String(record.Grower_ID);
    return record.GrowerName ?? 'unknown';
  };

  const growerName = (record: HourRecord): string => {
    if (record.GrowerName) return record.GrowerName;
    if (record.Grower_ID != null) return `Grower ${record.Grower_ID}`;
    return 'Unknown grower';
  };

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const periodReferenceDate = addMonths(new Date(), periodOffset);
      const { periodStart, periodEnd } = getPayrollPeriod(periodReferenceDate);
      const comparisonStart = subWeeks(periodStart, 52);
      const comparisonEnd = subWeeks(periodEnd, 52);
      
      console.log('📅 Fetching hours for period:', {
        periodStart: format(periodStart, 'yyyy-MM-dd'),
        periodEnd: format(periodEnd, 'yyyy-MM-dd'),
        comparisonStart: format(comparisonStart, 'yyyy-MM-dd'),
        comparisonEnd: format(comparisonEnd, 'yyyy-MM-dd'),
        selectedGrowerId,
        periodOffset,
      });
      
      const [hoursResponse, comparisonResponse] = await Promise.all([
        fetch(buildHoursUrl(periodStart, periodEnd)),
        fetch(buildHoursUrl(comparisonStart, comparisonEnd)),
      ]);
      const hoursData = await hoursResponse.json();
      const comparisonData = await comparisonResponse.json();
      const currentRecords = (hoursData.data ?? []) as HourRecord[];
      const comparisonRecords = (comparisonData.data ?? []) as HourRecord[];
      
      const currentDays = eachDayOfInterval({ start: periodStart, end: endOfDay(periodEnd) });
      const currentDailyCounts = new Map<string, Set<string>>();
      const comparisonDailyCounts = new Map<string, Set<string>>();
      const currentDailyGrowerCounts = new Map<string, Map<string, { growerName: string; employees: Set<string> }>>();
      const comparisonDailyGrowerCounts = new Map<string, Map<string, { growerName: string; employees: Set<string> }>>();

      currentDays.forEach((date, index) => {
        const currentDate = format(date, 'yyyy-MM-dd');
        const comparisonDate = format(addDays(comparisonStart, index), 'yyyy-MM-dd');
        currentDailyCounts.set(currentDate, new Set<string>());
        comparisonDailyCounts.set(comparisonDate, new Set<string>());
        currentDailyGrowerCounts.set(currentDate, new Map<string, { growerName: string; employees: Set<string> }>());
        comparisonDailyGrowerCounts.set(comparisonDate, new Map<string, { growerName: string; employees: Set<string> }>());
      });

      const addDailyGrowerEmployee = (
        map: Map<string, Map<string, { growerName: string; employees: Set<string> }>>,
        date: string,
        record: HourRecord,
        employee: string
      ) => {
        const dayGrowers = map.get(date);
        if (!dayGrowers) return;
        const key = growerKey(record);
        if (!dayGrowers.has(key)) {
          dayGrowers.set(key, { growerName: growerName(record), employees: new Set<string>() });
        }
        dayGrowers.get(key)?.employees.add(employee);
      };

      const toGrowerBreakdown = (
        dayGrowers: Map<string, { growerName: string; employees: Set<string> }> | undefined
      ): GrowerBreakdown[] =>
        Array.from(dayGrowers?.values() ?? [])
          .map((grower) => ({
            growerName: grower.growerName,
            employees: grower.employees.size,
          }))
          .filter((grower) => grower.employees > 0)
          .sort((a, b) => b.employees - a.employees || a.growerName.localeCompare(b.growerName));

      currentRecords.forEach((record) => {
        const key = employeeKey(record);
        if (!key || !record.Work_Date) return;
        const date = format(new Date(record.Work_Date), 'yyyy-MM-dd');
        currentDailyCounts.get(date)?.add(key);
        addDailyGrowerEmployee(currentDailyGrowerCounts, date, record, key);
      });

      comparisonRecords.forEach((record) => {
        const key = employeeKey(record);
        if (!key || !record.Work_Date) return;
        const date = format(new Date(record.Work_Date), 'yyyy-MM-dd');
        comparisonDailyCounts.get(date)?.add(key);
        addDailyGrowerEmployee(comparisonDailyGrowerCounts, date, record, key);
      });

      const allChartDays = currentDays.map((date, index) => {
        const currentDate = format(date, 'yyyy-MM-dd');
        const comparisonDate = format(addDays(comparisonStart, index), 'yyyy-MM-dd');
        return {
          date: format(date, 'MMM d'),
          currentDate,
          comparisonDate,
          currentEmployees: currentDailyCounts.get(currentDate)?.size ?? 0,
          comparisonEmployees: comparisonDailyCounts.get(comparisonDate)?.size ?? 0,
          currentGrowers: toGrowerBreakdown(currentDailyGrowerCounts.get(currentDate)),
          comparisonGrowers: toGrowerBreakdown(comparisonDailyGrowerCounts.get(comparisonDate)),
        };
      });
      let lastCurrentEmployeeDayIndex = -1;
      for (let index = allChartDays.length - 1; index >= 0; index--) {
        if (allChartDays[index].currentEmployees > 0) {
          lastCurrentEmployeeDayIndex = index;
          break;
        }
      }
      const chartData =
        lastCurrentEmployeeDayIndex >= 0
          ? allChartDays
              .slice(0, lastCurrentEmployeeDayIndex + 1)
              .filter((day) => day.currentEmployees > 0 || day.comparisonEmployees > 0)
          : [];
      const currentVisibleDates = new Set(chartData.map((day) => day.currentDate));
      const comparisonVisibleDates = new Set(chartData.map((day) => day.comparisonDate));
      const currentEmployeesInChart = new Set<string>();
      const comparisonEmployeesInChart = new Set<string>();
      const currentGrowerEmployees = new Map<string, { growerName: string; employees: Set<string> }>();
      const comparisonGrowerEmployees = new Map<string, { growerName: string; employees: Set<string> }>();

      const addGrowerEmployee = (
        map: Map<string, { growerName: string; employees: Set<string> }>,
        record: HourRecord,
        employee: string
      ) => {
        const key = growerKey(record);
        if (!map.has(key)) {
          map.set(key, { growerName: growerName(record), employees: new Set<string>() });
        }
        map.get(key)?.employees.add(employee);
      };

      currentRecords.forEach((record) => {
        const key = employeeKey(record);
        if (!key || !record.Work_Date) return;
        const date = format(new Date(record.Work_Date), 'yyyy-MM-dd');
        if (!currentVisibleDates.has(date)) return;
        currentEmployeesInChart.add(key);
        addGrowerEmployee(currentGrowerEmployees, record, key);
      });

      comparisonRecords.forEach((record) => {
        const key = employeeKey(record);
        if (!key || !record.Work_Date) return;
        const date = format(new Date(record.Work_Date), 'yyyy-MM-dd');
        if (!comparisonVisibleDates.has(date)) return;
        comparisonEmployeesInChart.add(key);
        addGrowerEmployee(comparisonGrowerEmployees, record, key);
      });

      const growerDifferences = Array.from(
        new Set([
          ...Array.from(currentGrowerEmployees.keys()),
          ...Array.from(comparisonGrowerEmployees.keys()),
        ])
      )
        .map((key) => {
          const current = currentGrowerEmployees.get(key);
          const comparison = comparisonGrowerEmployees.get(key);
          const currentEmployees = current?.employees.size ?? 0;
          const comparisonEmployees = comparison?.employees.size ?? 0;
          return {
            growerName: current?.growerName ?? comparison?.growerName ?? 'Unknown grower',
            currentEmployees,
            comparisonEmployees,
            difference: comparisonEmployees - currentEmployees,
          };
        })
        .filter((grower) => grower.currentEmployees > 0 || grower.comparisonEmployees > 0)
        .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

      setStats({
        hours: {
          periodStart,
          periodEnd,
          comparisonStart,
          comparisonEnd,
          chartData,
          totalEmployeesWorked: currentEmployeesInChart.size,
          comparisonTotalEmployeesWorked: comparisonEmployeesInChart.size,
          growerDifferences,
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGrowerId, periodOffset]);

  useEffect(() => {
    fetchGrowers();
  }, [fetchGrowers]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const dailyChartTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as DailyEmployeeCount;
    const renderBreakdown = (items: GrowerBreakdown[]) => {
      if (items.length === 0) {
        return <p className="text-xs text-muted-foreground">No growers with employees</p>;
      }
      return (
        <div className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.growerName} className="flex items-center justify-between gap-4 text-xs">
              <span className="max-w-[220px] truncate text-muted-foreground">{item.growerName}</span>
              <span className="font-medium text-foreground">{item.employees}</span>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="w-[320px] rounded-lg border bg-white p-3 shadow-sm">
        <p className="text-sm font-medium">{format(new Date(row.currentDate), 'EEE, MMM d, yyyy')}</p>
        <div className="mt-2 rounded-md bg-blue-50/70 p-2">
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Current total</span>
            <span className="font-semibold">{row.currentEmployees}</span>
          </div>
          {renderBreakdown(row.currentGrowers)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Compared to {format(new Date(row.comparisonDate), 'EEE, MMM d, yyyy')}
        </p>
        <div className="mt-2 rounded-md bg-slate-50 p-2">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <span>Last year total</span>
            <span className="font-semibold">{row.comparisonEmployees}</span>
          </div>
          {renderBreakdown(row.comparisonGrowers)}
        </div>
      </div>
    );
  };

  const dailyChartAxes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="date"
        tickLine={false}
        tickMargin={16}
        axisLine={false}
        angle={-35}
        textAnchor="end"
        height={64}
        stroke="hsl(var(--muted-foreground))"
      />
      <YAxis
        allowDecimals={false}
        tickLine={false}
        tickMargin={10}
        axisLine={false}
        stroke="hsl(var(--muted-foreground))"
      />
      <Tooltip
        cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }}
        content={dailyChartTooltip}
      />
      <Legend verticalAlign="top" height={36} />
    </>
  );

  const renderDailyChart = (isFullscreen = false) => (
    <ResponsiveContainer width="100%" height="100%">
      {dailyChartType === 'bar' ? (
        <BarChart
          data={stats.hours.chartData}
          margin={{ top: 12, right: isFullscreen ? 32 : 24, left: isFullscreen ? 12 : 0, bottom: isFullscreen ? 52 : 40 }}
        >
          {dailyChartAxes}
          <Bar
            dataKey="currentEmployees"
            name="Current period"
            fill="#2563eb"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="comparisonEmployees"
            name="Last year aligned"
            fill="#94a3b8"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      ) : (
        <LineChart
          data={stats.hours.chartData}
          margin={{ top: 12, right: isFullscreen ? 32 : 24, left: isFullscreen ? 12 : 0, bottom: isFullscreen ? 52 : 40 }}
        >
          {dailyChartAxes}
          <Line
            type="monotone"
            dataKey="currentEmployees"
            name="Current period"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="comparisonEmployees"
            name="Last year aligned"
            stroke="#94a3b8"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/90 p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5" />
            <span>{format(new Date(), 'EEEE, MMMM d')}</span>
          </div>
          <h1 className="text-4xl font-bold">
            Good {format(new Date(), 'a') === 'am' ? 'morning' : 'afternoon'},
            <span className="text-primary"> Admin</span>
          </h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={async () => {
            try {
              console.log('🔄 Starting data refresh...');
              
              console.log('1️⃣ Refreshing employees and growers data...');
              await refreshData();
              console.log('✅ Successfully refreshed employees and growers data');
              
              console.log('2️⃣ Refreshing dashboard stats...');
              await fetchDashboardStats();
              console.log('✅ Successfully refreshed dashboard stats');
              
              console.log('🎉 Refresh complete!');
            } catch (error) {
              console.error('❌ Error during refresh:', error);
            }
          }}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="w-full bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Employees Worked Per Day</CardTitle>
                <CardDescription className="text-sm">
                  {isLoading 
                    ? "Loading period..." 
                    : `${format(stats.hours.periodStart, 'MMM d')} - ${format(stats.hours.periodEnd, 'MMM d, yyyy')}`
                  }
                  {' '}compared with weekday-aligned last year
                  {!isLoading && (
                    <>
                      {' '}
                      ({format(stats.hours.comparisonStart, 'MMM d')} - {format(stats.hours.comparisonEnd, 'MMM d, yyyy')})
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex rounded-md border bg-background p-1">
                  <Button
                    type="button"
                    variant={dailyChartType === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDailyChartType('bar')}
                    className="h-8 px-3"
                  >
                    Bar
                  </Button>
                  <Button
                    type="button"
                    variant={dailyChartType === 'line' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDailyChartType('line')}
                    className="h-8 px-3"
                  >
                    Line
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenChart('daily')}
                  disabled={isLoading || stats.hours.chartData.length === 0}
                  className="whitespace-nowrap"
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Full Screen
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous period"
                    onClick={() => setPeriodOffset((offset) => offset - 1)}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPeriodOffset(0)}
                    disabled={isLoading || periodOffset === 0}
                    className="whitespace-nowrap"
                  >
                    Current Period
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next period"
                    onClick={() => setPeriodOffset((offset) => Math.min(offset + 1, 0))}
                    disabled={isLoading || periodOffset === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={selectedGrowerId} onValueChange={setSelectedGrowerId}>
                  <SelectTrigger className="w-full sm:w-[260px]">
                    <SelectValue placeholder="Select grower" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All growers</SelectItem>
                    {growers.map((grower) => (
                      <SelectItem key={grower.ID} value={String(grower.ID)}>
                        {grower.GrowerName ?? `Grower ${grower.ID}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button asChild variant="outline">
                  <Link href="/hours">View Hours</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-blue-50/60 p-3">
                <p className="text-sm text-muted-foreground">Current chart dates unique employees</p>
                <p className="text-2xl font-bold text-blue-700">
                  {isLoading ? '...' : stats.hours.totalEmployeesWorked}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <p className="text-sm text-muted-foreground">Last year aligned chart dates unique employees</p>
                <p className="text-2xl font-bold text-slate-700">
                  {isLoading ? '...' : stats.hours.comparisonTotalEmployeesWorked}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-[420px] items-center justify-center">
                <p className="text-muted-foreground">Loading employee counts...</p>
              </div>
            ) : stats.hours.chartData.length > 0 ? (
              <div className="h-[420px] w-full">
                {renderDailyChart()}
              </div>
            ) : (
              <div className="flex h-[420px] items-center justify-center">
                <p className="text-muted-foreground">No hours data available for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Grower Employee Difference</CardTitle>
                <CardDescription className="text-sm">
                  Growers ranked by the biggest unique employee differences, using only the dates shown in the chart above.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFullscreenChart('grower')}
                disabled={isLoading || stats.hours.growerDifferences.filter((grower) => grower.difference !== 0).length === 0}
                className="whitespace-nowrap"
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Full Screen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-muted-foreground">Loading grower comparison...</p>
              </div>
            ) : stats.hours.growerDifferences.filter((grower) => grower.difference !== 0).length > 0 ? (
              <div
                className="w-full"
                style={{
                  height: Math.max(
                    280,
                    stats.hours.growerDifferences.filter((grower) => grower.difference !== 0).length * 44 + 80
                  ),
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.hours.growerDifferences.filter((grower) => grower.difference !== 0)}
                    layout="vertical"
                    margin={{ top: 12, right: 28, left: 24, bottom: 12 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="category"
                      dataKey="growerName"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      width={180}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as GrowerEmployeeDifference;
                        return (
                          <div className="rounded-lg border bg-white p-3 shadow-sm">
                            <p className="text-sm font-medium">{row.growerName}</p>
                            <p className="text-sm text-blue-700">
                              Current: <span className="font-semibold">{row.currentEmployees}</span> employees
                            </p>
                            <p className="text-sm text-slate-700">
                              Last year: <span className="font-semibold">{row.comparisonEmployees}</span> employees
                            </p>
                            <p className={row.difference > 0 ? "mt-1 text-sm text-amber-700" : "mt-1 text-sm text-emerald-700"}>
                              {row.difference > 0 ? 'More last year' : 'More this year'}:{' '}
                              <span className="font-semibold">{Math.abs(row.difference)}</span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="difference"
                      name="Difference (last year - current)"
                      radius={[0, 8, 8, 0]}
                    >
                      {stats.hours.growerDifferences
                        .filter((grower) => grower.difference !== 0)
                        .map((grower) => (
                          <Cell
                            key={grower.growerName}
                            fill={grower.difference > 0 ? '#f59e0b' : '#10b981'}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-muted-foreground">
                  No grower has a difference between current and last year for the visible chart dates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={fullscreenChart === 'daily'}
        onOpenChange={(open) => setFullscreenChart(open ? 'daily' : null)}
      >
        <DialogContent className="h-[94vh] max-w-[96vw] p-6">
          <div className="flex flex-col gap-4 pr-10 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader>
              <DialogTitle>Employees Worked Per Day</DialogTitle>
              <DialogDescription>
                {format(stats.hours.periodStart, 'MMM d')} - {format(stats.hours.periodEnd, 'MMM d, yyyy')} compared with weekday-aligned last year.
              </DialogDescription>
            </DialogHeader>
            <div className="flex rounded-md border bg-background p-1">
              <Button
                type="button"
                variant={dailyChartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDailyChartType('bar')}
                className="h-8 px-3"
              >
                Bar
              </Button>
              <Button
                type="button"
                variant={dailyChartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDailyChartType('line')}
                className="h-8 px-3"
              >
                Line
              </Button>
            </div>
          </div>
          <div className="h-[calc(94vh-130px)] w-full">
            {renderDailyChart(true)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fullscreenChart === 'grower'}
        onOpenChange={(open) => setFullscreenChart(open ? 'grower' : null)}
      >
        <DialogContent className="h-[94vh] max-w-[96vw] p-6">
          <DialogHeader>
            <DialogTitle>Grower Employee Difference</DialogTitle>
            <DialogDescription>
              Positive values mean more unique employees last year; negative values mean more this year.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[calc(94vh-130px)] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.hours.growerDifferences.filter((grower) => grower.difference !== 0)}
                layout="vertical"
                margin={{ top: 12, right: 36, left: 48, bottom: 12 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  type="category"
                  dataKey="growerName"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={220}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as GrowerEmployeeDifference;
                    return (
                      <div className="rounded-lg border bg-white p-3 shadow-sm">
                        <p className="text-sm font-medium">{row.growerName}</p>
                        <p className="text-sm text-blue-700">
                          Current: <span className="font-semibold">{row.currentEmployees}</span> employees
                        </p>
                        <p className="text-sm text-slate-700">
                          Last year: <span className="font-semibold">{row.comparisonEmployees}</span> employees
                        </p>
                        <p className={row.difference > 0 ? "mt-1 text-sm text-amber-700" : "mt-1 text-sm text-emerald-700"}>
                          {row.difference > 0 ? 'More last year' : 'More this year'}:{' '}
                          <span className="font-semibold">{Math.abs(row.difference)}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="difference"
                  name="Difference (last year - current)"
                  radius={[0, 8, 8, 0]}
                >
                  {stats.hours.growerDifferences
                    .filter((grower) => grower.difference !== 0)
                    .map((grower) => (
                      <Cell
                        key={grower.growerName}
                        fill={grower.difference > 0 ? '#f59e0b' : '#10b981'}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 