"use client";

import Link from "next/link";
import { Repeat2, Users, Grid3x3, Trash2 } from "lucide-react";
import { Sequence } from "@crm/shared";
import { useDeleteSequence } from "@/lib/hooks/use-sequences";

const statusStyles: Record<string, string> = {
	draft: "bg-yellow-100 text-yellow-700",
	active: "bg-green-100 text-green-700",
	paused: "bg-orange-100 text-orange-700",
};

export function SequenceCard({ sequence }: { sequence: Sequence }) {
	const badgeClass =
		statusStyles[sequence.status] ?? "bg-gray-100 text-gray-600";
  const deleteSequence = useDeleteSequence();
	return (
		<div className='rounded-lg border border-gray-200 bg-white p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow'>
			<div className='flex items-start justify-between'>
				<div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-50'>
					<Repeat2 className='h-5 w-5 text-blue-600' />
				</div>
				<span
					className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
				>
					{sequence.status}
				</span>
			</div>

			<div>
				<p className='text-xl font-bold text-gray-900 leading-snug'>
					{sequence.name}
				</p>
			</div>

			<div className='flex items-center gap-4 text-sm text-gray-500'>
				<div className='flex items-center gap-1.5'>
					<Users className='h-4 w-4' />
					<span>0 enrolled</span>
				</div>
				<div className='flex items-center gap-1.5'>
					<Grid3x3 className='h-4 w-4' />
					<span>{sequence.stepCount} steps</span>
				</div>
			</div>

			<div className='flex items-center justify-between'>
				<Link
					href={`/sequences/${sequence.id}/edit`}
					className='text-sm font-medium text-blue-600 hover:underline'
				>
					View / Edit
				</Link>
				<button
					type='button'
					aria-label='Delete sequence'
					onClick={() => deleteSequence.mutate(sequence.id)}
					disabled={deleteSequence.isPending}
					className='rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50'
				>
					<Trash2 className='h-4 w-4' />
				</button>
			</div>
		</div>
	);
}
