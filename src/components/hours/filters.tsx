import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { useData } from '@/lib/contexts/data-context';
import { useCallback } from 'react';

interface FiltersProps {
  onFiltersChange: (filters: {
    startDate?: string;
    endDate?: string;
    growerId?: string;
    employeeId?: string;
  }) => void;
}

export function Filters({ onFiltersChange }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { employees, growers } = useData();
  const [startDate, setStartDate] = React.useState<Date>();
  const [endDate, setEndDate] = React.useState<Date>();
  const [selectedGrowerId, setSelectedGrowerId] = React.useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");

  // Format employees and growers for Combobox
  const employeeOptions = React.useMemo(() => 
    employees.map(emp => ({
      value: emp.ID.toString(),
      label: emp.Employee || 'Unnamed Employee',
    }))
  , [employees]);

  const growerOptions = React.useMemo(() => 
    growers.map(grower => ({
      value: grower.ID.toString(),
      label: grower.GrowerName || 'Unnamed Grower',
    }))
  , [growers]);

  // Update URL and trigger parent callback when filters change
  const updateFilters = useCallback((newFilters: { 
    startDate?: string; 
    endDate?: string; 
    growerId?: string; 
    employeeId?: string; 
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Convert dates to UTC start/end of day
    if (newFilters.startDate) {
      const start = new Date(newFilters.startDate);
      const utcStart = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
      params.set('startDate', utcStart.toISOString());
    } else {
      params.delete('startDate');
    }
    
    if (newFilters.endDate) {
      const end = new Date(newFilters.endDate);
      const utcEnd = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate() + 1));
      params.set('endDate', utcEnd.toISOString());
    } else {
      params.delete('endDate');
    }
    
    // Handle grower and employee IDs
    if (newFilters.growerId) {
      params.set('growerId', newFilters.growerId);
    } else {
      params.delete('growerId');
    }
    
    if (newFilters.employeeId) {
      params.set('employeeId', newFilters.employeeId);
    } else {
      params.delete('employeeId');
    }
    
    // Update URL and notify parent
    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl);
    onFiltersChange(newFilters);
  }, [searchParams, router, pathname, onFiltersChange]);

  // In date selection handlers:
  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    updateFilters({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      growerId: selectedGrowerId || undefined,
      employeeId: selectedEmployeeId || undefined
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
        <div className="col-span-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Start Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  handleDateSelect(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="col-span-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>End Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                  handleDateSelect(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="col-span-1">
          <Combobox
            options={growerOptions}
            value={selectedGrowerId}
            onValueChange={(value: string) => {
              setSelectedGrowerId(value);
              updateFilters({
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                growerId: value || undefined,
                employeeId: selectedEmployeeId || undefined
              });
            }}
            placeholder="Select Grower"
          />
        </div>

        <div className="col-span-1">
          <Combobox
            options={employeeOptions}
            value={selectedEmployeeId}
            onValueChange={(value: string) => {
              setSelectedEmployeeId(value);
              updateFilters({
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                growerId: selectedGrowerId || undefined,
                employeeId: value || undefined
              });
            }}
            placeholder="Select Employee"
          />
        </div>
      </div>
    </div>
  );
} 