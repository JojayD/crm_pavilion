"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Workflow, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCreateWorkflow } from "@/lib/hooks/use-workflows";
import { TriggerType } from "@crm/shared";

const triggerOptions: { value: TriggerType; label: string }[] = [
	{ value: "contact_created", label: "Contact Created" },
	{ value: "tag_added", label: "Tag Added" },
	{ value: "scheduled", label: "Scheduled (Cron)" },
	// { value: "member_inactive", label: "Member Inactive" },
];

export function CreateWorkflowForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const [triggerType, setTriggerType] =
		useState<TriggerType>("contact_created");
	const createWorkflow = useCreateWorkflow();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		if (!name.trim()) return;
		try {
			const res = await createWorkflow.mutateAsync({
				name: name.trim(),
				triggerType,
			});
			router.push(`/workflows/${res.data.id}/edit`);
		} catch (error) {
			console.error(error);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Top bar */}
			<div className='flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4'>
				<Link
					href='/workflows'
					className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900'
				>
					<ArrowLeft className='h-4 w-4' />
					Back
				</Link>
				{/* Progress pills */}
				<div className='flex gap-2 ml-4'>
					<div className='h-2 w-16 rounded-full bg-purple-600' />
					<div className='h-2 w-16 rounded-full bg-gray-200' />
				</div>
			</div>

			{/* Centered card */}
			<div className='flex items-center justify-center p-10'>
				<Card className='w-full max-w-md shadow-sm'>
					<CardContent className='p-8'>
						<div className='flex flex-col items-center gap-3 mb-6'>
							<div className='flex h-12 w-12 items-center justify-center rounded-full bg-purple-50'>
								<Workflow className='h-6 w-6 text-purple-600' />
							</div>
							<div className='text-center'>
								<h1 className='text-lg font-semibold text-gray-900'>
									1. Setup Workflow
								</h1>
								<p className='text-sm text-gray-500 mt-1'>
									Name your workflow and choose what triggers it.
								</p>
							</div>
						</div>

						<form
							onSubmit={handleSubmit}
							className='space-y-4'
						>
							<div className='space-y-1.5'>
								<Label htmlFor='name'>Workflow Name</Label>
								<Input
									id='name'
									placeholder='e.g. Welcome New Members'
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>

							<div className='space-y-1.5'>
								<Label htmlFor='triggerType'>Trigger</Label>
								<Select
									value={triggerType}
									onValueChange={(v) => setTriggerType(v as TriggerType)}
								>
									<SelectTrigger id='triggerType'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{triggerOptions.map((opt) => (
											<SelectItem
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<Button
								type='submit'
								className='w-full bg-purple-600 hover:bg-purple-700'
								disabled={submitting || createWorkflow.isPending || !name.trim()}
							>
								{createWorkflow.isPending && (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
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
