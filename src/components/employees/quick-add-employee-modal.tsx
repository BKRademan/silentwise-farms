'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface QuickAddOptions {
  availableNumbers: { FANumber: string }[];
  defaultRate: number | null;
}

interface QuickAddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

export function QuickAddEmployeeModal({
  open,
  onOpenChange,
  onEmployeeAdded,
}: QuickAddEmployeeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [options, setOptions] = useState<QuickAddOptions | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    EmplNo: '',
    FirstName: 'UNKNOWN',
    LastName: 'UNKNOWN',
    RATE: '',
    DateEngaged: new Date().toISOString().split('T')[0],
  });

  const loadOptions = async () => {
    setOptionsLoading(true);
    try {
      const response = await fetch('/api/employees/quick-add-options');
      if (!response.ok) {
        throw new Error('Failed to load options');
      }
      const data: QuickAddOptions = await response.json();
      setOptions(data);
      setAvailableNumbers(data.availableNumbers.map((n) => n.FANumber));
      setFormData((prev) => ({
        ...prev,
        RATE: data.defaultRate?.toString() ?? '',
      }));
    } catch (error) {
      console.error('Error loading quick-add options:', error);
      toast({
        variant: 'destructive',
        title: 'Could not load options',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadOptions();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      EmplNo: '',
      FirstName: 'UNKNOWN',
      LastName: 'UNKNOWN',
      RATE: options?.defaultRate?.toString() ?? '',
      DateEngaged: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.EmplNo || !formData.FirstName || !formData.LastName || !formData.RATE || !formData.DateEngaged) {
      toast({
        variant: 'destructive',
        title: 'Required fields',
        description: 'All fields are required.',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        EmplNo: formData.EmplNo,
        FirstName: formData.FirstName,
        LastName: formData.LastName,
        RATE: Number(formData.RATE),
        DateEngaged: formData.DateEngaged,
      };

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to create employee');
      }

      toast({
        title: 'Employee added',
        description: `${formData.FirstName} ${formData.LastName} (${formData.EmplNo}) was created successfully.`,
      });

      setAvailableNumbers((prev) => prev.filter((n) => n !== formData.EmplNo));

      resetForm();

      onEmployeeAdded();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        variant: 'destructive',
        title: 'Could not create employee',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add Employee</DialogTitle>
          <DialogDescription>
            Quickly add a new employee with minimal information. You can complete their details later.
          </DialogDescription>
        </DialogHeader>

        {optionsLoading ? (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="EmplNo">Employee Number *</Label>
              <Select
                value={formData.EmplNo}
                onValueChange={(value) => setFormData({ ...formData, EmplNo: value })}
                disabled={loading}
              >
                <SelectTrigger id="EmplNo">
                  <SelectValue placeholder="Select employee number" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {availableNumbers.length > 0 ? (
                    availableNumbers.map((number) => (
                      <SelectItem key={number} value={number}>
                        {number}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available numbers
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="FirstName">First Name *</Label>
              <Input
                id="FirstName"
                value={formData.FirstName}
                onChange={(e) => setFormData({ ...formData, FirstName: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="LastName">Last Name *</Label>
              <Input
                id="LastName"
                value={formData.LastName}
                onChange={(e) => setFormData({ ...formData, LastName: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="RATE">Rate *</Label>
              <Input
                id="RATE"
                type="number"
                step="0.01"
                value={formData.RATE}
                onChange={(e) => setFormData({ ...formData, RATE: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="DateEngaged">Date Engaged *</Label>
              <Input
                id="DateEngaged"
                type="date"
                value={formData.DateEngaged}
                onChange={(e) => setFormData({ ...formData, DateEngaged: e.target.value })}
                disabled={loading}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || availableNumbers.length === 0}>
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Employee
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
