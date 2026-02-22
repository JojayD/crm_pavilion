"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Repeat2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateSequence } from "@/lib/hooks/use-sequences";

export function CreateSequenceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const createSequence = useCreateSequence();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await createSequence.mutateAsync({ name: name.trim() });
    router.push(`/sequences/${res.data.id}/edit`);
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
        {/* Progress pills */}
        <div className="flex gap-2 ml-4">
          <div className="h-2 w-16 rounded-full bg-blue-600" />
          <div className="h-2 w-16 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Centered card */}
      <div className="flex items-center justify-center p-10">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Repeat2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-semibold text-gray-900">
                  1. Setup Sequence
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Give your sequence a name to get started.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Sequence Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Welcome Email Series"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createSequence.isPending || !name.trim()}
              >
                {createSequence.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Draft & Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
