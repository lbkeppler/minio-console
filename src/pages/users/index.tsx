import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { type UserInfo, useAdminStore } from "@/stores/admin-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { CreateUserDialog } from "./create-user-dialog";

const columns: ColumnDef<UserInfo, string>[] = [
	{
		accessorKey: "access_key",
		header: "Access Key",
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<User className="h-4 w-4 text-[var(--color-accent)]" />
				<span className="font-medium">{row.original.access_key}</span>
			</div>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.original.status;
			const color = status === "enabled" ? "var(--color-success)" : "var(--color-danger)";
			return <span style={{ color }}>{status}</span>;
		},
	},
	{
		accessorKey: "policies",
		header: "Policies",
		cell: ({ row }) => (
			<div className="flex flex-wrap gap-1">
				{row.original.policies.map((p) => (
					<span key={p} className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs">
						{p}
					</span>
				))}
			</div>
		),
	},
];

export function UsersPage() {
	const { users, loadingUsers, loadUsers, deleteUser } = useAdminStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const [createOpen, setCreateOpen] = useState(false);

	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (hasActiveProfile) {
			loadUsers().catch((err) => {
				addToast({
					title: "Error loading users",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [hasActiveProfile, loadUsers, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Users</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a server profile first to view users.
				</p>
			</div>
		);
	}

	async function handleDelete(accessKey: string) {
		try {
			await deleteUser(accessKey);
			addToast({ title: `User "${accessKey}" deleted`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting user",
				description: String(err),
				variant: "error",
			});
		}
	}

	const columnsWithActions: ColumnDef<UserInfo, string>[] = [
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
							handleDelete(row.original.access_key);
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
				<h1 className="text-2xl font-semibold">Users</h1>
				<div className="flex items-center gap-2">
					{loadingUsers && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> Create User
					</Button>
				</div>
			</div>

			<DataTable columns={columnsWithActions} data={users} />

			<CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
