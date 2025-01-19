'use client';

import { useEffect, useState } from 'react';
import { format, eachDayOfInterval, parseISO, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as BarChartIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyEmployeeCount {
  date: string;
  Employees: number;
}

export default function HoursAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DailyEmployeeCount[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const grower = searchParams.get('grower');
        const employee = searchParams.get('employee');

        if (!startDate || !endDate) {
          console.error('Missing date parameters');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/hours?${searchParams.toString()}`);
        const hoursData = await response.json();

        // Get all dates in the range
        const dateRange = eachDayOfInterval({
          start: parseISO(startDate),
          end: endOfDay(parseISO(endDate))
        });

        // Initialize map with all dates set to empty sets
        const dailyCounts = new Map<string, Set<string>>();
        dateRange.forEach(date => {
          dailyCounts.set(format(date, 'yyyy-MM-dd'), new Set<string>());
        });

        // Add employees to their respective dates, applying filters
        hoursData.data?.forEach((record: any) => {
          // Skip if grower filter is set and doesn't match
          if (grower && record.GrowerName !== grower) return;
          // Skip if employee filter is set and doesn't match
          if (employee && record.Employee !== employee) return;

          const date = format(new Date(record.Work_Date), 'yyyy-MM-dd');
          if (record.Employee) {
            dailyCounts.get(date)?.add(record.Employee);
          }
        });

        // Convert to array format for the chart
        const chartData = Array.from(dailyCounts.entries())
          .map(([date, employees]) => ({
            date: format(parseISO(date), 'MMM d'),
            fullDate: date,
            "Employees": employees.size
          }))
          .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
          .map(({ date, Employees }) => ({ date, Employees }));

        setData(chartData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [searchParams]);

  return (
    <main className="flex-1 w-full">
      <div className="flex flex-col w-full pl-1 pr-2.5 py-2 sm:py-6 bg-gray-50/90">
        <header className="flex items-center gap-4 mb-6 w-full">
          <Button asChild variant="ghost" size="sm">
            <Link href="/hours">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hours
            </Link>
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Hours Analytics</h1>
        </header>

        <Card className="w-full bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 w-full">
            <div className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <CardTitle className="text-xl">Daily Employee Count</CardTitle>
                {(searchParams.get('grower') || searchParams.get('employee')) && (
                  <p className="text-sm text-muted-foreground">
                    {searchParams.get('grower') && `Grower: ${searchParams.get('grower')}`}
                    {searchParams.get('grower') && searchParams.get('employee') && ' | '}
                    {searchParams.get('employee') && `Employee: ${searchParams.get('employee')}`}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="w-full">
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center w-full">
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            ) : data.length > 0 ? (
              <div className="h-[400px] mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data} 
                    margin={{ top: 10, right: 50, left: 50, bottom: 40 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      tickMargin={20}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-white p-2 shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">{payload[0].payload.date}</span>
                              <span className="font-bold text-blue-600">{payload[0].value} Employees</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar 
                      dataKey="Employees" 
                      fill="hsl(var(--blue-500, 217 91% 60%))"
                      radius={[12, 12, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">No data available for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 