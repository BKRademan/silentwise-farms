import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { addDays, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';

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
  const [growers, setGrowers] = React.useState<{ value: string; label: string }[]>([]);
  const [employees, setEmployees] = React.useState<{ value: string; label: string }[]>([]);
  const [startDate, setStartDate] = React.useState<Date>();
  const [endDate, setEndDate] = React.useState<Date>();
  const [selectedGrowerId, setSelectedGrowerId] = React.useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");

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

  // Fetch growers and employees on component mount
  React.useEffect(() => {
    console.log('🔄 Initializing filters component, fetching options...');
    
    const fetchOptions = async () => {
      try {
        // First fetch growers
        console.log('🔄 Fetching growers...');
        const growersResponse = await fetch('/api/growers');
        if (!growersResponse.ok) throw new Error('Failed to fetch growers');
        const growersData = await growersResponse.json();
        
        const formattedGrowerOptions = growersData.map((grower: { ID: number; GrowerName: string }) => ({
          value: grower.ID.toString(),
          label: grower.GrowerName || 'Unnamed Grower',
        }));
        console.log('✅ Successfully fetched growers:', formattedGrowerOptions.length, 'growers');
        setGrowers(formattedGrowerOptions);
        
        // Then fetch employees after growers are fetched
        console.log('🔄 Fetching employees...');
        const employeesResponse = await fetch('/api/employees');
        if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
        const employeesData = await employeesResponse.json();
        
        const formattedEmployeeOptions = employeesData.map((employee: { ID: number; Employee: string }) => ({
          value: employee.ID.toString(),
          label: employee.Employee || 'Unnamed Employee',
        }));
        console.log('✅ Successfully fetched employees:', formattedEmployeeOptions.length, 'employees');
        setEmployees(formattedEmployeeOptions);
      } catch (error) {
        console.error('❌ Error fetching options:', error);
      }
    };

    fetchOptions();
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
            options={growers}
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
            options={employees}
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