"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Filter, Loader2, Lock, Search, UserPlus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useEnrollments, useBatchEnroll, useRemoveEnrollment, BatchEnrollInput } from "@/lib/hooks/use-sequences";
import { ContactSearchCombobox } from "@/components/shared/contact-search-combobox";
import { formatHourLabel } from "@/lib/util/timezone";

type AudienceMode = "all" | "filtered" | "find";

type Props = {
  sequenceId: string;
  sequenceStatus: string;
};

// ---------------------------------------------------------------------------
// Filter combobox (same pattern as new-announcement-form.tsx)
// ---------------------------------------------------------------------------

type FilterComboboxProps = {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
};

function FilterCombobox({ value, onChange, options, placeholder }: FilterComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const filtered = options.filter(
    (o) => !query || o.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          value={query}
          placeholder={placeholder}
          className="pl-9"
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setQuery(opt);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection tile
// ---------------------------------------------------------------------------

type TileProps = {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
};

function SelectionTile({ active, onClick, icon, label }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 px-4 py-5 transition-colors",
        active
          ? "border-blue-500 bg-blue-50 text-blue-600"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      <span className={cn("h-6 w-6", active ? "text-blue-500" : "text-gray-400")}>
        {icon}
      </span>
      <span className={cn("text-sm font-medium", active ? "text-blue-600" : "text-gray-700")}>
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SequenceEnrollPanel({ sequenceId, sequenceStatus }: Props) {
  const { data: contacts = [] } = useContacts();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments(sequenceId);
  const batchEnroll = useBatchEnroll(sequenceId);
  const removeEnrollment = useRemoveEnrollment(sequenceId);

  const [audience, setAudience] = useState<AudienceMode>("all");
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [findContactIds, setFindContactIds] = useState<string[]>([]);

  const companyOptions = useMemo(
    () => [...new Set(contacts.map((c) => c.company).filter(Boolean) as string[])].sort(),
    [contacts]
  );
  const tagOptions = useMemo(
    () => [...new Set(contacts.flatMap((c) => c.tags))].sort(),
    [contacts]
  );

  async function handleEnroll() {
    const input: BatchEnrollInput = {};

    if (audience === "filtered") {
      if (filterCompany) input.company = filterCompany;
      if (filterTag) input.tag = filterTag;
      if (filterStatus) input.status = filterStatus as "active" | "inactive";
    } else if (audience === "find") {
      if (findContactIds.length) input.contactIds = findContactIds;
    }

    await batchEnroll.mutateAsync(input);
    setFindContactIds([]);
  }

  // Locked state — sequence not yet published
  if (sequenceStatus !== "active") {
    return (
      <Card className="border border-gray-200 shadow-sm mt-6">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Publish the sequence first to start enrolling contacts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">
          Enroll Contacts
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Audience tiles */}
        <div className="flex gap-3">
          <SelectionTile
            active={audience === "all"}
            onClick={() => setAudience("all")}
            icon={<Users className="h-6 w-6" />}
            label="All Contacts"
          />
          <SelectionTile
            active={audience === "filtered"}
            onClick={() => setAudience("filtered")}
            icon={<Filter className="h-6 w-6" />}
            label="Filtered"
          />
          <SelectionTile
            active={audience === "find"}
            onClick={() => setAudience("find")}
            icon={<UserPlus className="h-6 w-6" />}
            label="Specific Contacts"
          />
        </div>

        {/* Filtered options */}
        {audience === "filtered" && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Segment Filters
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Company</label>
                <FilterCombobox
                  value={filterCompany}
                  onChange={setFilterCompany}
                  options={companyOptions}
                  placeholder="e.g. Acme Inc."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Tag</label>
                <FilterCombobox
                  value={filterTag}
                  onChange={setFilterTag}
                  options={tagOptions}
                  placeholder="e.g. vip"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Any</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Specific contacts picker */}
        {audience === "find" && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Search Contacts
            </p>
            <ContactSearchCombobox value={findContactIds} onChange={setFindContactIds} />
          </div>
        )}

        {/* Enroll button */}
        <div className="flex justify-end">
          <Button onClick={handleEnroll} disabled={batchEnroll.isPending} className="gap-2">
            {batchEnroll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {batchEnroll.isPending ? "Enrolling…" : "Enroll"}
          </Button>
        </div>

        {/* Enrolled contacts list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Enrolled ({enrollments.length})
            </p>
          </div>

          {enrollmentsLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {!enrollmentsLoading && enrollments.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">
              No contacts enrolled yet.
            </p>
          )}

          {!enrollmentsLoading && enrollments.length > 0 && (
            <ul className="space-y-2">
              {enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {enrollment.contact.name}
                    </p>
                    {enrollment.contact.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {enrollment.contact.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <Badge
                      className={cn(
                        "text-xs capitalize border-0",
                        statusColors[enrollment.status] ?? "bg-gray-100 text-gray-600"
                      )}
                    >
                      {enrollment.status}
                    </Badge>
                    {enrollment.nextStepAt && (
                      <span className="text-xs text-gray-400">
                        Next:{" "}
                        {new Date(enrollment.nextStepAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{", "}
                        {formatHourLabel(new Date(enrollment.nextStepAt).getUTCHours())}
                      </span>
                    )}
                    {enrollment.currentStepIndex === 0 && (
                      <button
                        type="button"
                        disabled={removeEnrollment.isPending}
                        onClick={() => {
                          if (confirmingRemoveId !== enrollment.id) {
                            setConfirmingRemoveId(enrollment.id);
                          } else {
                            removeEnrollment.mutate(enrollment.id);
                            setConfirmingRemoveId(null);
                          }
                        }}
                        className={cn(
                          "rounded px-2 py-1 text-xs font-medium transition-colors",
                          confirmingRemoveId === enrollment.id
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                        )}
                      >
                        {confirmingRemoveId === enrollment.id ? "Confirm?" : <X className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
