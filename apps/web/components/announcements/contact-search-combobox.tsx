"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Contact } from "@crm/shared";
import { useContacts } from "@/lib/hooks/use-contacts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
};

export function ContactSearchCombobox({ value, onChange }: Props) {
  const { data: contacts = [], isLoading } = useContacts();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedSet = new Set(value);
  const selectedContacts = contacts.filter((c) => selectedSet.has(c.id));

  const filtered = contacts.filter((c) => {
    if (selectedSet.has(c.id)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  function select(contact: Contact) {
    onChange([...value, contact.id]);
    setQuery("");
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedContacts.map((c) => (
            <Badge
              key={c.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span>
                {c.name}
                {c.company ? ` · ${c.company}` : ""}
              </span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-gray-300"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name or company…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
      </div>

      {open && (
        <div className="absolute z-50 max-h-52 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-gray-400">Loading contacts…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              {query ? "No contacts match your search" : "All contacts already selected"}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(c);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{c.name}</span>
                {c.company && (
                  <span className="text-gray-400">· {c.company}</span>
                )}
                {c.email && (
                  <span className="ml-auto text-xs text-gray-400">
                    {c.email}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
