import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type GroupInfo, useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";

interface GroupMembersDialogProps {
	group: GroupInfo;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function GroupMembersDialog({ group, open, onOpenChange }: GroupMembersDialogProps) {
	const { addGroupMembers, removeGroupMembers } = useAdminStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const [newMember, setNewMember] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleAdd() {
		const member = newMember.trim();
		if (!member) return;
		setLoading(true);
		try {
			await addGroupMembers(group.name, [member]);
			addToast({ title: `Added "${member}" to group`, variant: "success" });
			setNewMember("");
		} catch (err) {
			addToast({
				title: "Error adding member",
				description: String(err),
				variant: "error",
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleRemove(member: string) {
		setLoading(true);
		try {
			await removeGroupMembers(group.name, [member]);
			addToast({ title: `Removed "${member}" from group`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error removing member",
				description: String(err),
				variant: "error",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("pages.groups.membersOf", { name: group.name })}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex gap-2">
						<Input
							placeholder={t("pages.groups.addMember")}
							value={newMember}
							onChange={(e) => setNewMember(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAdd();
								}
							}}
						/>
						<Button size="icon" onClick={handleAdd} disabled={loading || !newMember.trim()}>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
						</Button>
					</div>
					<div className="max-h-64 space-y-1 overflow-y-auto">
						{group.members.length === 0 && (
							<p className="text-sm text-[var(--color-text-secondary)]">
								{t("pages.groups.noMembers")}
							</p>
						)}
						{group.members.map((member) => (
							<div
								key={member}
								className="flex items-center justify-between rounded px-2 py-1 hover:bg-[var(--color-bg-secondary)]"
							>
								<span className="text-sm">{member}</span>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleRemove(member)}
									disabled={loading}
								>
									<X className="h-3 w-3 text-[var(--color-danger)]" />
								</Button>
							</div>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
