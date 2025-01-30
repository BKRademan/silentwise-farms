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
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

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
      <div className="z-[9999] fixed">
        <PopoverContent className="w-[200px] p-0" align="start">
          <div 
            className="bg-white rounded-md border shadow-md"
            style={{ pointerEvents: 'auto' }}
          >
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder={`Search ${placeholder.toLowerCase()}...`} 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>No options found.</CommandEmpty>
                <CommandGroup className="overflow-y-auto">
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onValueChange(option.value)
                        setOpen(false)
                        setSearchQuery("")
                      }}
                      className="cursor-pointer"
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
          </div>
        </PopoverContent>
      </div>
    </Popover>
  )
}
