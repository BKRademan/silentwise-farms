import { HourRecord } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';

interface HoursCardProps {
  record: HourRecord;
  onEdit?: (record: HourRecord) => void;
  onDelete?: (id: number) => void;
}

export function HoursCard({ record, onEdit, onDelete }: HoursCardProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="font-semibold">Date</div>
          <div>{record.Work_Date ? format(new Date(record.Work_Date), 'PP') : '-'}</div>

          <div className="font-semibold">Employee</div>
          <div>{record.Employee || '-'}</div>

          <div className="font-semibold">Grower</div>
          <div>{record.GrowerName || '-'}</div>

          <div className="font-semibold">Hours</div>
          <div>{record.Hours_Worked || 0}</div>

          <div className="font-semibold">Overtime</div>
          <div>{record.Overtime || 0}</div>

          <div className="font-semibold">Holiday</div>
          <div>{record.PHoliday || 0}</div>

          <div className="font-semibold">Sick Leave</div>
          <div>{record.Sick_Leave || 0}</div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(record)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(record.ID)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 