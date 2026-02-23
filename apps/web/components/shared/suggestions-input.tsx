"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
};

export function SuggestionsInput({
  value,
  onChange,
  options,
  placeholder,
  className,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-md text-sm">
          {filtered.map((option) => (
            <li
              key={option}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setOpen(false);
              }}
              className="cursor-pointer px-3 py-1.5 hover:bg-purple-50 hover:text-purple-900"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
