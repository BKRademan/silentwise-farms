"use client";

// Import UI components and utilities
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { HourFormData, HourFormFields } from "@/types/hours";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FieldValues, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Type definitions for form data
interface Employee {
  ID: number;
  Employee: string;
}

interface Grower {
  ID: number;
  GrowerName: string;
}

interface HourFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: any;
  mode: 'create' | 'edit';
  onSuccess?: () => void; // Add callback for successful operations
}

// Zod schema for form validation
const formSchema = z.object({
  Work_Date: z.date({
    required_error: "A date is required",
  }),
  Hours_Worked: z.number().min(0).max(24),
  Employee_ID_FK: z.number(),
  Grower_ID: z.number(),
  Overtime: z.number().min(0).max(24).optional(),
  PHoliday: z.number().min(0).max(24).optional(),
  Sick_Leave: z.number().min(0).max(24).optional(),
  Emp_Rate: z.number().optional(),
  Con_Tot: z.number().optional(),
  Man_Fee: z.number().optional(),
});

// Type inference from schema
type FormData = z.infer<typeof formSchema>;

// Field-specific prop types for form controls
interface DateFieldProps extends ControllerRenderProps<FormData, "Work_Date"> {}
interface NumberFieldProps extends ControllerRenderProps<FormData, "Hours_Worked" | "Overtime" | "PHoliday" | "Sick_Leave" | "Emp_Rate" | "Con_Tot" | "Man_Fee"> {}
interface SelectFieldProps extends ControllerRenderProps<FormData, "Employee_ID_FK" | "Grower_ID"> {}

export function HourFormDialog({ open, onClose, initialData, mode, onSuccess }: HourFormDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [growers, setGrowers] = useState<Grower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default values for new records
  const defaultValues = {
    Work_Date: new Date(),
    Hours_Worked: 0,
    Employee_ID_FK: 0,
    Grower_ID: 0,
    Overtime: 0,
    PHoliday: 0,
    Sick_Leave: 0,
    Emp_Rate: 0,
    Con_Tot: 0,
    Man_Fee: 0,
  };

  // Initialize form with react-hook-form and zod validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: mode === 'edit' && initialData ? {
      Work_Date: initialData.Work_Date ? new Date(initialData.Work_Date) : new Date(),
      Hours_Worked: initialData.Hours_Worked ?? 0,
      Employee_ID_FK: initialData.Employee_ID_FK ?? 0,
      Grower_ID: initialData.Grower_ID ?? 0,
      Overtime: initialData.Overtime ?? 0,
      PHoliday: initialData.PHoliday ?? 0,
      Sick_Leave: initialData.Sick_Leave ?? 0,
      Emp_Rate: initialData.Emp_Rate ?? 0,
      Con_Tot: initialData.Con_Tot ?? 0,
      Man_Fee: initialData.Man_Fee ?? 0,
    } : defaultValues,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        form.reset({
          Work_Date: initialData.Work_Date ? new Date(initialData.Work_Date) : new Date(),
          Hours_Worked: initialData.Hours_Worked ?? 0,
          Employee_ID_FK: initialData.Employee_ID_FK ?? 0,
          Grower_ID: initialData.Grower_ID ?? 0,
          Overtime: initialData.Overtime ?? 0,
          PHoliday: initialData.PHoliday ?? 0,
          Sick_Leave: initialData.Sick_Leave ?? 0,
          Emp_Rate: initialData.Emp_Rate ?? 0,
          Con_Tot: initialData.Con_Tot ?? 0,
          Man_Fee: initialData.Man_Fee ?? 0,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, mode, initialData, form]);

  // Fetch employees and growers data when dialog opens
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch employees data
        const employeesResponse = await fetch('/api/employees');
        if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData || []);

        // Fetch growers data
        const growersResponse = await fetch('/api/growers');
        if (!growersResponse.ok) throw new Error('Failed to fetch growers');
        const growersData = await growersResponse.json();
        setGrowers(growersData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  // Handle dialog close
  const handleClose = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  // Handle form submission
  async function onSubmit(values: FormData) {
    try {
      const endpoint = '/api/hours';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { ...values, id: initialData?.ID } : values;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save hour record');

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
      // TODO: Add success toast notification
    } catch (error) {
      console.error('Error saving hour record:', error);
      // TODO: Add error toast notification
    }
  }

  // Show error dialog if data fetching fails
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-red-500">{error}</div>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Main form render
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] overflow-visible">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Hours Record' : 'Edit Hours Record'}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-visible">
              {/* Date picker field */}
              <FormField
                control={form.control}
                name="Work_Date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <div className="grid gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              type="button"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <div className="z-[9999] fixed">
                          <PopoverContent 
                            className="w-auto p-0" 
                            align="start"
                          >
                            <div 
                              className="bg-white rounded-md border shadow-md"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(date);
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                className="rounded-md"
                                classNames={{
                                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                  month: "space-y-4",
                                  caption: "flex justify-center pt-1 relative items-center",
                                  caption_label: "text-sm font-medium",
                                  nav: "space-x-1 flex items-center",
                                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 cursor-pointer",
                                  nav_button_previous: "absolute left-1",
                                  nav_button_next: "absolute right-1",
                                  table: "w-full border-collapse space-y-1",
                                  head_row: "flex",
                                  head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                                  row: "flex w-full mt-2",
                                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                  day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
                                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                  day_today: "bg-accent text-accent-foreground",
                                  day_outside: "text-muted-foreground opacity-50",
                                  day_disabled: "text-muted-foreground opacity-50",
                                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                  day_hidden: "invisible",
                                }}
                              />
                            </div>
                          </PopoverContent>
                        </div>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employee select field */}
              <FormField
                control={form.control}
                name="Employee_ID_FK"
                render={({ field }: { field: SelectFieldProps }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select 
                      onValueChange={(value: string) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem 
                            key={employee.ID} 
                            value={employee.ID.toString()}
                          >
                            {employee.Employee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Grower select field */}
              <FormField
                control={form.control}
                name="Grower_ID"
                render={({ field }: { field: SelectFieldProps }) => (
                  <FormItem>
                    <FormLabel>Grower</FormLabel>
                    <Select 
                      onValueChange={(value: string) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a grower" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {growers?.map((grower) => (
                          <SelectItem 
                            key={grower.ID} 
                            value={grower.ID.toString()}
                          >
                            {grower.GrowerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hours worked input field */}
              <FormField
                control={form.control}
                name="Hours_Worked"
                render={({ field }: { field: NumberFieldProps }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value?.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          field.onChange(parseFloat(e.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Overtime input field */}
              <FormField
                control={form.control}
                name="Overtime"
                render={({ field }: { field: NumberFieldProps }) => (
                  <FormItem>
                    <FormLabel>Overtime</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value?.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          field.onChange(parseFloat(e.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Public Holiday input field */}
              <FormField
                control={form.control}
                name="PHoliday"
                render={({ field }: { field: NumberFieldProps }) => (
                  <FormItem>
                    <FormLabel>Public Holiday</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value?.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          field.onChange(parseFloat(e.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sick Leave input field */}
              <FormField
                control={form.control}
                name="Sick_Leave"
                render={({ field }: { field: NumberFieldProps }) => (
                  <FormItem>
                    <FormLabel>Sick Leave</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value?.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          field.onChange(parseFloat(e.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {mode === 'create' ? 'Add Record' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
} 