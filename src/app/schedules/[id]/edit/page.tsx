'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ScheduleForm } from '@/components/schedules/schedule-form';
import { useToast } from '@/components/ui/use-toast';
import type { ScheduleDetail } from '@/types/schedule';

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const scheduleId = Number(params.id);
  
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load schedule');
        const data = json.data as ScheduleDetail;
        
        if (data.Status !== 'draft') {
          toast({
            title: 'Cannot edit finalized schedule',
            description: 'Only draft schedules can be edited.',
            variant: 'destructive',
          });
          router.push('/schedules');
          return;
        }
        
        setDetail(data);
      } catch (err) {
        console.error(err);
        toast({
          title: err instanceof Error ? err.message : 'Failed to load schedule',
          variant: 'destructive',
        });
        router.push('/schedules');
      } finally {
        setLoading(false);
      }
    };

    if (Number.isFinite(scheduleId)) {
      loadSchedule();
    }
  }, [scheduleId, router, toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="py-4">
      <ScheduleForm scheduleId={scheduleId} initialData={detail} />
    </div>
  );
}
