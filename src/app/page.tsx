"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Truck, HardHat, Calendar, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { startOfDay, endOfDay, format, lastDayOfMonth, subMonths, setDay, addWeeks, isBefore } from "date-fns";
import { useData } from '@/lib/contexts/data-context';

interface DashboardStats {
  hours: {
    periodStart: Date;
    periodEnd: Date;
    growerSummary: {
      growerName: string;
      uniqueEmployees: number;
    }[];
  };
  transport: {
    todayTrips: number;
    totalDistance: number;
  };
  ppe: {
    totalItems: number;
    lowStockItems: number;
  };
}

// Function to get last Tuesday before the last Friday of the month
function getLastTuesday(date: Date): Date {
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

// Function to get last Monday of a month
function getLastMonday(date: Date): Date {
  const lastDay = lastDayOfMonth(date);
  let lastMonday = setDay(lastDay, 1); // 1 = Monday
  
  // If the last Monday is after the last day of the month, go back a week
  if (isBefore(lastDay, lastMonday)) {
    lastMonday = addWeeks(lastMonday, -1);
  }
  
  return endOfDay(lastMonday);
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { refreshData } = useData();
  const [stats, setStats] = useState<DashboardStats>({
    hours: {
      periodStart: new Date(),
      periodEnd: new Date(),
      growerSummary: []
    },
    transport: { todayTrips: 0, totalDistance: 0 },
    ppe: { totalItems: 0, lowStockItems: 0 }
  });

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const lastMonth = subMonths(today, 1);
      const periodStart = getLastTuesday(lastMonth);
      const periodEnd = getLastMonday(today);
      
      console.log('📅 Fetching hours for period:', {
        periodStart: format(periodStart, 'yyyy-MM-dd'),
        periodEnd: format(periodEnd, 'yyyy-MM-dd')
      });
      
      // Fetch hours data for the period
      const hoursResponse = await fetch(
        `/api/hours?startDate=${format(periodStart, 'yyyy-MM-dd')}&endDate=${format(periodEnd, 'yyyy-MM-dd')}`
      );
      const hoursData = await hoursResponse.json();
      
      // Process hours data to get grower summary
      const growerMap = new Map<string, Set<string>>();
      
      hoursData.data?.forEach((record: any) => {
        if (!record.GrowerName) return;
        if (!growerMap.has(record.GrowerName)) {
          growerMap.set(record.GrowerName, new Set<string>());
        }
        if (record.Employee) {
          growerMap.get(record.GrowerName)?.add(record.Employee);
        }
      });

      const growerSummary = Array.from(growerMap.entries()).map(([growerName, employees]) => ({
        growerName,
        uniqueEmployees: employees.size
      })).sort((a, b) => b.uniqueEmployees - a.uniqueEmployees);

      // Fetch other data...
      const transportResponse = await fetch(
        `/api/transport?startDate=${format(today, 'yyyy-MM-dd')}&endDate=${format(today, 'yyyy-MM-dd')}`
      );
      const transportData = await transportResponse.json();
      
      const ppeResponse = await fetch('/api/ppe');
      const ppeData = await ppeResponse.json();
      
      const totalDistance = transportData.data?.reduce((acc: number, curr: any) => acc + (curr.KM || 0), 0) || 0;

      setStats({
        hours: {
          periodStart,
          periodEnd,
          growerSummary
        },
        transport: {
          todayTrips: transportData.data?.length || 0,
          totalDistance
        },
        ppe: {
          totalItems: ppeData.data?.length || 0,
          lowStockItems: ppeData.data?.filter((item: any) => item.PPE_Item_Value < 10).length || 0
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Hours Card */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Hours Overview</CardTitle>
                <CardDescription className="text-sm">
                  {isLoading 
                    ? "Loading period..." 
                    : `${format(stats.hours.periodStart, 'MMM d')} - ${format(stats.hours.periodEnd, 'MMM d, yyyy')}`
                  }
                </CardDescription>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-3 flex-1">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading grower summary...</div>
              ) : stats.hours.growerSummary.length > 0 ? (
                stats.hours.growerSummary.map((grower, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground truncate pr-2">
                      {grower.growerName}
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {grower.uniqueEmployees}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No data for this period</div>
              )}
            </div>
            <Button asChild className="w-full mt-6 bg-blue-500 hover:bg-blue-600">
              <Link href="/hours">View Details</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Transport Card */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Transport Overview</CardTitle>
                <CardDescription className="text-sm">Monitor transportation and logistics</CardDescription>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                <Truck className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm font-medium text-muted-foreground">Today's Trips</span>
                <span className="text-2xl font-bold text-orange-600">
                  {isLoading ? "..." : stats.transport.todayTrips}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Distance</span>
                <span className="text-2xl font-bold text-orange-600">
                  {isLoading ? "..." : `${stats.transport.totalDistance}km`}
                </span>
              </div>
            </div>
            <Button asChild variant="secondary" className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white">
              <Link href="/transport">View Details</Link>
            </Button>
          </CardContent>
        </Card>

        {/* PPE Card */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">PPE Overview</CardTitle>
                <CardDescription className="text-sm">Manage personal protective equipment</CardDescription>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <HardHat className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm font-medium text-muted-foreground">Total Items</span>
                <span className="text-2xl font-bold text-green-600">
                  {isLoading ? "..." : stats.ppe.totalItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Low Stock Items</span>
                <span className="text-2xl font-bold text-green-600">
                  {isLoading ? "..." : stats.ppe.lowStockItems}
                </span>
              </div>
            </div>
            <Button asChild variant="secondary" className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white">
              <Link href="/ppe">View Details</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 