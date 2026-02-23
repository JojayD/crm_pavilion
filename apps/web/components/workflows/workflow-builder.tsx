"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  useWorkflow,
  useUpdateWorkflow,
  useAddAction,
  useRemoveAction,
} from "@/lib/hooks/use-workflows";
import { useSequences } from "@/lib/hooks/use-sequences";
import { useContacts } from "@/lib/hooks/use-contacts";
import { StatusBadge } from "@/components/ui/status-badge";
import { TriggerLabel } from "./trigger-label";
import { ExecutionHistory } from "./execution-history";
import { SuggestionsInput } from "@/components/shared/suggestions-input";
import { ActionType, WorkflowCondition } from "@crm/shared";
import { formatHourLabel, getActionConfigLabel } from "@/lib/util/workflow";
import { workFlowConditionMapping } from "@crm/shared";
type AddActionMode = ActionType | "";

type Props = {
  workflowId: string;
};

// ─── Condition field / op options ────────────────────────────────────────────

const conditionFields = [
  { value: "company", label: "Company" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
];

const conditionOps = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
];

// ─── Scheduler helpers ────────────────────────────────────────────────────────

const PRESETS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly (every Monday)" },
  { value: "monthly", label: "Monthly (1st of month)" },
];


const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: formatHourLabel(i),
}));

//  Main component

export function WorkflowBuilder({ workflowId }: Props) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const { data: sequences = [] } = useSequences();
  const { data: contacts = [] } = useContacts();
  const updateWorkflow = useUpdateWorkflow();
  const addAction = useAddAction(workflowId);
  const removeAction = useRemoveAction(workflowId);

  // Derived tag/company lists from contacts
  const allTags = useMemo(
    () => [...new Set(contacts.flatMap((c) => c.tags ?? []))].sort(),
    [contacts]
  );
  const allCompanies = useMemo(
    () =>
      [...new Set(contacts.map((c) => c.company).filter(Boolean) as string[])].sort(),
    [contacts]
  );

  // This is the for the trigger config states
  const [tagValue, setTagValue] = useState("");
  const [schedPreset, setSchedPreset] = useState(
    () => (workflow?.triggerConfig?.preset as string) ?? "daily"
  );
  const [schedHour, setSchedHour] = useState(
    () => String(workflow?.triggerConfig?.hour ?? 9)
  );


  const [condField, setCondField] = useState("company");
  const [condOp, setCondOp] = useState("eq");
  const [condValue, setCondValue] = useState("");
  const [confirmingDeleteCondIdx, setConfirmingDeleteCondIdx] = useState<number | null>(null);

  const [actionType, setActionType] = useState<AddActionMode>("");
  const [sequenceId, setSequenceId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [confirmingDeleteActionId, setConfirmingDeleteActionId] = useState<string | null>(null);

  if (isLoading || !workflow) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  const conditions: WorkflowCondition[] = workflow.conditions ?? [];
  const actions = workflow.actions ?? [];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handlePublish() {
    await updateWorkflow.mutateAsync({ id: workflowId, data: { status: "active" } });
  }

  async function handleSaveTagTriggerConfig() {
    await updateWorkflow.mutateAsync({
      id: workflowId,
      data: { triggerConfig: { tag: tagValue.trim() } },
    });
  }

  async function handleSaveScheduledConfig() {
    await updateWorkflow.mutateAsync({
      id: workflowId,
      data: { triggerConfig: { preset: schedPreset, hour: Number(schedHour) } },
    });
  }

  async function handleAddCondition(e: React.FormEvent) {
    e.preventDefault();
    if (!condValue.trim()) return;
    const op = condField === "tags" ? "contains" : condOp;
    const updated = [...conditions, { field: condField, op: workFlowConditionMapping[op as keyof typeof workFlowConditionMapping], value: condValue.trim() }];
    await updateWorkflow.mutateAsync({ id: workflowId, data: { conditions: updated } });
    setCondValue("");
  }

  async function handleDeleteCondition(idx: number) {
    if (confirmingDeleteCondIdx !== idx) {
      setConfirmingDeleteCondIdx(idx);
      return;
    }
    const updated = conditions.filter((_, i) => i !== idx);
    await updateWorkflow.mutateAsync({ id: workflowId, data: { conditions: updated } });
    setConfirmingDeleteCondIdx(null);
  }

  async function handleAddAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionType) return;

    const config: Record<string, any> = {};
    if (actionType === "add_to_sequence" && sequenceId) {
      config.sequenceId = sequenceId;
    } else if (actionType === "add_tag" && tagInput.trim()) {
      config.tag = tagInput.trim();
    } else if (actionType === "send_message") {
      config.subject = msgSubject.trim();
      config.body = msgBody.trim();
    }

    await addAction.mutateAsync({
      actionType,
      actionConfig: config,
      executionOrder: actions.length,
    });
    setActionType("");
    setSequenceId("");
    setTagInput("");
    setMsgSubject("");
    setMsgBody("");
  }

  function handleDeleteAction(actionId: string) {
    if (confirmingDeleteActionId !== actionId) {
      setConfirmingDeleteActionId(actionId);
      return;
    }
    removeAction.mutate(actionId);
    setConfirmingDeleteActionId(null);
  }

  const canPublish = workflow.status !== "active" && actions.length > 0;

  // Effective op for current condition field
  const effectiveOp = condField === "tags" ? "contains" : condOp;

  // Scheduled trigger display label (from saved config)
  const savedPreset = workflow.triggerConfig?.preset as string | undefined;
  const savedHour = workflow.triggerConfig?.hour as number | undefined;
  const scheduledLabel =
    savedPreset && savedHour !== undefined
      ? `${PRESETS.find((p) => p.value === savedPreset)?.label ?? savedPreset} at ${formatHourLabel(savedHour)}`
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <Link
          href="/workflows"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex gap-2 ml-4">
          <div className="h-2 w-16 rounded-full bg-purple-600" />
          <div className="h-2 w-16 rounded-full bg-purple-600" />
        </div>
      </div>

      {/* Header card */}
      <div className="px-6 pt-6">
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-0.5">
                  Editing Draft
                </p>
                <h1 className="text-xl font-bold text-gray-900">{workflow.name}</h1>
              </div>
              <StatusBadge status={workflow.status} />
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePublish}
              disabled={updateWorkflow.isPending || !canPublish}
            >
              {updateWorkflow.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Publish & Activate
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="px-6 pb-10 space-y-6">
        {/* ── Section 1: Trigger ─────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Trigger</h2>
              <TriggerLabel triggerType={workflow.triggerType} />
            </div>

            {workflow.triggerType === "tag_added" && (
              <div className="space-y-2">
                <Label htmlFor="triggerTag">Tag to watch</Label>
                <div className="flex gap-2">
                  <SuggestionsInput
                    id="triggerTag"
                    placeholder="e.g. vip"
                    value={tagValue || (workflow.triggerConfig?.tag as string) || ""}
                    onChange={setTagValue}
                    options={allTags}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveTagTriggerConfig}
                    disabled={updateWorkflow.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {workflow.triggerType === "scheduled" && (
              <div className="space-y-3">
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select
                      value={schedPreset}
                      onValueChange={setSchedPreset}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time</Label>
                    <Select
                      value={schedHour}
                      onValueChange={setSchedHour}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveScheduledConfig}
                    disabled={updateWorkflow.isPending}
                  >
                    Save
                  </Button>
                </div>
                {scheduledLabel && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    Currently set to: <span className="font-medium ml-1">{scheduledLabel}</span>
                  </p>
                )}
              </div>
            )}

            {workflow.triggerType === "contact_created" && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <Info className="h-4 w-4 flex-shrink-0" />
                Fires automatically whenever a new contact is created.
              </p>
            )}

            {workflow.triggerType === "member_inactive" && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <Info className="h-4 w-4 flex-shrink-0" />
                Fires when a contact's status changes to inactive.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Section 2: Conditions ──────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Conditions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Optional filters — contact must match all conditions to trigger the workflow.
              </p>
            </div>

            {/* Existing conditions */}
            {conditions.length > 0 && (
              <ul className="space-y-2">
                {conditions.map((cond, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-4 py-2.5"
                  >
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{cond.field.toUpperCase()}</span>{" "}
                      <span className="text-gray-400">{cond.op}</span>{" "}
                      <span className="font-medium">{String(cond.value)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCondition(idx)}
                      disabled={updateWorkflow.isPending}
                      className={
                        confirmingDeleteCondIdx === idx
                          ? "rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          : "rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      }
                    >
                      {confirmingDeleteCondIdx === idx ? "Confirm?" : <Trash2 className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add condition form */}
            <form onSubmit={handleAddCondition} className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1.5">
                <Label>Field</Label>
                <Select
                  value={condField}
                  onValueChange={(v) => {
                    setCondField(v);
                    setCondValue("");
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionFields.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Operator</Label>
                <Select
                  value={effectiveOp}
                  onValueChange={setCondOp}
                  disabled={condField === "tags"}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOps.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condValue">Value</Label>
                {condField === "status" ? (
                  <Select value={condValue} onValueChange={setCondValue}>
                    <SelectTrigger className="w-40" id="condValue">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="inactive">inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : condField === "tags" ? (
                  <SuggestionsInput
                    id="condValue"
                    value={condValue}
                    onChange={setCondValue}
                    options={allTags}
                    placeholder="e.g. vip"
                    className="w-40"
                  />
                ) : (
                  <SuggestionsInput
                    id="condValue"
                    value={condValue}
                    onChange={setCondValue}
                    options={allCompanies}
                    placeholder="e.g. Acme Corp"
                    className="w-40"
                  />
                )}
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={updateWorkflow.isPending || !condValue.trim()}
                className="mb-0.5"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Section 3: Actions ─────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Actions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Steps executed in order when the workflow fires.
              </p>
            </div>

            {/* Existing actions */}
            {actions.length > 0 && (
              <ol className="space-y-2">
                {actions.map((action, index) => (
                  <li
                    key={action.id}
                    className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {action.actionType === "send_message"
                          ? "Send Email"
                          : action.actionType.replace(/_/g, " ")}
                      </p>
                      {action.actionConfig && Object.keys(action.actionConfig).length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {getActionConfigLabel(action, sequences)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAction(action.id)}
                      disabled={removeAction.isPending}
                      className={
                        confirmingDeleteActionId === action.id
                          ? "flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          : "flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      }
                    >
                      {confirmingDeleteActionId === action.id ? "Confirm?" : <Trash2 className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {actions.length === 0 && (
              <p className="text-sm text-gray-400">No actions yet. Add one below.</p>
            )}

            {/* Add action form */}
            <form onSubmit={handleAddAction} className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Add Action
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="actionType">Action Type</Label>
                <Select
                  value={actionType}
                  onValueChange={(v) => setActionType(v as AddActionMode)}
                >
                  <SelectTrigger id="actionType" className="max-w-xs">
                    <SelectValue placeholder="Select action…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add_to_sequence">Add to Sequence</SelectItem>
                    <SelectItem value="add_tag">Add Tag</SelectItem>
                    <SelectItem value="send_message">Send Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {actionType === "add_to_sequence" && (
                <div className="space-y-1.5">
                  <Label htmlFor="sequenceSelect">Sequence</Label>
                  <Select value={sequenceId} onValueChange={setSequenceId}>
                    <SelectTrigger id="sequenceSelect" className="max-w-xs">
                      <SelectValue placeholder="Choose a sequence…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sequences.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id}>
                          {seq.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {actionType === "add_tag" && (
                <div className="space-y-1.5">
                  <Label htmlFor="tagInput">Tag</Label>
                  <SuggestionsInput
                    id="tagInput"
                    value={tagInput}
                    onChange={setTagInput}
                    options={allTags}
                    placeholder="e.g. vip"
                    className="max-w-xs"
                  />
                </div>
              )}

              {actionType === "send_message" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="msgSubject">Subject</Label>
                    <Input
                      id="msgSubject"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      placeholder="Email subject…"
                      className="max-w-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="msgBody">Body</Label>
                    <Textarea
                      id="msgBody"
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      placeholder="Email body…"
                      className="max-w-sm min-h-24"
                    />
                  </div>
                </div>
              )}

              {actionType && (
                <Button
                  type="submit"
                  variant="outline"
                  disabled={
                    addAction.isPending ||
                    !actionType ||
                    (actionType === "add_to_sequence" && !sequenceId) ||
                    (actionType === "add_tag" && !tagInput.trim()) ||
                    (actionType === "send_message" && (!msgSubject.trim() || !msgBody.trim()))
                  }
                >
                  {addAction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Action
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ── Section 4: Execution History (active only) ─────────────── */}
        {workflow.status === "active" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Execution History</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Contacts that have been processed by this workflow.
                </p>
              </div>
              <ExecutionHistory workflowId={workflowId} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
