import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useObjectStore } from "@/stores/object-store";
import { useToastStore } from "@/stores/toast-store";

interface UploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
	const { currentPrefix, uploadObject } = useObjectStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const [uploading, setUploading] = useState(false);

	async function handleSelectFiles() {
		try {
			const selected = await openDialog({
				multiple: true,
				directory: false,
			});
			if (!selected) return;

			const files = Array.isArray(selected) ? selected : [selected];
			setUploading(true);

			for (const filePath of files) {
				const path = filePath;
				const fileName = path.split(/[/\\]/).pop() ?? path;
				const key = currentPrefix + fileName;
				await uploadObject(key, path);
			}

			addToast({
				title: `${files.length} file(s) uploaded`,
				variant: "success",
			});
			onOpenChange(false);
		} catch (err) {
			addToast({
				title: "Error uploading files",
				description: String(err),
				variant: "error",
			});
		} finally {
			setUploading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("pages.objects.uploadFiles")}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-[var(--color-text-secondary)]">
						{t("pages.objects.uploadTo")}{" "}
						<code className="rounded bg-[var(--color-bg-tertiary)] px-1 py-0.5">
							{currentPrefix || "/"}
						</code>
					</p>
					<div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] py-8">
						<Upload className="mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
						<Button onClick={handleSelectFiles} disabled={uploading}>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("pages.objects.selectFiles")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
