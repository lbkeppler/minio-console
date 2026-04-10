import { save } from "@tauri-apps/plugin-dialog";
import { Download, Link, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ObjectInfo, useObjectStore } from "@/stores/object-store";
import { useToastStore } from "@/stores/toast-store";

interface ObjectActionsProps {
	object: ObjectInfo;
}

export function ObjectActions({ object }: ObjectActionsProps) {
	const { deleteObject, getPresignedUrl, downloadObject } = useObjectStore();
	const { addToast } = useToastStore();

	async function handleDelete() {
		try {
			await deleteObject(object.key);
			addToast({ title: "Object deleted", variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting object",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handlePresignedUrl() {
		try {
			const result = await getPresignedUrl(object.key);
			await navigator.clipboard.writeText(result.url);
			addToast({
				title: "Presigned URL copied to clipboard",
				description: `Expires in ${result.expires_in_secs / 60} minutes`,
				variant: "success",
			});
		} catch (err) {
			addToast({
				title: "Error generating URL",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handleDownload() {
		try {
			const fileName = object.key.split("/").pop() ?? object.key;
			const destination = await save({ defaultPath: fileName });
			if (destination) {
				await downloadObject(object.key, destination);
				addToast({ title: "Download complete", variant: "success" });
			}
		} catch (err) {
			addToast({
				title: "Error downloading",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleDownload}>
					<Download className="mr-2 h-4 w-4" /> Download
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handlePresignedUrl}>
					<Link className="mr-2 h-4 w-4" /> Copy Presigned URL
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDelete} className="text-[var(--color-danger)]">
					<Trash2 className="mr-2 h-4 w-4" /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
