'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttendanceStatus, ScheduleAttendance } from '@/types/schedule';

export interface PendingMark {
  employeeId: number;
  workDate: string; // yyyy-MM-dd
  status: AttendanceStatus | 'unmarked';
  overtimeHours?: number;
  isPublicHoliday?: boolean;
  isSickLeave?: boolean;
  absenceReason?: string | null;
}

type PendingMap = Record<string, PendingMark>;

function storageKey(scheduleId: number) {
  return `attendance-pending-${scheduleId}`;
}

function markKey(employeeId: number, workDate: string) {
  return `${employeeId}-${workDate}`;
}

function readFromStorage(scheduleId: number): PendingMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(scheduleId));
    return raw ? (JSON.parse(raw) as PendingMap) : {};
  } catch {
    return {};
  }
}

function writeToStorage(scheduleId: number, map: PendingMap) {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(map);
    if (keys.length === 0) {
      localStorage.removeItem(storageKey(scheduleId));
    } else {
      localStorage.setItem(storageKey(scheduleId), JSON.stringify(map));
    }
  } catch {
    // Storage full or unavailable -- silently degrade
  }
}

export function getPendingAttendanceCount(scheduleId: number): number {
  return Object.keys(readFromStorage(scheduleId)).length;
}

export function clearPendingAttendance(scheduleId: number): void {
  writeToStorage(scheduleId, {});
}

export function usePendingAttendance(scheduleId: number) {
  const [pending, setPending] = useState<PendingMap>(() =>
    readFromStorage(scheduleId)
  );
  const scheduleIdRef = useRef(scheduleId);

  useEffect(() => {
    if (scheduleIdRef.current !== scheduleId) {
      scheduleIdRef.current = scheduleId;
      setPending(readFromStorage(scheduleId));
    }
  }, [scheduleId]);

  useEffect(() => {
    writeToStorage(scheduleId, pending);
  }, [scheduleId, pending]);

  const pendingCount = useMemo(
    () => Object.keys(pending).length,
    [pending]
  );

  const setPendingMark = useCallback((mark: PendingMark) => {
    setPending((prev) => ({
      ...prev,
      [markKey(mark.employeeId, mark.workDate)]: mark,
    }));
  }, []);

  const removePendingMark = useCallback(
    (employeeId: number, workDate: string) => {
      setPending((prev) => {
        const next = { ...prev };
        delete next[markKey(employeeId, workDate)];
        return next;
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    clearPendingAttendance(scheduleId);
    setPending({});
  }, [scheduleId]);

  const getPendingMark = useCallback(
    (employeeId: number, workDate: string): PendingMark | undefined => {
      return pending[markKey(employeeId, workDate)];
    },
    [pending]
  );

  const getEffectiveStatus = useCallback(
    (
      employeeId: number,
      workDate: string,
      serverRow: ScheduleAttendance | undefined
    ): AttendanceStatus | 'unmarked' => {
      const p = pending[markKey(employeeId, workDate)];
      if (p) return p.status;
      return serverRow?.Status ?? 'unmarked';
    },
    [pending]
  );

  const pendingMarksArray = useMemo(
    () => Object.values(pending),
    [pending]
  );

  const getPendingForDay = useCallback(
    (workDate: string): Set<number> => {
      const ids = new Set<number>();
      for (const m of Object.values(pending)) {
        if (m.workDate === workDate) ids.add(m.employeeId);
      }
      return ids;
    },
    [pending]
  );

  return {
    pending,
    pendingCount,
    pendingMarksArray,
    setPendingMark,
    removePendingMark,
    clearAll,
    getPendingMark,
    getEffectiveStatus,
    getPendingForDay,
  };
}
