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
import { requireSouthAfricaDateOnly } from '@/lib/date-time/south-africa';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle } from 'lucide-react';

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
  const { toast } = useToast();
  const [startDate, setStartDate] = React.useState<Date>();
  const [endDate, setEndDate] = React.useState<Date>();
  const isRangeInverted = Boolean(startDate && endDate && startDate > endDate);
  const [selectedGrowerId, setSelectedGrowerId] = React.useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");

  // Format employees and growers for Combobox
  const employeeOptions = React.useMemo(() => 
    employees.map(emp => ({
      value: emp.ID.toString(),
      label: emp.EmplNo || 'Unnamed Employee',
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
    
    if (newFilters.startDate) {
      params.set('startDate', requireSouthAfricaDateOnly(newFilters.startDate, 'startDate'));
    } else {
      params.delete('startDate');
    }
    
    if (newFilters.endDate) {
      params.set('endDate', requireSouthAfricaDateOnly(newFilters.endDate, 'endDate'));
    } else {
      params.delete('endDate');
    }
    
    // Handle grower and employee IDs
    if (newFilters.growerId) {
      params.set('growerId', newFilters.growerId);
    } else {
      params.delete('growerId');
    }
    
    // Special handling for employeeId
    if (newFilters.employeeId === "all") {
      // For "all" we'll use a special parameter to indicate all employees
      params.set('allEmployees', 'true');
      params.delete('employeeId');
    } else if (newFilters.employeeId) {
      params.set('employeeId', newFilters.employeeId);
      params.delete('allEmployees');
    } else {
      params.delete('employeeId');
      params.delete('allEmployees');
    }
    
    // Update URL and notify parent
    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl);
    onFiltersChange(newFilters);
  }, [searchParams, router, pathname, onFiltersChange]);

  function warnIfRangeInverted(start: Date | undefined, end: Date | undefined) {
    if (start && end && start > end) {
      toast({
        variant: 'destructive',
        title: 'Invalid date range',
        description: `Start date (${format(start, 'PPP')}) is after end date (${format(end, 'PPP')}). This will return no records — adjust one of the dates before refreshing.`,
      });
    }
  }

  function handleStartDateSelect(date: Date | undefined) {
    if (!date) return;

    setStartDate(date);
    warnIfRangeInverted(date, endDate);

    updateFilters({
      startDate: requireSouthAfricaDateOnly(date, 'startDate'),
      endDate: endDate ? requireSouthAfricaDateOnly(endDate, 'endDate') : undefined,
      growerId: selectedGrowerId || undefined,
      employeeId: selectedEmployeeId || undefined
    });
  }

  function handleEndDateSelect(date: Date | undefined) {
    if (!date) return;

    setEndDate(date);
    warnIfRangeInverted(startDate, date);

    updateFilters({
      startDate: startDate ? requireSouthAfricaDateOnly(startDate, 'startDate') : undefined,
      endDate: requireSouthAfricaDateOnly(date, 'endDate'),
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
                  !startDate && 'text-muted-foreground',
                  isRangeInverted && 'border-red-500 text-red-600'
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
                onSelect={handleStartDateSelect}
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
                  !endDate && 'text-muted-foreground',
                  isRangeInverted && 'border-red-500 text-red-600'
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
                onSelect={handleEndDateSelect}
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
                startDate: startDate ? requireSouthAfricaDateOnly(startDate, 'startDate') : undefined,
                endDate: endDate ? requireSouthAfricaDateOnly(endDate, 'endDate') : undefined,
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
                startDate: startDate ? requireSouthAfricaDateOnly(startDate, 'startDate') : undefined,
                endDate: endDate ? requireSouthAfricaDateOnly(endDate, 'endDate') : undefined,
                growerId: selectedGrowerId || undefined,
                employeeId: value || undefined
              });
            }}
            placeholder="Select Employee"
            enableSelectAll={true}
          />
        </div>
      </div>
      {isRangeInverted && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Start date is after end date — this will return no records. Adjust one of the dates before refreshing.</span>
        </div>
      )}
    </div>
  );
} 