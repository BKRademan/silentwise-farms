'use client';

import { HourRecord } from '@/types/database';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HoursCardProps {
  record: HourRecord;
  onEdit: (record: HourRecord) => void;
  onDelete: (record: HourRecord) => void;
}

export function HoursCard({ record, onEdit, onDelete }: HoursCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium">{record.Employee || '-'}</h3>
            <p className="text-sm text-muted-foreground">
              {record.Work_Date ? format(new Date(record.Work_Date), 'PP') : '-'}
            </p>
          </div>
          <div className="flex gap-1">
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
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Grower</p>
            <p>{record.GrowerName || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hours</p>
            <p>{record.Hours_Worked || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Overtime</p>
            <p>{record.Overtime || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Holiday</p>
            <p>{record.PHoliday || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sick Leave</p>
            <p>{record.Sick_Leave || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 