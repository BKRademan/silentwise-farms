'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { BarChart } from '@tremor/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TremorProvider } from '@/components/tremor-provider';

interface DailyEmployeeCount {
  date: string;
  Employees: number;
}

export default function HoursAnalyticsPage() {
  const [data, setData] = useState<DailyEmployeeCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
          console.error('Missing date parameters');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/hours?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const records = await response.json();

        // Process data to get daily employee counts
        const dailyCounts = new Map<string, Set<string>>();
        records.forEach((record: any) => {
          const date = format(new Date(record.Date), 'yyyy-MM-dd');
          if (!dailyCounts.has(date)) {
            dailyCounts.set(date, new Set<string>());
          }
          dailyCounts.get(date)?.add(record.Employee);
        });

        // Convert to array and sort by date
        const chartData = Array.from(dailyCounts.entries())
          .map(([date, employees]) => ({
            date: format(new Date(date), 'MMM d'),
            Employees: employees.size,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(chartData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <TremorProvider>
      <div className="container mx-auto py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <Link href="/hours">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Hours Analytics</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Employee Count</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[350px] flex items-center justify-center">
                <p>Loading...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center">
                <p>No data available for the selected period.</p>
              </div>
            ) : (
              <div className="h-[350px]">
                <BarChart
                  data={data}
                  index="date"
                  categories={["Employees"]}
                  colors={["blue"]}
                  showAnimation
                  showLegend={false}
                  showGridLines
                  showXAxis
                  showYAxis
                  yAxisWidth={48}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TremorProvider>
  );
} 