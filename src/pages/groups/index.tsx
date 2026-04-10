import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, Trash2, Users, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { type GroupInfo, useAdminStore } from "@/stores/admin-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupMembersDialog } from "./group-members-dialog";

export function GroupsPage() {
	const { groups, loadingGroups, loadGroups, deleteGroup } = useAdminStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const [createOpen, setCreateOpen] = useState(false);
	const [membersGroup, setMembersGroup] = useState<GroupInfo | null>(null);

	const hasActiveProfile = !!config?.active_profile_id;

	const columns: ColumnDef<GroupInfo, string>[] = [
		{
			accessorKey: "name",
			header: t("common.name"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<UsersRound className="h-4 w-4 text-[var(--color-accent)]" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			),
		},
		{
			id: "members",
			header: t("pages.groups.members"),
			cell: ({ row }) => <span>{row.original.members.length}</span>,
		},
		{
			id: "policies",
			header: t("pages.policies.title"),
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.policies.map((p) => (
						<span
							key={p}
							className="inline-block rounded bg-[var(--color-bg-secondary)] px-2 py-0.5 text-xs"
						>
							{p}
						</span>
					))}
				</div>
			),
		},
	];

	useEffect(() => {
		if (hasActiveProfile) {
			loadGroups().catch((err) => {
				addToast({
					title: "Error loading groups",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [hasActiveProfile, loadGroups, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">{t("pages.groups.title")}</h1>
				<p className="text-[var(--color-text-secondary)]">{t("pages.groups.selectProfileFirst")}</p>
			</div>
		);
	}

	async function handleDelete(name: string) {
		try {
			await deleteGroup(name);
			addToast({ title: `Group "${name}" deleted`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting group",
				description: String(err),
				variant: "error",
			});
		}
	}

	const columnsWithActions: ColumnDef<GroupInfo, string>[] = [
		...columns,
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							setMembersGroup(row.original);
						}}
					>
						<Users className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							handleDelete(row.original.name);
						}}
					>
						<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{t("pages.groups.title")}</h1>
				<div className="flex items-center gap-2">
					{loadingGroups && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> {t("pages.groups.createGroup")}
					</Button>
				</div>
			</div>

			<DataTable columns={columnsWithActions} data={groups} />

			<CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />

			{membersGroup && (
				<GroupMembersDialog
					group={membersGroup}
					open={!!membersGroup}
					onOpenChange={(open) => {
						if (!open) setMembersGroup(null);
					}}
				/>
			)}
		</div>
	);
}
