"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkflows } from "@/lib/hooks/use-workflows";
import { WorkflowCard } from "./workflow-card";

export function WorkflowsList() {
  const [search, setSearch] = useState("");
  const { data: workflows, isLoading, isError, error } = useWorkflows();

  const filtered = (workflows ?? []).filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Automations</h2>
          <p className="text-sm text-gray-500">
            Trigger actions automatically based on contact events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search workflows…"
              className="pl-9 text-sm w-52"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" asChild>
            <Link href="/workflows/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Workflow
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading workflows…
        </div>
      )}

      {isError && (
        <div className="py-16 text-center text-sm text-red-500">
          {(error as Error)?.message ?? "Failed to load workflows"}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-gray-500">
          {search
            ? `No workflows match "${search}".`
            : 'No workflows yet. Click "+ New Workflow" to create one.'}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  );
}
