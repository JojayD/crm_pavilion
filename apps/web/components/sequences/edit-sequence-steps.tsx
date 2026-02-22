"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
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
  useSequence,
  useUpdateSequence,
  useSequenceSteps,
  useAddStep,
  useDeleteStep,
} from "@/lib/hooks/use-sequences";
import { SequenceEnrollPanel } from "@/components/sequences/sequence-enroll-panel";
import { SequenceChannel } from "@crm/shared";
import {
  SUPPORTED_SEND_TIMEZONES,
  hourInTimezoneToUTC,
  formatHourLabel,
  type SendTimezoneId,
} from "@/lib/util/timezone";

type Props = {
  sequenceId: string;
};

const channelLabels: Record<SequenceChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
};

export function EditSequenceSteps({ sequenceId }: Props) {
  const router = useRouter();
  const { data: sequence } = useSequence(sequenceId);
  const { data: steps = [], isLoading: stepsLoading } =
    useSequenceSteps(sequenceId);
  const updateSequence = useUpdateSequence();
  const addStep = useAddStep(sequenceId);
  const deleteStep = useDeleteStep(sequenceId);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [channel, setChannel] = useState<SequenceChannel>("email");
  const [content, setContent] = useState("");
  const [sendTimezone, setSendTimezone] = useState<SendTimezoneId>(
    "America/Los_Angeles"
  );
  const [sendHour, setSendHour] = useState(9);

  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: formatHourLabel(i),
  }));

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const utcHour = hourInTimezoneToUTC(sendHour, sendTimezone);

    await addStep.mutateAsync({
      dayOffset,
      stepOrder: steps.length,
      channel,
      content: content.trim(),
      sendHour: utcHour,
    });

    setDayOffset(0);
    setChannel("email");
    setContent("");
    setSendHour(9);
  }


  async function handlePublish() {
    await updateSequence.mutateAsync({
      id: sequenceId,
      data: { status: "active" },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <Link
          href="/sequences"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {/* Progress pills — both blue on step 2 */}
        <div className="flex gap-2 ml-4">
          <div className="h-2 w-16 rounded-full bg-blue-600" />
          <div className="h-2 w-16 rounded-full bg-blue-600" />
        </div>
      </div>

      {/* Header card */}
      <div className="px-6 pt-6">
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-0.5">
                Editing Draft
              </p>
              <h1 className="text-xl font-bold text-gray-900">
                {sequence?.name ?? "Loading…"}
              </h1>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePublish}
              disabled={updateSequence.isPending || steps.length === 0 || sequence?.status === "active"}
            >
              {updateSequence.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Publish & Activate
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 gap-6 px-6 pb-10 lg:grid-cols-2">
        {/* Left — Add step form */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Add New Step</h2>
            </div>

            <form onSubmit={handleAddStep} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dayOffset">Day Offset</Label>
                <Input
                  id="dayOffset"
                  type="number"
                  min={0}
                  value={dayOffset}
                  onChange={(e) => setDayOffset(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="channel">Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as SequenceChannel)}
                >
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Time zone</Label>
                <Select
                  value={sendTimezone}
                  onValueChange={(v) => setSendTimezone(v as SendTimezoneId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_SEND_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sendHour">
                  Send hour (
                  {SUPPORTED_SEND_TIMEZONES.find((tz) => tz.value === sendTimezone)?.label ?? sendTimezone}
                  )
                </Label>
                <Select
                  value={String(sendHour)}
                  onValueChange={(v) => setSendHour(Number(v))}
                >
                  <SelectTrigger id="sendHour">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h.value} value={String(h.value)}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your message here…"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={addStep.isPending || !content.trim()}
              >
                {addStep.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Step to Timeline
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right — Timeline */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
              Timeline Summary
            </p>

            {stepsLoading && (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading steps…
              </div>
            )}

            {!stepsLoading && steps.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400">
                No steps yet. Add your first step on the left.
              </p>
            )}

            {!stepsLoading && steps.length > 0 && (
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        {channelLabels[step.channel]} · Day {step.dayOffset} · {formatHourLabel(step.sendHour)} {SUPPORTED_SEND_TIMEZONES.find((tz) => tz.value === sendTimezone)?.label ?? sendTimezone}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-700 truncate">
                        {step.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete step"
                      onClick={() => {
                        if (confirmingDeleteId !== step.id) {
                          setConfirmingDeleteId(step.id);
                        } else {
                          deleteStep.mutate(step.id);
                          setConfirmingDeleteId(null);
                        }
                      }}
                      className={confirmingDeleteId === step.id
                        ? "flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        : "flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      }
                    >
                      {confirmingDeleteId === step.id ? "Confirm?" : <Trash2 className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enrollment panel — locked until sequence is published */}
      <div className="px-6 pb-10">
        <SequenceEnrollPanel
          sequenceId={sequenceId}
          sequenceStatus={sequence?.status ?? "draft"}
        />
      </div>
    </div>
  );
}
