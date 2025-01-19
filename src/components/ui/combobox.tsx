"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function Combobox({ options, value, onValueChange, placeholder = "Select option..." }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            onValueChange={(searchTerm) => {
              const filteredOptions = sortedOptions.filter(option =>
                option.label.toLowerCase().includes(searchTerm.toLowerCase())
              );
              // Update the options displayed based on the search term
            }}
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(value === option.value ? "" : option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
