'use client';

import { HourRecord } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HoursPDFReport } from './hours-pdf-report';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PDFReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HourRecord[];
  filters: {
    startDate?: string;
    endDate?: string;
    growerName?: string;
    employeeName?: string;
  };
  analytics: {
    totalRecords: number;
    uniqueEmployees: number;
    totalHours: number;
    uniqueGrowers: number;
  };
}

export function PDFReportModal({
  isOpen,
  onClose,
  data,
  filters,
  analytics,
}: PDFReportModalProps) {
  // Only show loading if filters object is undefined (not yet loaded)
  const isLoading = !filters;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh]">
        <DialogHeader>
          <DialogTitle>Hours Report</DialogTitle>
        </DialogHeader>
        <div className="flex-1 h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : (
            <HoursPDFReport
              data={data}
              filters={filters}
              analytics={analytics}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 