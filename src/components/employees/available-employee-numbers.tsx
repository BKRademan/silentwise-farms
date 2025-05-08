'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserCheck, X, ListFilter, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface AvailableEmployeeNumbersProps {
  onSelect?: (emplNo: string) => void;
}

export function AvailableEmployeeNumbers({ onSelect }: AvailableEmployeeNumbersProps) {
  const [availableNumbers, setAvailableNumbers] = useState<{FANumber: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableNumbers = async (forceRefresh = false) => {
    if (isOpen || forceRefresh) {
      setIsLoading(true);
      setError(null);
      try {
        // Add cache-busting parameter to ensure fresh data
        const response = await fetch(`/api/employees/available?t=${Date.now()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch available employee numbers');
        }
        
        const data = await response.json();
        setAvailableNumbers(data);
      } catch (error) {
        console.error('Error fetching available employee numbers:', error);
        setError('Failed to load available employee numbers');
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAvailableNumbers();
  }, [isOpen]);

  const handleSelectNumber = (faNumber: string) => {
    if (onSelect) {
      onSelect(faNumber);
    }
    setIsOpen(false);
  };

  const handleRefresh = () => {
    fetchAvailableNumbers(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <ListFilter className="h-4 w-4" />
          <span>Available Numbers</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Available Employee Numbers</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh} 
                disabled={isLoading}
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Badge variant="outline" className="ml-2">
                {isLoading ? "..." : availableNumbers.length}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            These are employee numbers that can be used for new employees. Click on a number to filter the employee list.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
            {availableNumbers.length > 0 ? (
              availableNumbers.map((item) => (
                <Button
                  key={item.FANumber}
                  variant="outline"
                  size="sm"
                  className="text-center"
                  onClick={() => handleSelectNumber(item.FANumber)}
                >
                  {item.FANumber}
                </Button>
              ))
            ) : (
              <div className="col-span-3 sm:col-span-4 text-center p-4 text-muted-foreground">
                No available employee numbers found.
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
} 