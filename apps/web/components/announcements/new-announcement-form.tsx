"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef, useMemo, useEffect } from "react";
import { Filter, Loader2, SendHorizonal, Users, UserPlus, Mail, MessageSquare, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  type AnnouncementChannel,
  type SendAnnouncementInput,
} from "@crm/shared";

import { useCreateAnnouncement, useSendAnnouncement } from "@/lib/hooks/use-announcements";
import { ContactSearchCombobox } from "@/components/announcements/contact-search-combobox";
import { useContacts } from "@/lib/hooks/use-contacts";


// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z
  .object({
    audience: z.enum(["all", "filtered", "find"]),
    channel: z.enum(["email", "sms", "push"]),
    title: z.string().min(1, "Message title is required"),
    content: z.string().min(1, "Content is required"),
    // Filtered-segment fields (only used when audience === "filtered")
    filterCompany: z.string().optional(),
    filterTag: z.string().optional(),
    filterStatus: z
      .enum(["active", "inactive", ""])
      .optional()
      .transform((val): "active" | "inactive" | undefined =>
        val === "" ? undefined : val
      ),
    // Find-contact field (only used when audience === "find")
    findContactIds: z.array(z.string()).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.audience === "filtered") {
      const hasFilter =
        val.filterCompany || val.filterTag || val.filterStatus;
      if (!hasFilter) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Provide at least one filter (company, tag, or status) for Filtered Segments.",
          path: ["filterCompany"],
        });
      }
    }
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

// ---------------------------------------------------------------------------
// Sub-components: filter combobox
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
// Sub-components: selection tiles
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
// Main component
// ---------------------------------------------------------------------------

export function NewAnnouncementForm() {
  const createAnnouncement = useCreateAnnouncement();
  const sendAnnouncement = useSendAnnouncement();
  const { data: contacts = [] } = useContacts();

  const companyOptions = useMemo(
    () => [...new Set(contacts.map((c) => c.company).filter(Boolean) as string[])].sort(),
    [contacts]
  );
  const tagOptions = useMemo(
    () => [...new Set(contacts.flatMap((c) => c.tags))].sort(),
    [contacts]
  );

  const isPending = createAnnouncement.isPending || sendAnnouncement.isPending;

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      audience: "all",
      channel: "email",
      title: "",
      content: "",
      filterCompany: "",
      filterTag: "",
      filterStatus: "",
      findContactIds: [],

    },
  });

  const audience = form.watch("audience");
  const channel = form.watch("channel");

  async function onSubmit(values: FormValues) {
    try {
      // Step 1: Create the announcement as a draft
      // TODO: Ensure /api/v1/announcements returns the created announcement with its id
      const created = await createAnnouncement.mutateAsync({
        title: values.title,
        channel: values.channel as AnnouncementChannel,
        content: values.content,
      });

      // Step 2: Build the send filters based on selected audience
      const filters: SendAnnouncementInput = {};

      if (values.audience === "filtered") {
        if (values.filterCompany) filters.company = values.filterCompany;
        if (values.filterTag) filters.tag = values.filterTag;
        if (values.filterStatus) filters.status = values.filterStatus;
      } else if (values.audience === "find") {
        if (values.findContactIds.length) filters.contactIds = values.findContactIds;
      }
      // "all" → empty filters → backend selects all contacts

      // Step 3: Send the announcement
      await sendAnnouncement.mutateAsync({ id: created.data.id, filters });

      form.reset();
    } catch {
      // Errors are surfaced via toast in the mutation's onError handlers
    }
  }

  const channelOptions: {
    value: AnnouncementChannel;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
    { value: "sms", label: "SMS", icon: <MessageSquare className="h-4 w-4" /> },
    { value: "push", label: "Push", icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">
          New Announcement
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Audience ── */}
            <FormField
              control={form.control}
              name="audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Audience
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-3">
                      <SelectionTile
                        active={field.value === "all"}
                        onClick={() => field.onChange("all")}
                        icon={<Users className="h-6 w-6" />}
                        label="All Contacts"
                      />
                      <SelectionTile
                        active={field.value === "filtered"}
                        onClick={() => field.onChange("filtered")}
                        icon={<Filter className="h-6 w-6" />}
                        label="Filtered Segments"
                      />
                      <SelectionTile
                        active={field.value === "find"}
                        onClick={() => field.onChange("find")}
                        icon={<UserPlus className="h-6 w-6" />}
                        label="Find Contact"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Filtered Segments fields ── */}
            {audience === "filtered" && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Segment Filters
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="filterCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <FilterCombobox
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={companyOptions}
                            placeholder="e.g. Acme Inc."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="filterTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tag</FormLabel>
                        <FormControl>
                          <FilterCombobox
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={tagOptions}
                            placeholder="e.g. vip"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="filterStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          {/* TODO: Replace with shadcn Select component */}
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">Any</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* ── Find Contact field ── */}
            {audience === "find" && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
                <FormField
                  control={form.control}
                  name="findContactIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Contacts</FormLabel>
                      <FormControl>
                        <ContactSearchCombobox
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── Channel ── */}
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Channel
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {channelOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                            field.value === opt.value
                              ? "border-blue-500 bg-blue-50 text-blue-600"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          )}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Message Title ── */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Message Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Summer Sale is live!"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Content ── */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Content
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your message here…"
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Actions ── */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                {isPending ? "Sending…" : "Send Announcement"}
              </Button>
            </div>

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
