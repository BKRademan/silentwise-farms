'use client';

import { EmployeeCaptureForm } from '@/components/employees/employee-capture-form';

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <EmployeeCaptureForm mode="create" />
    </div>
  );
}
