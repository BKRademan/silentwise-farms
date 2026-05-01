'use client';

import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import { format, subMonths, isAfter } from 'date-fns';
import {
  Search,
  User,
  CheckSquare,
  Square,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Download,
  UserPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { AvailableEmployeeNumbers } from '@/components/employees/available-employee-numbers';
import { QuickAddEmployeeModal } from '@/components/employees/quick-add-employee-modal';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [companyNumber, setCompanyNumber] = useState('');
  const [exporting, setExporting] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const employeesRes = await fetch('/api/employees');

      if (!employeesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const employeesData = await employeesRes.json();
      const sortedEmployees = employeesData.sort((a: Employee, b: Employee) => a.ID - b.ID);

      setEmployees(sortedEmployees);
      setFilteredEmployees(sortedEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Could not load employees',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

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
        // Only filter by ID Number - ignore Last Worked Date
        return !emp.IDNumber;
      });
      
      // Sort by EmplNo instead of ID
      filtered = [...filtered].sort((a, b) => {
        const emplNoA = a.EmplNo || '';
        const emplNoB = b.EmplNo || '';
        return emplNoA.localeCompare(emplNoB);
      });
    }
    // Otherwise just sort by ID (default)
    else {
      filtered = [...filtered].sort((a, b) => {
        const emplNoA = a.EmplNo || '';
        const emplNoB = b.EmplNo || '';
        return emplNoA.localeCompare(emplNoB);
      });
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

  const handleEdit = (id: number) => {
    router.push(`/employees/${id}/edit`);
  };

  const handleExportDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCompanyNumber = companyNumber.trim();

    if (!trimmedCompanyNumber) {
      toast({
        variant: 'destructive',
        title: 'Company number required',
        description: 'Enter the company number before exporting.',
      });
      return;
    }

    setExporting(true);
    try {
      const res = await fetch(
        `/api/employees/export?company=${encodeURIComponent(trimmedCompanyNumber)}`
      );

      if (!res.ok) {
        let message = 'Failed to export employee details';
        try {
          const errorBody = await res.json();
          message = errorBody.error || message;
        } catch {
          // Keep the default message if the response is not JSON.
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const filename =
        contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] ??
        `employee-details-${trimmedCompanyNumber}.xlsx`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportDialogOpen(false);
      toast({
        title: 'Export downloaded',
        description: 'Employee details were exported for Excel.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not export employees',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExporting(false);
    }
  };

  const openDeleteDialog = (employee: Employee) => {
    setDeleteTarget(employee);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${deleteTarget.ID}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Delete failed');
      }
      toast({ title: 'Employee deleted' });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadEmployees();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Delete failed',
      });
    } finally {
      setDeleting(false);
    }
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

  // Handler for when an employee number is selected
  const handleSelectEmployeeNumber = (emplNo: string) => {
    // Set search term to the selected employee number
    setSearchTerm(emplNo);
  };

  // Calculate counts for buttons
  const noIdCount = useMemo(() => {
    return employees.filter(emp => !emp.IDNumber).length;
  }, [employees]);

  const duplicateIdCount = useMemo(() => {
    // Return the count of distinct duplicate ID numbers
    return duplicateIDNumbers.length;
  }, [duplicateIDNumbers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heading row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Employees</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setQuickAddOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Quick Add
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export details
          </Button>
          <Button type="button" onClick={() => router.push('/employees/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        </div>
      </div>

      {/* Filters row with search - all on one line */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showOnlyAvailable ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowOnlyAvailable(!showOnlyAvailable);
            setShowOnlyDuplicateIDs(false);
          }}
          className="h-8 px-2 sm:h-9 sm:px-3"
        >
          {showOnlyAvailable ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
          <span className="text-xs sm:text-sm">No ID Number</span>
          <Badge 
            variant={showOnlyAvailable ? "default" : "outline"} 
            className={`ml-1 text-xs ${showOnlyAvailable ? "bg-primary text-primary-foreground" : ""}`}
          >
            {loading ? "..." : noIdCount}
          </Badge>
        </Button>
        
        <Button
          variant={showOnlyDuplicateIDs ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowOnlyDuplicateIDs(!showOnlyDuplicateIDs);
            setShowOnlyAvailable(false);
          }}
          className="h-8 px-2 sm:h-9 sm:px-3"
        >
          {showOnlyDuplicateIDs ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
          <span className="text-xs sm:text-sm">Duplicate IDs</span>
          <Badge 
            variant={showOnlyDuplicateIDs ? "default" : "outline"} 
            className={`ml-1 text-xs ${showOnlyDuplicateIDs ? "bg-primary text-primary-foreground" : ""}`}
          >
            {loading ? "..." : duplicateIdCount}
          </Badge>
        </Button>
        
        <div className="ml-auto flex gap-2 items-center">
          <AvailableEmployeeNumbers onSelect={handleSelectEmployeeNumber} />
          
          <div className="relative w-full md:w-64">
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
      </div>

      {/* Legend for highlighted rows */}
      <div className="flex flex-col gap-2 p-3 border rounded-md bg-white">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span className="text-sm font-medium text-gray-700">No ID Number</span>
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
              <TableHead className="min-w-[11rem]">Actions</TableHead>
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
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleEdit(employee.ID)}
                          className="h-8 px-2"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleViewBankDetails(employee.ID)}
                          className="flex items-center gap-1 h-8 px-2"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="hidden lg:inline">Bank</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => openDeleteDialog(employee)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Delete</span>
                        </Button>
                      </div>
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
                    
                    <div className="pt-2 border-t mt-2 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={isDuplicateID ? 'secondary' : 'outline'}
                          size="sm"
                          type="button"
                          onClick={() => handleEdit(employee.ID)}
                          className="flex items-center justify-center gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant={isDuplicateID ? 'secondary' : 'outline'}
                          size="sm"
                          type="button"
                          onClick={() => handleViewBankDetails(employee.ID)}
                          className="flex items-center justify-center gap-2"
                        >
                          <CreditCard className="h-4 w-4" />
                          Bank
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => openDeleteDialog(employee)}
                        className="w-full flex items-center justify-center gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently remove{' '}
                  <strong>
                    {deleteTarget.fullName ||
                      `${deleteTarget.FirstName ?? ''} ${deleteTarget.LastName ?? ''}`.trim() ||
                      `(ID ${deleteTarget.ID})`}
                  </strong>
                  . You cannot delete an employee who has linked hours, schedules, or deductions.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <form onSubmit={handleExportDetails} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Export Employee Details</DialogTitle>
              <DialogDescription>
                Enter the company number to include in the Excel export.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="company-number">Company number</Label>
              <Input
                id="company-number"
                value={companyNumber}
                onChange={(event) => setCompanyNumber(event.target.value)}
                placeholder="Enter company number"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={exporting}
                onClick={() => setExportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickAddEmployeeModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onEmployeeAdded={() => void loadEmployees()}
      />
    </div>
  );
} 