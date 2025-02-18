"use client";

// Import UI components and utilities
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useData } from '@/lib/contexts/data-context';

// Type definitions for form data
interface Employee {
  ID: number;
  Employee: string;
}

interface Grower {
  ID: number;
  GrowerName: string;
  HrsPerDay: number | null;
}

interface HourFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: any;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

// Zod schema for form validation
const formSchema = z.object({
  Work_Date: z.date({
    required_error: "A date is required",
  }).nullable(),
  Hours_Worked: z.number({
    required_error: "Hours worked is required",
  }).min(0, "Hours must be 0 or greater").max(24, "Hours cannot exceed 24"),
  Employee_ID_FK: z.number({
    required_error: "An employee must be selected",
  }).min(1, "Please select an employee"),
  Grower_ID: z.number({
    required_error: "A grower must be selected",
  }).min(1, "Please select a grower"),
  Overtime: z.number().min(0).max(24).nullable().optional(),
  PHoliday: z.number().min(0).max(24).nullable().optional(),
  Sick_Leave: z.number().min(0).max(24).nullable().optional(),
  Emp_Rate: z.number().nullable().optional(),
  Con_Tot: z.number().nullable().optional(),
  Man_Fee: z.number().nullable().optional(),
});

// Type inference from schema
type FormData = z.infer<typeof formSchema>;

// Field-specific prop types for form controls
interface DateFieldProps extends ControllerRenderProps<FormData, "Work_Date"> {}
interface NumberFieldProps extends ControllerRenderProps<FormData, "Hours_Worked" | "Overtime" | "PHoliday" | "Sick_Leave" | "Emp_Rate" | "Con_Tot" | "Man_Fee"> {}
interface SelectFieldProps extends ControllerRenderProps<FormData, "Employee_ID_FK" | "Grower_ID"> {}

export function HourFormDialog({ open, onClose, initialData, mode, onSuccess }: HourFormDialogProps) {
  const { toast } = useToast();
  const { employees, growers, isLoading: isLoadingData, error } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastUsedValues, setLastUsedValues] = useState<{
    Work_Date: Date;
    Grower_ID: number;
    Hours_Worked: number;
  } | null>(null);
  const [isQuickMode, setIsQuickMode] = useState(false);

  // Default values for new records
  const defaultValues = useMemo(() => ({
    Work_Date: lastUsedValues?.Work_Date || new Date(),
    Hours_Worked: lastUsedValues?.Hours_Worked || 0,
    Employee_ID_FK: 0,
    Grower_ID: lastUsedValues?.Grower_ID || 0,
    Overtime: 0,
    PHoliday: 0,
    Sick_Leave: 0
  }), [lastUsedValues]);

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
      Sick_Leave: initialData.Sick_Leave ?? 0
    } : defaultValues,
  });

  // Reset form when dialog opens/closes or when defaultValues change
  useEffect(() => {
    if (!open) return;
    
    if (mode === 'edit' && initialData) {
      form.reset({
        Work_Date: initialData.Work_Date ? new Date(initialData.Work_Date) : new Date(),
        Hours_Worked: initialData.Hours_Worked ?? 0,
        Employee_ID_FK: initialData.Employee_ID_FK ?? 0,
        Grower_ID: initialData.Grower_ID ?? 0,
        Overtime: initialData.Overtime ?? 0,
        PHoliday: initialData.PHoliday ?? 0,
        Sick_Leave: initialData.Sick_Leave ?? 0
      });
    } else {
      // For new records, reset everything
      form.reset({
        Work_Date: new Date(),
        Hours_Worked: 0,
        Employee_ID_FK: 0,
        Grower_ID: 0,
        Overtime: 0,
        PHoliday: 0,
        Sick_Leave: 0
      });
      setLastUsedValues(null);
    }
    // Always start in normal mode when opening the dialog
    setIsQuickMode(false);
  }, [open, mode, initialData, form]);

  // Update Hours_Worked when Grower is selected
  const updateHoursWorked = useCallback((growerId: number) => {
    const selectedGrower = growers.find(g => g.ID === growerId);
    if (selectedGrower?.HrsPerDay != null) {
      form.setValue('Hours_Worked', selectedGrower.HrsPerDay);
    }
  }, [growers, form]);

  useEffect(() => {
    const growerId = form.getValues('Grower_ID');
    if (growerId) {
      updateHoursWorked(growerId);
    }
  }, [form.watch('Grower_ID'), updateHoursWorked]);

  // Format employees and growers for Combobox
  const employeeOptions = useMemo(() => 
    employees.map(emp => ({
      value: emp.ID.toString(),
      label: emp.Employee || 'Unnamed Employee',
    }))
  , [employees]);

  const growerOptions = useMemo(() => 
    growers.map(grower => ({
      value: grower.ID.toString(),
      label: grower.GrowerName || 'Unnamed Grower',
    }))
  , [growers]);

  // Handle dialog close
  const handleClose = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  // Handle form submission
  async function onSubmit(values: FormData, action: 'save' | 'save_and_new' = 'save') {
    try {
      setIsSubmitting(true);
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save hour record: ${errorText}`);
      }

      console.log('Successfully saved hour record');
      toast({
        title: "Success",
        description: `Successfully ${mode === 'create' ? 'created' : 'updated'} hour record`,
      });

      // Store last used values for quick mode
      if (mode === 'create') {
        setLastUsedValues({
          Work_Date: values.Work_Date || new Date(),
          Grower_ID: values.Grower_ID,
          Hours_Worked: values.Hours_Worked
        });
      }

      if (onSuccess) {
        onSuccess();
      }

      if (action === 'save_and_new') {
        // Reset only the employee field, keeping other values
        form.reset({
          ...values,
          Employee_ID_FK: 0,
          Hours_Worked: values.Hours_Worked // Explicitly keep the Hours_Worked value
        });
        // Focus the employee field
        const employeeInput = document.querySelector('[name="Employee_ID_FK"]');
        if (employeeInput) {
          (employeeInput as HTMLElement).focus();
        }
      } else {
        handleClose();
      }
    } catch (error) {
      console.error('Error saving hour record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save hour record',
      });
    } finally {
      setIsSubmitting(false);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Hours Record' : 'Edit Hours Record'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? (
              <div className="flex items-center justify-between">
                <span>Add a new hours record for an employee.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickMode(!isQuickMode)}
                  className="ml-2"
                >
                  {isQuickMode ? 'Normal Mode' : 'Quick Mode'}
                </Button>
              </div>
            ) : (
              'Edit hours record for an employee.'
            )}
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
          <LoadingSpinner />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => onSubmit(data, 'save'))} className="space-y-4">
              {/* Date picker field - Only show in normal mode or edit mode */}
              {(!isQuickMode || mode === 'edit') && (
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
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="bg-white rounded-md border shadow-md" style={{ pointerEvents: 'auto' }}>
                                <Calendar
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  className="rounded-md"
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
              )}

              {/* Grower select field - Only show in normal mode or edit mode */}
              {(!isQuickMode || mode === 'edit') && (
                <FormField
                  control={form.control}
                  name="Grower_ID"
                  render={({ field }: { field: SelectFieldProps }) => (
                    <FormItem>
                      <FormLabel>Grower *</FormLabel>
                      <FormControl>
                        <div className="[&_[cmdk-group]]:px-0">
                          <Combobox
                            options={growerOptions}
                            value={field.value?.toString()}
                            onValueChange={(value: string) => {
                              field.onChange(parseInt(value));
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Employee select field */}
              <FormField
                control={form.control}
                name="Employee_ID_FK"
                render={({ field }: { field: SelectFieldProps }) => (
                  <FormItem>
                    <FormLabel>Employee *</FormLabel>
                    <FormControl>
                      <div className="[&_[cmdk-group]]:px-0">
                        <Combobox
                          options={employeeOptions}
                          value={field.value?.toString()}
                          onValueChange={(value: string) => {
                            field.onChange(parseInt(value));
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hours worked input field - Only show in normal mode or edit mode */}
              {(!isQuickMode || mode === 'edit') && (
                <FormField
                  control={form.control}
                  name="Hours_Worked"
                  render={({ field }: { field: NumberFieldProps }) => (
                    <FormItem>
                      <FormLabel>Hours *</FormLabel>
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
              )}

              {/* Other fields - Only show in normal mode or edit mode */}
              {(!isQuickMode || mode === 'edit') && (
                <>
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
                </>
              )}

              {/* Form action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={handleClose}>
                  Cancel
                </Button>
                {mode === 'create' && isQuickMode && (
                  <Button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => form.handleSubmit((data) => onSubmit(data, 'save_and_new'))()}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save & Add Another'
                    )}
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    mode === 'create' ? 'Add Record' : 'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
} 