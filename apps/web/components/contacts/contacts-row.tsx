import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useDeleteContact } from "@/lib/hooks/use-contacts";
import { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Contact } from "@crm/shared";
import { StatusBadge } from "@/components/ui/status-badge";
type ContactRowProps = {
	contact: Contact;
	onEdit: (contact: Contact) => void;
};

export function ContactRow({ contact, onEdit }: ContactRowProps) {
	const deleteContact = useDeleteContact();
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		if (!deleting) {
			setDeleting(true);
			return;
		}
		await deleteContact.mutateAsync(contact.id);
		setDeleting(false);
	}

	return (
		<TableRow>
			<TableCell className='font-medium text-gray-900'>
				{contact.name}
			</TableCell>
			<TableCell className='text-gray-600'>
				{contact.email ?? "—"}
			</TableCell>
			<TableCell className='text-gray-600'>
				{contact.phone ?? "—"}
			</TableCell>
			<TableCell className='text-gray-600'>
				{contact.company ?? "—"}
			</TableCell>
			<TableCell>
				<div className='flex flex-wrap gap-1'>
					{contact.tags.length > 0 ? (
						contact.tags.map((tag) => (
							<Badge
								key={tag}
								variant='outline'
								className='text-xs'
							>
								{tag}
							</Badge>
						))
					) : (
						<span className='text-gray-400'>—</span>
					)}
				</div>
			</TableCell>
			<TableCell>
				<StatusBadge status={contact.status} />
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant='ghost'
							size='icon'
							className='h-8 w-8'
						>
							<MoreHorizontal className='h-4 w-4' />
							<span className='sr-only'>Open menu</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						<DropdownMenuItem
							className='text-blue-600 focus:text-blue-600'
							onClick={() => onEdit(contact)}
						>
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							className='text-red-600 focus:text-red-600'
							onClick={handleDelete}
							disabled={deleteContact.isPending}
						>
							{deleteContact.isPending ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : null}
							{deleting ? "Confirm Delete" : "Delete"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}
