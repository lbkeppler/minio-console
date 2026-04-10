import { invoke } from "@tauri-apps/api/core";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface ObjectContent {
	content_type: string;
	size: number;
	data: string;
	is_text: boolean;
}

interface ObjectPreviewProps {
	bucket: string;
	objectKey: string;
	onClose: () => void;
}

function formatSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ObjectPreview({ bucket, objectKey, onClose }: ObjectPreviewProps) {
	const [content, setContent] = useState<ObjectContent | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { t } = useTranslation();

	useEffect(() => {
		setLoading(true);
		setError(null);
		setContent(null);

		invoke<ObjectContent>("get_object_content", {
			bucket,
			key: objectKey,
			maxSize: 5242880,
		})
			.then(setContent)
			.catch((err) => setError(String(err)))
			.finally(() => setLoading(false));
	}, [bucket, objectKey]);

	const filename = objectKey.split("/").pop() ?? objectKey;

	return (
		<div className="flex h-full flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
			<div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
				<h3 className="truncate text-sm font-medium" title={objectKey}>
					{filename}
				</h3>
				<Button variant="ghost" size="sm" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="flex-1 overflow-auto p-4">
				{loading && (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-secondary)]" />
					</div>
				)}

				{error && (
					<div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
						{error}
					</div>
				)}

				{content &&
					!loading &&
					!error &&
					(content.content_type.startsWith("image/") ? (
						<img
							src={`data:${content.content_type};base64,${content.data}`}
							alt={filename}
							className="max-w-full rounded"
						/>
					) : content.is_text ? (
						<pre className="whitespace-pre-wrap break-words text-sm">{content.data}</pre>
					) : (
						<p className="text-sm text-[var(--color-text-secondary)]">
							{t("pages.objects.binaryFileHint")}
						</p>
					))}
			</div>

			{content && !loading && (
				<div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)]">
					{content.content_type} &middot; {formatSize(content.size)}
				</div>
			)}
		</div>
	);
}
