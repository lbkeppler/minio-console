import type { ColumnDef } from "@tanstack/react-table";
import { Database, Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { type BucketInfo, useBucketStore } from "@/stores/bucket-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { CreateBucketDialog } from "./create-bucket-dialog";

export function BucketsPage() {
	const { buckets, loading, loadBuckets, deleteBucket } = useBucketStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [createOpen, setCreateOpen] = useState(false);

	const hasActiveProfile = !!config?.active_profile_id;

	const columns: ColumnDef<BucketInfo, string>[] = [
		{
			accessorKey: "name",
			header: t("common.name"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Database className="h-4 w-4 text-[var(--color-accent)]" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			),
		},
		{
			accessorKey: "creation_date",
			header: t("common.created"),
			cell: ({ row }) =>
				row.original.creation_date
					? new Date(row.original.creation_date).toLocaleDateString()
					: "—",
		},
	];

	useEffect(() => {
		if (hasActiveProfile) {
			loadBuckets().catch((err) => {
				addToast({
					title: "Error loading buckets",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [hasActiveProfile, loadBuckets, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">{t("pages.buckets.title")}</h1>
				<p className="text-[var(--color-text-secondary)]">
					{t("pages.buckets.selectProfileFirst")}
				</p>
			</div>
		);
	}

	async function handleDelete(name: string) {
		try {
			await deleteBucket(name);
			addToast({ title: `Bucket "${name}" deleted`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting bucket",
				description: String(err),
				variant: "error",
			});
		}
	}

	const columnsWithActions: ColumnDef<BucketInfo, string>[] = [
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
							navigate(`/buckets/settings?bucket=${row.original.name}`);
						}}
					>
						<Settings className="h-4 w-4" />
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
				<h1 className="text-2xl font-semibold">{t("pages.buckets.title")}</h1>
				<div className="flex items-center gap-2">
					{loading && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> {t("pages.buckets.createBucket")}
					</Button>
				</div>
			</div>

			<DataTable
				columns={columnsWithActions}
				data={buckets}
				onRowClick={(bucket) => navigate(`/objects?bucket=${bucket.name}`)}
			/>

			<CreateBucketDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
