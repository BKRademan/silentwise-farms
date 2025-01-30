'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Grower } from '@/types/database';

interface DataContextType {
  employees: Employee[];
  growers: Grower[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [growers, setGrowers] = useState<Grower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch employees data
      const employeesResponse = await fetch('/api/employees');
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }
      const employeesData = await employeesResponse.json();
      setEmployees(employeesData || []);

      // Fetch growers data
      const growersResponse = await fetch('/api/growers');
      if (!growersResponse.ok) {
        throw new Error('Failed to fetch growers');
      }
      const growersData = await growersResponse.json();
      setGrowers(growersData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DataContext.Provider 
      value={{ 
        employees, 
        growers, 
        isLoading, 
        error,
        refreshData: fetchData 
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
} 