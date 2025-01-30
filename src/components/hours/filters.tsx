import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { addDays, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { useData } from '@/lib/contexts/data-context';

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

  // Clear all filters on mount
  React.useEffect(() => {
    console.log('🧹 Clearing all filters on mount');
    const params = new URLSearchParams();
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    
    // Reset all state
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedGrowerId("");
    setSelectedEmployeeId("");
    
    // Notify parent of cleared filters
    onFiltersChange({});
  }, []);

  // Update URL and trigger parent callback when filters change
  const updateFilters = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      console.log('🔄 Updating filters:', updates);
      const params = new URLSearchParams(searchParams);
      
      // First, get all current params
      const currentParams = Array.from(params.entries()).reduce((acc, [key]) => {
        acc.add(key);
        return acc;
      }, new Set<string>());

      // Remove any params that are being updated
      Object.keys(updates).forEach(key => {
        if (currentParams.has(key)) {
          params.delete(key);
        }
      });

      // Only add params that have actual values
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.set(key, value);
        }
      });

      const newUrl = `${pathname}?${params.toString()}`;
      console.log('🔄 Updating URL to:', newUrl);
      
      // Only include non-empty values in the filters
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      router.push(newUrl);
      onFiltersChange(cleanUpdates);
    },
    [pathname, router, searchParams, onFiltersChange]
  );

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
                  console.log('📅 Start date selected:', date);
                  setStartDate(date);
                  updateFilters({
                    startDate: date ? format(date, 'yyyy-MM-dd') : undefined,
                  });
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
                  console.log('📅 End date selected:', date);
                  setEndDate(date);
                  updateFilters({
                    endDate: date ? format(date, 'yyyy-MM-dd') : undefined,
                  });
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
              console.log('👨‍🌾 Grower selected:', value);
              setSelectedGrowerId(value);
              updateFilters({ growerId: value || undefined });
            }}
            placeholder="Select Grower"
          />
        </div>

        <div className="col-span-1">
          <Combobox
            options={employeeOptions}
            value={selectedEmployeeId}
            onValueChange={(value: string) => {
              console.log('👤 Employee selected:', value);
              setSelectedEmployeeId(value);
              updateFilters({ employeeId: value || undefined });
            }}
            placeholder="Select Employee"
          />
        </div>
      </div>
    </div>
  );
} 