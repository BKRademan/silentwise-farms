'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { employeeCaptureBodySchema } from '@/lib/validations/employee-capture';
import {
  PAY_METHODS,
  BANK_ACC_TYPES,
  BANK_NAMES,
  ACC_RELATIONSHIPS,
  branchCodeForBankName,
} from '@/lib/constants/bankDetails';
import {
  computeTaxYearStartDateOnly,
} from '@/lib/employee/derived-fields';
import type { Employee } from '@/types/database';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
] as const;
/** EMA-aligned title codes — matches `TITLE` in `@/lib/validations/employee-capture` */
const TITLE_OPTIONS = [
  { value: 'MR', label: 'MR' },
  { value: 'MISS', label: 'MISS' },
  { value: 'MRS', label: 'MRS' },
  { value: 'MS', label: 'MS' },
  { value: 'DR', label: 'DR' },
  { value: 'PROF', label: 'PROF' },
  { value: 'REV', label: 'REV' },
] as const;
const ETHNIC_OPTIONS = [
  { value: 'A', label: 'African' },
  { value: 'C', label: 'Coloured' },
  { value: 'W', label: 'White' },
  { value: 'I', label: 'Indian' },
  { value: 'B', label: 'Black' },
] as const;
const formSchema = employeeCaptureBodySchema;
type FormValues = z.infer<typeof formSchema>;

const COMPUTED_FIELD_KEYS = new Set([
  'Language',
  'MaritalStatus',
  'BusinessNUmber',
  'TaxStatus',
  'UIFStatus',
  'NewUIFStartDate',
  'HrsPerPeriod',
  'HoursPerDay',
  'WorkAddressCode',
  'RepAddr1',
  'RepAddr2',
  'RepAddr3',
  'RepPostCode',
  'ResidentialCountry',
  'LinkPostalTo',
  'FullNames',
]);

function toOptionDisplayValue(
  value: string | null | undefined,
  options: readonly { value: string; label: string }[]
): string {
  if (!value) return '';
  const exact = options.find((option) => option.value === value);
  if (exact) return exact.value;
  const byCode = options.find((option) => option.value.startsWith(`${value}.`));
  return byCode?.value ?? value;
}

function toDateInput(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10);
  }
  try {
    return format(new Date(v as string), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function buildDefaults(
  mode: 'create' | 'edit',
  initial?: Partial<Employee> | null
): Partial<FormValues> {
  if (mode === 'create' || !initial) {
    return {
      EmplNo: '',
      FirstName: '',
      LastName: '',
      Initials: '',
      SecondName: '',
      knownAs: '',
      Title: '',
      IDNumber: '',
      DateOfBirth: '',
      DateEngaged: '',
      LastDateWorked: '',
      EthnicGroup: '',
      Gender: '',
      CellNumber: '',
      AlternativeNumber: '',
      TaxNumber: '',
      TaxYearStart: '',
      UIFEndDate: '',
      PayMethod: '03.Electronic Payment',
      BankAccType: 'S.Savings',
      BankAccNo: '',
      BranchCode: '',
      BankName: '',
      AccHolder: '',
      AccRelationship: 'O.Own',
      ResUnit: '',
      ResComplex: '',
      ResStreetNo: '',
      ResStreetName: '',
      ResSuburb: '',
      ResCity: '',
      ResPostCode: '',
      RATE: undefined,
      Date_Registered: '',
    };
  }

  const e = initial;
  return {
    EmplNo: e.EmplNo ?? '',
    FirstName: e.FirstName ?? '',
    LastName: e.LastName ?? '',
    Initials: e.Initials ?? '',
    SecondName: e.SecondName ?? '',
    knownAs: e.knownAs ?? '',
    Title: e.Title ?? '',
    IDNumber: e.IDNumber ?? '',
    DateOfBirth: toDateInput(e.DateOfBirth),
    DateEngaged: toDateInput(e.DateEngaged),
    LastDateWorked: toDateInput(e.LastDateWorked),
    EthnicGroup: e.EthnicGroup ?? '',
    Gender: e.Gender ?? '',
    CellNumber: e.CellNumber ?? '',
    AlternativeNumber: e.AlternativeNumber ?? '',
    TaxNumber: e.TaxNumber ?? '',
    TaxYearStart: toDateInput(e.TaxYearStart),
    UIFEndDate: toDateInput(e.UIFEndDate),
    PayMethod: toOptionDisplayValue(e.PayMethod, PAY_METHODS),
    BankAccType: toOptionDisplayValue(e.BankAccType, BANK_ACC_TYPES),
    BankAccNo: e.BankAccNo ?? '',
    BranchCode: e.BranchCode ?? '',
    BankName: e.BankName ?? '',
    AccHolder: e.AccHolder ?? '',
    AccRelationship: toOptionDisplayValue(e.AccRelationship, ACC_RELATIONSHIPS),
    ResUnit: e.ResUnit ?? '',
    ResComplex: e.ResComplex ?? '',
    ResStreetNo: e.ResStreetNo ?? '',
    ResStreetName: e.ResStreetName ?? '',
    ResSuburb: e.ResSuburb ?? '',
    ResCity: e.ResCity ?? '',
    ResPostCode: e.ResPostCode ?? '',
    RATE: e.RATE ?? undefined,
    Date_Registered: toDateInput(e.Date_Registered),
  };
}

function stripEmpty<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === undefined) continue;
    if (typeof v === 'number' && Number.isNaN(v)) continue;
    out[k] = v;
  }
  return out;
}

const SENTINEL_NONE = '__none__';

function stripSentinels<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === SENTINEL_NONE) continue;
    out[k] = v;
  }
  return out;
}

function stripComputedFields<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (COMPUTED_FIELD_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

interface EmployeeCaptureFormProps {
  mode: 'create' | 'edit';
  employeeId?: number;
  initialEmployee?: Partial<Employee> | null;
}

export function EmployeeCaptureForm({
  mode,
  employeeId,
  initialEmployee,
}: EmployeeCaptureFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const defaults = useMemo(
    () => buildDefaults(mode, initialEmployee ?? null),
    [mode, initialEmployee]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(buildDefaults(mode, initialEmployee ?? null));
  }, [mode, initialEmployee, form]);

  const dateEngaged = form.watch('DateEngaged');

  const preview = useMemo(() => {
    const taxYear = computeTaxYearStartDateOnly(dateEngaged ? dateEngaged : null);
    return {
      TaxYearStart: taxYear ?? '',
    };
  }, [dateEngaged]);

  async function onSubmit(values: FormValues) {
    if (mode === 'create') {
      if (!values.EmplNo?.trim() || !values.FirstName?.trim() || !values.LastName?.trim()) {
        toast({
          variant: 'destructive',
          title: 'Required fields',
          description: 'Employee number, first name, and last name are required.',
        });
        return;
      }
    }

    const payload = stripComputedFields(
      stripSentinels(
        stripEmpty({
          ...values,
          RATE:
            values.RATE === undefined || values.RATE === null
              ? undefined
              : Number(values.RATE),
        })
      )
    );

    try {
      if (mode === 'create') {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to create employee');
        }
        const id = json.data?.ID as number;
        toast({ title: 'Employee created' });
        router.push(`/employees/${id}/edit`);
        router.refresh();
        return;
      }

      if (!employeeId) return;
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to update employee');
      }
      toast({ title: 'Employee updated' });
      router.push('/employees');
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Request failed',
      });
    }
  }

  if (mode === 'edit' && !initialEmployee && employeeId) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Add employee' : 'Edit employee'}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/employees')}
            >
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="EmplNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee number *</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="IDNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID number (13 digits)</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={13} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="Title"
              render={({ field }) => {
                const raw = field.value?.trim().toUpperCase() ?? '';
                const titleSelectValue = TITLE_OPTIONS.some((t) => t.value === raw)
                  ? raw
                  : SENTINEL_NONE;
                return (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === SENTINEL_NONE ? '' : v)
                      }
                      value={titleSelectValue}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                        {TITLE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Names</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="Initials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initials</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="FirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name *</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="SecondName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Second name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="LastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name *</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="knownAs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Known as</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Personal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="DateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="Gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || SENTINEL_NONE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="EthnicGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ethnic group</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || SENTINEL_NONE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                      {ETHNIC_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label} ({g.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="CellNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cell number</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={10} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="AlternativeNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternative number</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={10} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Residential address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="ResUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ResComplex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complex</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ResStreetNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street no</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ResStreetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ResSuburb"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suburb</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ResCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ResPostCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Dates &amp; status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="Date_Registered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date registered</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="DateEngaged"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date engaged</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="LastDateWorked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last date worked</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Tax year start (derived)</FormLabel>
              <Input readOnly value={preview.TaxYearStart} className="bg-muted" />
            </FormItem>
            <FormField
              control={form.control}
              name="UIFEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UIF end date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Tax / UIF codes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="TaxNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax number</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Work</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="RATE"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? undefined : parseFloat(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Banking</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="PayMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={toOptionDisplayValue(field.value, PAY_METHODS)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAY_METHODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="BankAccType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={toOptionDisplayValue(field.value, BANK_ACC_TYPES)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BANK_ACC_TYPES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="BankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank name</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      if (v && v !== SENTINEL_NONE) {
                        const bc = branchCodeForBankName(v);
                        if (bc) form.setValue('BranchCode', bc);
                      }
                    }}
                    value={field.value || SENTINEL_NONE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                      {BANK_NAMES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="BranchCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="BankAccNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account number</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="AccHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account holder</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="AccRelationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account relationship</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={toOptionDisplayValue(field.value, ACC_RELATIONSHIPS)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACC_RELATIONSHIPS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
