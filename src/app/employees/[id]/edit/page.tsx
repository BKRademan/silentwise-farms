'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EmployeeCaptureForm } from '@/components/employees/employee-capture-form';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import type { Employee } from '@/types/database';

type EmployeeDetail = Partial<Employee> & {
  fullName?: string;
  lastWorkedDate?: Date | string | null;
};

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawId = params?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const employeeId = idStr ? parseInt(idStr, 10) : NaN;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Number.isNaN(employeeId)) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Invalid employee',
        description: 'The employee id in the URL is not valid.',
      });
      router.push('/employees');
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/employees/${employeeId}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast({
              variant: 'destructive',
              title: 'Not found',
              description: 'This employee could not be found.',
            });
            router.push('/employees');
            return;
          }
          throw new Error('Failed to load employee');
        }
        const data = (await res.json()) as EmployeeDetail;
        if (!cancelled) {
          setEmployee(data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load employee details.',
          });
          router.push('/employees');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, router, toast]);

  if (Number.isNaN(employeeId)) {
    return null;
  }

  if (loading || !employee) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeCaptureForm
        mode="edit"
        employeeId={employeeId}
        initialEmployee={employee}
      />
    </div>
  );
}
