'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, User, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Employee {
  ID: number;
  EmplNo: string | null;
  fullName: string;
  knownAs: string | null;
  BankName: string | null;
  BranchCode: string | null;
  AccHolder: string | null;
  BankAccNo: string | null;
}

export default function EmployeeBankDetailsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchEmployee() {
      try {
        const res = await fetch(`/api/employees/${params.id}`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch employee: ${res.status}`);
        }
        
        const data = await res.json();
        setEmployee(data);
      } catch (err) {
        console.error('Error fetching employee details:', err);
        setError('Unable to load employee details. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchEmployee();
  }, [params.id]);

  const handleBack = () => {
    // Set a flag that we're navigating back
    sessionStorage.setItem('isNavigatingBack', 'true');
    
    // Use Next.js router for navigation
    router.back();
    
    // Safety fallback - if we're still on this page after a delay, 
    // it means router.back() didn't work (likely first page in history)
    setTimeout(() => {
      if (typeof window !== 'undefined' && 
          window.location.pathname.includes(`/employees/${params.id}/bank-details`)) {
        router.push('/employees');
      }
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <Button 
          onClick={handleBack}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-10">
        <p>Employee not found</p>
        <Button 
          onClick={handleBack}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          onClick={handleBack}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>
      </div>
      
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Employee Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Employee Number</p>
              <p className="text-lg font-medium">{employee.EmplNo || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg font-medium">{employee.fullName}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <span>Bank Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
              <p className="text-lg font-medium">{employee.BankName || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branch Code</p>
              <p className="text-lg font-medium">{employee.BranchCode || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Holder</p>
              <p className="text-lg font-medium">{employee.AccHolder || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Number</p>
              <p className="text-lg font-medium">{employee.BankAccNo || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 