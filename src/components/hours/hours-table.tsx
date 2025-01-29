'use client';

import { HourRecord } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { HoursCard } from './hours-card';

interface HoursTableProps {
  data: HourRecord[];
  onEdit: (record: HourRecord) => void;
  onDelete: (record: HourRecord) => void;
}

export function HoursTable({ data, onEdit, onDelete }: HoursTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center p-4">
        No records found
      </div>
    );
  }

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2">Date</TableHead>
              <TableHead className="py-2">Employee</TableHead>
              <TableHead className="py-2">Grower</TableHead>
              <TableHead className="py-2 text-right">Hours</TableHead>
              <TableHead className="py-2 text-right">Overtime</TableHead>
              <TableHead className="py-2 text-right">Holiday</TableHead>
              <TableHead className="py-2 text-right">Sick Leave</TableHead>
              <TableHead className="py-2 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record) => (
              <TableRow key={record.ID}>
                <TableCell className="py-1.5">
                  {record.Work_Date ? format(new Date(record.Work_Date), 'PP') : '-'}
                </TableCell>
                <TableCell className="py-1.5">{record.Employee || '-'}</TableCell>
                <TableCell className="py-1.5">{record.GrowerName || '-'}</TableCell>
                <TableCell className="py-1.5 text-right">{record.Hours_Worked || 0}</TableCell>
                <TableCell className="py-1.5 text-right">{record.Overtime || 0}</TableCell>
                <TableCell className="py-1.5 text-right">{record.PHoliday || 0}</TableCell>
                <TableCell className="py-1.5 text-right">{record.Sick_Leave || 0}</TableCell>
                <TableCell className="py-1.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(record)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDelete(record)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {data.map((record) => (
          <HoursCard
            key={record.ID}
            record={record}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
} 