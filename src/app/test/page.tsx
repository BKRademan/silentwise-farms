'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";

export default function TestPage() {
  const [value, setValue] = React.useState("");
  const [options, setOptions] = React.useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => {
    async function fetchGrowers() {
      try {
        const response = await fetch('/api/growers');
        const { data } = await response.json();
        if (Array.isArray(data)) {
          const formattedOptions = data.map((grower) => ({
            value: grower.ID.toString(),
            label: grower.GrowerName
          }));
          setOptions(formattedOptions);
        }
      } catch (error) {
        console.error("Error fetching growers:", error);
      }
    }

    fetchGrowers();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Test Page</h1>
      </div>

      <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">Test Content</CardTitle>
            <CardDescription className="text-sm">This is a test page to demonstrate navigation</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-[200px]">
            <Combobox
              options={options}
              value={value}
              onValueChange={setValue}
              placeholder="Select a grower"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 