import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { type PolicyInfo, useAdminStore } from "@/stores/admin-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";

export function PoliciesPage() {
	const { policies, loadingPolicies, loadPolicies, deletePolicy } = useAdminStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [createOpen, setCreateOpen] = useState(false);
	const [newName, setNewName] = useState("");

	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (hasActiveProfile) {
			loadPolicies().catch((err) => {
				addToast({
					title: "Error loading policies",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [hasActiveProfile, loadPolicies, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">{t("pages.policies.title")}</h1>
				<p className="text-[var(--color-text-secondary)]">
					{t("pages.policies.selectProfileFirst")}
				</p>
			</div>
		);
	}

	async function handleDelete(name: string) {
		try {
			await deletePolicy(name);
			addToast({ title: `Policy "${name}" deleted`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting policy",
				description: String(err),
				variant: "error",
			});
		}
	}

	function handleCreate() {
		const trimmed = newName.trim();
		if (!trimmed) return;
		setCreateOpen(false);
		setNewName("");
		navigate(`/policies/editor?name=${encodeURIComponent(trimmed)}&new=true`);
	}

	const columns: ColumnDef<PolicyInfo, string>[] = [
		{
			accessorKey: "name",
			header: t("common.name"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Shield className="h-4 w-4 text-[var(--color-accent)]" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			),
		},
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
							navigate(`/policies/editor?name=${encodeURIComponent(row.original.name)}`);
						}}
					>
						<Pencil className="h-4 w-4" />
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
				<h1 className="text-2xl font-semibold">{t("pages.policies.title")}</h1>
				<div className="flex items-center gap-2">
					{loadingPolicies && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> {t("pages.policies.createPolicy")}
					</Button>
				</div>
			</div>

			<DataTable columns={columns} data={policies} />

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("pages.policies.createPolicy")}</DialogTitle>
					</DialogHeader>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleCreate();
						}}
						className="space-y-4"
					>
						<div>
							<label htmlFor="policy-name" className="mb-1 block text-sm font-medium">
								{t("pages.policies.policyName")}
							</label>
							<input
								id="policy-name"
								type="text"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="e.g. readonly"
								autoFocus
								className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<DialogClose asChild>
								<Button type="button" variant="outline">
									{t("common.cancel")}
								</Button>
							</DialogClose>
							<Button type="submit" disabled={!newName.trim()}>
								{t("common.continue")}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
