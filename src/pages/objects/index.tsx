import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, File, FolderOpen, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { type ObjectInfo, useObjectStore } from "@/stores/object-store";
import { useToastStore } from "@/stores/toast-store";
import { ObjectActions } from "./object-actions";
import { ObjectPreview } from "./object-preview";
import { SearchBar } from "./search-bar";
import { UploadDialog } from "./upload-dialog";

function formatSize(bytes: number): string {
	if (bytes === 0) return "\u2014";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ObjectsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const bucket = searchParams.get("bucket") ?? "";
	const prefix = searchParams.get("prefix") ?? "";

	const { objects, loading, currentBucket, setBucket, setPrefix, loadObjects } = useObjectStore();
	const { addToast } = useToastStore();
	const [uploadOpen, setUploadOpen] = useState(false);
	const [previewKey, setPreviewKey] = useState<string | null>(null);

	useEffect(() => {
		if (bucket) {
			setBucket(bucket);
			setPrefix(prefix);
		}
	}, [bucket, prefix, setBucket, setPrefix]);

	useEffect(() => {
		if (currentBucket) {
			loadObjects().catch((err) => {
				addToast({
					title: "Error loading objects",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [currentBucket, loadObjects, addToast]);

	function navigateToPrefix(newPrefix: string) {
		setSearchParams({ bucket, prefix: newPrefix });
	}

	if (!bucket) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Objects</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a bucket from the Buckets page to browse objects.
				</p>
			</div>
		);
	}

	const prefixParts = prefix.split("/").filter(Boolean);
	const breadcrumbs = prefixParts.map((part, i) => ({
		label: part,
		prefix: prefixParts.slice(0, i + 1).join("/") + "/",
	}));

	const columns: ColumnDef<ObjectInfo, string>[] = [
		{
			accessorKey: "key",
			header: "Name",
			cell: ({ row }) => {
				const obj = row.original;
				const displayName = obj.is_prefix
					? obj.key.replace(prefix, "").replace(/\/$/, "")
					: obj.key.replace(prefix, "");
				return (
					<div className="flex items-center gap-2">
						{obj.is_prefix ? (
							<FolderOpen className="h-4 w-4 text-[var(--color-warning)]" />
						) : (
							<File className="h-4 w-4 text-[var(--color-text-tertiary)]" />
						)}
						<span className={obj.is_prefix ? "font-medium" : ""}>{displayName}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "size",
			header: "Size",
			cell: ({ row }) => formatSize(row.original.size),
		},
		{
			accessorKey: "last_modified",
			header: "Last Modified",
			cell: ({ row }) =>
				row.original.last_modified
					? new Date(row.original.last_modified).toLocaleString()
					: "\u2014",
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (row.original.is_prefix ? null : <ObjectActions object={row.original} />),
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{bucket}</h1>
				<div className="flex items-center gap-2">
					{loading && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={() => setUploadOpen(true)} size="sm">
						<Upload className="h-4 w-4" /> Upload
					</Button>
				</div>
			</div>

			<nav className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
				<button
					type="button"
					onClick={() => navigateToPrefix("")}
					className="hover:text-[var(--color-text)]"
				>
					/
				</button>
				{breadcrumbs.map((crumb) => (
					<span key={crumb.prefix} className="flex items-center gap-1">
						<ChevronRight className="h-3 w-3" />
						<button
							type="button"
							onClick={() => navigateToPrefix(crumb.prefix)}
							className="hover:text-[var(--color-text)]"
						>
							{crumb.label}
						</button>
					</span>
				))}
			</nav>

			<SearchBar
				onSearch={(query) => {
					navigateToPrefix(query ? prefix + query : prefix);
				}}
			/>

			<div className="flex gap-4">
				<div className={previewKey ? "w-1/2" : "w-full"}>
					<DataTable
						columns={columns}
						data={objects}
						onRowClick={(obj) => {
							if (obj.is_prefix) {
								navigateToPrefix(obj.key);
							} else {
								setPreviewKey(obj.key);
							}
						}}
					/>
				</div>
				{previewKey && (
					<div className="w-1/2">
						<ObjectPreview
							bucket={bucket}
							objectKey={previewKey}
							onClose={() => setPreviewKey(null)}
						/>
					</div>
				)}
			</div>

			<UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
		</div>
	);
}
