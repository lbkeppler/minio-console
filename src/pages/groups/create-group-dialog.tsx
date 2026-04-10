import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";

const groupSchema = z.object({
	name: z.string().min(1, "Group name is required"),
	members: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
	const { createGroup, addGroupMembers } = useAdminStore();
	const { addToast } = useToastStore();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<GroupFormData>({
		resolver: zodResolver(groupSchema),
	});

	async function onSubmit(data: GroupFormData) {
		try {
			await createGroup(data.name);
			const members = (data.members ?? "")
				.split(",")
				.map((m) => m.trim())
				.filter(Boolean);
			if (members.length > 0) {
				await addGroupMembers(data.name, members);
			}
			addToast({ title: `Group "${data.name}" created`, variant: "success" });
			reset();
			onOpenChange(false);
		} catch (err) {
			addToast({
				title: "Error creating group",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Group</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="group-name" className="text-sm font-medium">
							Group Name
						</label>
						<Input id="group-name" placeholder="my-group" {...register("name")} />
						{errors.name && (
							<p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
						)}
					</div>
					<div className="space-y-2">
						<label htmlFor="group-members" className="text-sm font-medium">
							Members
						</label>
						<Input id="group-members" placeholder="user1, user2, user3" {...register("members")} />
						<p className="text-xs text-[var(--color-text-tertiary)]">
							Comma-separated list of user access keys.
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Create
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
