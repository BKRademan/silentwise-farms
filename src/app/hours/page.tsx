'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HoursTable } from '@/components/hours/hours-table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Filters } from '@/components/hours/filters';
import { HourRecord } from '@/types/database';
import { RefreshCw, Users, Clock, Building2, FileSpreadsheet, BarChart, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PDFReportModal } from '@/components/hours/pdf-report-modal';
import { HourFormDialog } from "@/components/hours/hour-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HoursPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<HourRecord[]>([]);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfFilters, setPdfFilters] = useState<{
    startDate?: string;
    endDate?: string;
    growerName?: string;
    employeeName?: string;
  }>();
  const searchParams = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HourRecord | undefined>(undefined);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  // Get selected filter values for the PDF report
  const loadPdfFilters = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Get grower name from records if we have a growerId
    const growerId = params.get('growerId');
    const growerName = growerId && records.length > 0 
      ? records[0].GrowerName  // All records should have the same grower when filtered
      : undefined;

    // Get employee name from records if we have an employeeId
    const employeeId = params.get('employeeId');
    const employeeName = employeeId 
      ? records.find(r => r.ID.toString() === employeeId)?.Employee 
      : undefined;

    // Get date range
    const startDate = params.get('startDate') || undefined;
    const endDate = params.get('endDate') || undefined;

    // Set all filters at once
    setPdfFilters({
      startDate,
      endDate,
      growerName: growerName || undefined,
      employeeName: employeeName || undefined,
    });
  }, [searchParams, records]);

  // Load PDF filters when modal is opened
  useEffect(() => {
    if (isPDFModalOpen) {
      loadPdfFilters();
    } else {
      // Clear filters when modal is closed
      setPdfFilters(undefined);
    }
  }, [isPDFModalOpen, loadPdfFilters]);

  // Calculate analytics
  const analytics = {
    totalRecords: records.length,
    uniqueEmployees: new Set(records.map(r => r.Employee)).size,
    totalHours: records.reduce((sum, r) => sum + (r.Hours_Worked || 0), 0),
    uniqueGrowers: new Set(records.map(r => r.GrowerName)).size
  };

  const fetchRecords = async (params?: URLSearchParams) => {
    // Don't fetch if there are no filters set
    if (!params?.toString()) {
      console.log('ℹ️ No filters set, skipping fetch');
      setRecords([]);
      return;
    }

    console.log('🔄 Fetching hours records with params:', params?.toString());
    setIsLoading(true);
    setError(null);

    try {
      const queryString = params.toString();
      console.log(`🔗 API Call URL: /api/hours${queryString ? `?${queryString}` : ''}`);
      const response = await fetch(`/api/hours${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (data.success) {
        console.log('✅ Successfully fetched hours records:', data.data.length, 'records');
        // Sort records by date descending and then by employee ascending
        const sortedRecords = [...data.data].sort((a, b) => {
          // First sort by date descending
          const dateComparison = new Date(b.Work_Date).getTime() - new Date(a.Work_Date).getTime();
          if (dateComparison !== 0) return dateComparison;
          
          // Then sort by employee ascending
          return (a.Employee || '').localeCompare(b.Employee || '');
        });
        setRecords(sortedRecords);
      } else {
        console.error('❌ Failed to fetch hours records:', data.error);
        setError(data.error || 'Failed to fetch hours records');
        setRecords([]);
      }
    } catch (error) {
      console.error('❌ Error in fetchRecords:', error);
      setError('An unexpected error occurred');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh the table data with current filters
  const refreshData = useCallback(() => {
    const currentParams = new URLSearchParams(window.location.search);
    console.log('🔄 Refreshing data with params:', Object.fromEntries(currentParams));
    fetchRecords(currentParams);
  }, [fetchRecords]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRecord(undefined);
    refreshData(); // Use the refreshData function instead of fetchRecords directly
  };

  const handleRefresh = () => {
    refreshData(); // Use the refreshData function for consistency
  };

  const handleNewRecord = () => {
    setMode('create');
    setSelectedRecord(undefined);
    setIsDialogOpen(true);
  };

  const handleEditRecord = (record: HourRecord) => {
    setMode('edit');
    setSelectedRecord(record);
    setIsDialogOpen(true);
  };

  const handleDeleteRecord = (record: HourRecord) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;

    try {
      const response = await fetch(`/api/hours?id=${selectedRecord.ID}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete record');

      setRecords(records.filter(r => r.ID !== selectedRecord.ID));
      setIsDeleteDialogOpen(false);
      setSelectedRecord(undefined);
      refreshData(); // Use the refreshData function here too
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">Hours Tracking</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} disabled={isLoading} size="sm" className="h-8 px-2 sm:h-10 sm:px-4">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-sm">Refresh</span>
            </Button>
            <Button asChild size="sm" className="h-8 px-2 sm:h-10 sm:px-4">
              <Link href={`/hours/analytics?${searchParams.toString()}`}>
                <BarChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-sm">Analytics</span>
              </Link>
            </Button>
            <Button 
              onClick={() => setIsPDFModalOpen(true)} 
              disabled={!records.length || !searchParams.get('growerId')}
              size="sm" 
              className="h-8 px-2 sm:h-10 sm:px-4"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-sm">PDF Report</span>
            </Button>
            <Button 
              onClick={handleNewRecord} 
              size="sm" 
              className="h-8 px-2 sm:h-10 sm:px-4"
            >
              <span className="text-sm">New Record</span>
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 w-full">
          <Card className="min-w-0 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Total Records</p>
                  <p className="text-lg sm:text-2xl font-bold truncate text-blue-600">{analytics.totalRecords}</p>
                </div>
                <FileSpreadsheet className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="min-w-0 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Employees</p>
                  <p className="text-lg sm:text-2xl font-bold truncate text-blue-600">{analytics.uniqueEmployees}</p>
                </div>
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="min-w-0 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Total Hours</p>
                  <p className="text-lg sm:text-2xl font-bold truncate text-blue-600">{analytics.totalHours}</p>
                </div>
                <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="min-w-0 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Growers</p>
                  <p className="text-lg sm:text-2xl font-bold truncate text-blue-600">{analytics.uniqueGrowers}</p>
                </div>
                <Building2 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 sm:mb-6">
          <Filters onFiltersChange={() => setRecords([])} />
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-2 sm:p-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="w-full">
            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <HoursTable data={records} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />
              </CardContent>
            </Card>
          </div>
        )}

        <PDFReportModal
          isOpen={isPDFModalOpen}
          onClose={() => setIsPDFModalOpen(false)}
          data={records}
          filters={pdfFilters || {}}
          analytics={analytics}
        />

        <HourFormDialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          initialData={selectedRecord}
          mode={mode}
          onSuccess={refreshData}
        />

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the hours record
                for {selectedRecord?.Employee} on {selectedRecord?.Work_Date ? new Date(selectedRecord.Work_Date).toLocaleDateString() : ''}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 