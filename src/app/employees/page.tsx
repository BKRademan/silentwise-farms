'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subMonths, isAfter } from 'date-fns';
import { Search, User, Filter, CheckSquare, Square, CreditCard, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Employee {
  ID: number;
  EmplNo: string | null;
  FirstName: string | null;
  LastName: string | null;
  fullName: string;
  knownAs: string | null;
  IDNumber: string | null;
  RATE: number | null;
  lastWorkedDate: Date | null;
  BankName?: string | null;
  BranchCode?: string | null;
  AccHolder?: string | null;
  BankAccNo?: string | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showOnlyDuplicateIDs, setShowOnlyDuplicateIDs] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const employeesRes = await fetch('/api/employees');
        
        if (!employeesRes.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const employeesData = await employeesRes.json();
        console.log('Employee data received:', employeesData);
        
        // Sort employees by ID (lowest to highest) by default
        const sortedEmployees = employeesData.sort((a: Employee, b: Employee) => a.ID - b.ID);
        
        setEmployees(sortedEmployees);
        setFilteredEmployees(sortedEmployees);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Add logic to find duplicate ID numbers
  const duplicateIDNumbers = useMemo(() => {
    // Count occurrences of each IDNumber
    const idCounts = employees.reduce((counts, employee) => {
      // Only count non-empty ID numbers
      if (employee.IDNumber) {
        counts[employee.IDNumber] = (counts[employee.IDNumber] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Return IDNumbers that appear more than once
    return Object.keys(idCounts).filter(id => idCounts[id] > 1);
  }, [employees]);

  // Function to check if an employee has a duplicate IDNumber
  const hasDuplicateIDNumber = (employee: Employee) => {
    return employee.IDNumber && duplicateIDNumbers.includes(employee.IDNumber);
  };

  // Update filtered employees when searchTerm, showOnlyAvailable, or showOnlyDuplicateIDs changes
  useEffect(() => {
    let filtered = employees;
    
    // Filter by search term if provided
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.fullName?.toLowerCase().includes(lowerSearch) ||
        emp.IDNumber?.toLowerCase().includes(lowerSearch) ||
        emp.EmplNo?.toLowerCase().includes(lowerSearch) ||
        emp.knownAs?.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Apply duplicate ID filter if enabled
    if (showOnlyDuplicateIDs) {
      filtered = filtered.filter(emp => hasDuplicateIDNumber(emp));
      
      // Sort by IDNumber when showing duplicates
      filtered = [...filtered].sort((a, b) => {
        // Handle null or undefined ID numbers
        const idA = a.IDNumber || '';
        const idB = b.IDNumber || '';
        return idA.localeCompare(idB);
      });
    } 
    // Apply availability filter if enabled (and duplicate filter is not)
    else if (showOnlyAvailable) {
      filtered = filtered.filter(emp => {
        // Must have no ID Number
        const hasNoIDNumber = !emp.IDNumber;
        
        // AND either has no last worked date OR it's older than 2 months
        const hasNeverWorked = !emp.lastWorkedDate;
        const hasOldWorkDate = emp.lastWorkedDate ? isOlderThanTwoMonths(emp.lastWorkedDate) : false;
        
        return hasNoIDNumber && (hasNeverWorked || hasOldWorkDate);
      });
      
      // Sort by ID when not showing duplicates
      filtered = [...filtered].sort((a, b) => a.ID - b.ID);
    }
    // Otherwise just sort by ID (default)
    else {
      filtered = [...filtered].sort((a, b) => a.ID - b.ID);
    }
    
    setFilteredEmployees(filtered);
  }, [searchTerm, employees, showOnlyAvailable, showOnlyDuplicateIDs, duplicateIDNumbers]);

  // Function to check if a date is older than 2 months
  const isOlderThanTwoMonths = (date: Date | null): boolean => {
    if (!date) return false;
    const twoMonthsAgo = subMonths(new Date(), 2);
    return !isAfter(new Date(date), twoMonthsAgo);
  };

  const handleViewBankDetails = (id: number) => {
    // Save current scroll position to sessionStorage before navigation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('employeesPageScrollPos', window.scrollY.toString());
      console.log('Saved scroll position:', window.scrollY);
    }
    router.push(`/employees/${id}/bank-details`);
  };

  // Replace the restore scroll useEffect
  useEffect(() => {
    // Only attempt to restore scroll position after data is loaded
    if (typeof window !== 'undefined' && !loading && employees.length > 0) {
      // Check if we're navigating back from the bank details page
      const isNavigatingBack = sessionStorage.getItem('isNavigatingBack') === 'true';
      if (isNavigatingBack) {
        // Clear the flag
        sessionStorage.removeItem('isNavigatingBack');
        
        // Restore scroll position
        const savedPosition = sessionStorage.getItem('employeesPageScrollPos');
        if (savedPosition) {
          console.log('Restoring scroll to:', savedPosition);
          
          // Restore scroll with a short delay to ensure DOM is ready
          setTimeout(() => {
            window.scrollTo({
              top: parseInt(savedPosition),
              behavior: 'instant' // Use 'instant' for immediate positioning
            });
          }, 50);
        }
      }
    }
  }, [loading, employees]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or ID..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button 
          onClick={() => {
            setShowOnlyAvailable(!showOnlyAvailable);
            if (!showOnlyAvailable) setShowOnlyDuplicateIDs(false); // Disable duplicate filter when enabling available
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 transition-colors ${showOnlyAvailable ? 'border-primary' : ''}`}
        >
          {showOnlyAvailable ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5" />
          )}
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Show only available employees</span>
          </span>
        </button>

        <button 
          onClick={() => {
            setShowOnlyDuplicateIDs(!showOnlyDuplicateIDs);
            if (!showOnlyDuplicateIDs) setShowOnlyAvailable(false); // Disable available filter when enabling duplicates
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 transition-colors ${showOnlyDuplicateIDs ? 'border-primary' : ''}`}
        >
          {showOnlyDuplicateIDs ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5" />
          )}
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span>Show only duplicate ID numbers</span>
          </span>
        </button>
      </div>

      {/* Legend for highlighted rows */}
      <div className="flex flex-col gap-2 p-3 border rounded-md bg-white">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span className="text-sm font-medium text-gray-700">Highlighted employees are available (no ID number assigned)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block font-bold text-red-600 w-auto">21 Nov 2023</span>
          <span className="text-sm font-medium text-gray-700">Bold red dates indicate last worked date older than 2 months</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-orange-800 border border-orange-900 rounded"></div>
          <span className="text-sm font-medium text-gray-700">Dark orange highlights indicate duplicate ID numbers</span>
        </div>
      </div>

      {/* Employees Table - Desktop view */}
      <div className="hidden md:block overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-24">EmplNo</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Known As</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead className="w-24">Rate</TableHead>
              <TableHead>Last Worked</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map(employee => {
                // Ensure fullName is displayed with a fallback
                const firstName = employee.FirstName || '';
                const lastName = employee.LastName || '';
                const fullName = employee.fullName || 
                  (firstName || lastName ? `${firstName} ${lastName}`.trim() : '-');
                  
                // Check for various conditions
                const hasNoIDNumber = !employee.IDNumber;
                const isOldLastWorkedDate = isOlderThanTwoMonths(employee.lastWorkedDate);
                const isDuplicateID = hasDuplicateIDNumber(employee);
                
                // Determine row class based on priority
                let rowClass = "";
                if (isDuplicateID) {
                  rowClass = "bg-orange-800 text-white hover:bg-orange-800";
                } else if (hasNoIDNumber) {
                  rowClass = "bg-yellow-50 hover:bg-yellow-50";
                }
                  
                return (
                  <TableRow 
                    key={employee.ID}
                    className={rowClass}
                  >
                    <TableCell className="font-medium">{employee.ID}</TableCell>
                    <TableCell>{employee.EmplNo || '-'}</TableCell>
                    <TableCell>{fullName}</TableCell>
                    <TableCell>{employee.knownAs || '-'}</TableCell>
                    <TableCell>{employee.IDNumber || '-'}</TableCell>
                    <TableCell>{employee.RATE?.toFixed(2) || '-'}</TableCell>
                    <TableCell 
                      className={isOldLastWorkedDate ? "font-bold text-red-600" : ""}
                    >
                      {employee.lastWorkedDate 
                        ? format(new Date(employee.lastWorkedDate), 'dd MMM yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewBankDetails(employee.ID)}
                        className="flex items-center gap-1"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Bank</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Employees List - Mobile view */}
      <div className="md:hidden space-y-4">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map(employee => {
            // Ensure fullName is displayed with a fallback
            const firstName = employee.FirstName || '';
            const lastName = employee.LastName || '';
            const fullName = employee.fullName || 
              (firstName || lastName ? `${firstName} ${lastName}`.trim() : '-');
              
            // Check for various conditions
            const hasNoIDNumber = !employee.IDNumber;
            const isOldLastWorkedDate = isOlderThanTwoMonths(employee.lastWorkedDate);
            const isDuplicateID = hasDuplicateIDNumber(employee);
            
            // Determine card class based on priority
            let cardClass = "overflow-hidden";
            if (isDuplicateID) {
              cardClass += " bg-orange-800 text-white";
            } else if (hasNoIDNumber) {
              cardClass += " bg-yellow-50";
            }
              
            return (
              <Card 
                key={employee.ID} 
                className={cardClass}
              >
                <CardContent className="p-0">
                  <div className={`px-4 py-2 flex justify-between items-center ${isDuplicateID ? 'bg-orange-900' : 'bg-muted'}`}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{employee.EmplNo || '-'}</span>
                    </div>
                    <span className={`text-sm ${isDuplicateID ? 'text-gray-200' : 'text-muted-foreground'}`}>ID: {employee.ID}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isDuplicateID ? 'text-gray-200' : 'text-muted-foreground'}`}>Full Name</span>
                      <span>{fullName}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isDuplicateID ? 'text-gray-200' : 'text-muted-foreground'}`}>Known As</span>
                        <span>{employee.knownAs || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isDuplicateID ? 'text-gray-200' : 'text-muted-foreground'}`}>Rate</span>
                        <span>{employee.RATE?.toFixed(2) || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isDuplicateID ? 'text-gray-200' : 'text-muted-foreground'}`}>ID Number</span>
                      <span>{employee.IDNumber || '-'}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isDuplicateID ? 'text-gray-200' : 'text-muted-foreground'}`}>Last Worked</span>
                      <span className={isOldLastWorkedDate ? "font-bold text-red-600" : ""}>
                        {employee.lastWorkedDate 
                          ? format(new Date(employee.lastWorkedDate), 'dd MMM yyyy')
                          : 'Never'}
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t mt-2">
                      <Button
                        variant={isDuplicateID ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleViewBankDetails(employee.ID)}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>View Bank Details</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No employees found.</p>
          </div>
        )}
      </div>
    </div>
  );
} 