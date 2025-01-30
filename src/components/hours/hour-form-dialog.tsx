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
import { useEffect, useState, useMemo } from "react";
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
  onSuccess?: () => void; // Add callback for successful operations
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

  // Default values for new records
  const defaultValues = {
    Work_Date: new Date(),
    Hours_Worked: 0,
    Employee_ID_FK: 0,
    Grower_ID: 0,
    Overtime: 0,
    PHoliday: 0,
    Sick_Leave: 0
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
      Sick_Leave: initialData.Sick_Leave ?? 0
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
          Sick_Leave: initialData.Sick_Leave ?? 0
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, mode, initialData, form]);

  // Update Hours_Worked when Grower is selected
  useEffect(() => {
    const selectedGrower = growers.find(g => g.ID === form.getValues('Grower_ID'));
    if (selectedGrower && selectedGrower.HrsPerDay !== null) {
      form.setValue('Hours_Worked', selectedGrower.HrsPerDay);
    }
  }, [form.watch('Grower_ID'), growers, form]);

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
  async function onSubmit(values: FormData) {
    try {
      setIsSubmitting(true);
      console.log('Submitting form with values:', values);
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

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
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
            Add a new hours record for an employee.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
          <LoadingSpinner />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            console.log('👤 Employee selected:', value);
                            field.onChange(parseInt(value));
                          }}
                          placeholder="Select Employee"
                        />
                      </div>
                    </FormControl>
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
                    <FormLabel>Grower *</FormLabel>
                    <FormControl>
                      <div className="[&_[cmdk-group]]:px-0">
                        <Combobox
                          options={growerOptions}
                          value={field.value?.toString()}
                          onValueChange={(value: string) => {
                            console.log('👨‍🌾 Grower selected:', value);
                            field.onChange(parseInt(value));
                          }}
                          placeholder="Select Grower"
                        />
                      </div>
                    </FormControl>
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