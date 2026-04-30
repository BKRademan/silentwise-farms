'use client';

import { useMemo, useState } from 'react';
import { Employee } from '@/types/database';
import type { RecentEmployeeForGrower } from '@/types/schedule';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function labelEmployee(e: Pick<Employee, 'EmplNo' | 'FirstName' | 'LastName' | 'knownAs'>): string {
  const name =
    e.knownAs ||
    [e.FirstName, e.LastName].filter(Boolean).join(' ') ||
    'Unknown';
  return `${e.EmplNo ?? '?'} — ${name}`;
}

type EmployeePickerProps = {
  recent: RecentEmployeeForGrower[];
  allEmployees: Employee[];
  selectedIds: Set<number>;
  onToggle: (id: number, selected: boolean) => void;
};

export function EmployeePicker({
  recent,
  allEmployees,
  selectedIds,
  onToggle,
}: EmployeePickerProps) {
  const [search, setSearch] = useState('');

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allEmployees.filter((e) => {
      const blob = [
        e.EmplNo,
        e.FirstName,
        e.LastName,
        e.knownAs,
        String(e.ID),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [allEmployees, search]);

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Label className="text-base">Employees on this schedule</Label>
          <span
            className="text-sm font-semibold tabular-nums text-muted-foreground"
            aria-live="polite"
            aria-label={`${selectedCount} employee${selectedCount === 1 ? '' : 's'} selected`}
          >
            {selectedCount} selected
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Recent workers for this grower are pre-selected. Toggle or search to add others.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emp-search">Add another employee</Label>
        <Input
          id="emp-search"
          placeholder="Search by number or name..."
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        {search.trim() && (
          <div className="rounded-md border">
            <div className="divide-y p-2">
              {filteredAll.slice(0, 40).map((e) => (
                <div
                  key={e.ID}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="text-sm">{labelEmployee(e)}</span>
                  <Button
                    type="button"
                    variant={selectedIds.has(e.ID) ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => onToggle(e.ID, !selectedIds.has(e.ID))}
                  >
                    {selectedIds.has(e.ID) ? 'Remove' : 'Add'}
                  </Button>
                </div>
              ))}
              {filteredAll.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">No matches.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border p-3">
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent hours for this grower in the last 60 days.</p>
          )}
          {recent.map((e, index) => (
            <button
              key={e.ID}
              type="button"
              onClick={() => onToggle(e.ID, !selectedIds.has(e.ID))}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                selectedIds.has(e.ID)
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:bg-muted/60'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                  selectedIds.has(e.ID)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
                aria-hidden
              >
                {selectedIds.has(e.ID) ? '✓' : ''}
              </span>
              <span className="flex flex-1 items-center gap-2">
                <span className="font-semibold text-muted-foreground tabular-nums">{index + 1}.</span>
                <span>{labelEmployee(e)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  ({e.daysWorked} {e.daysWorked === 1 ? 'day' : 'days'})
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
