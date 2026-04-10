import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBucketConfigStore } from "@/stores/bucket-config-store";
import { useToastStore } from "@/stores/toast-store";
import { LifecycleRules } from "./lifecycle-rules";

export function BucketSettingsPage() {
	const [searchParams] = useSearchParams();
	const bucket = searchParams.get("bucket") ?? "";
	const { config, loading, loadConfig, setVersioning, setPolicy, deletePolicy } =
		useBucketConfigStore();
	const { addToast } = useToastStore();
	const [policyText, setPolicyText] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (bucket) {
			loadConfig(bucket).catch((err) => {
				addToast({
					title: "Error loading bucket config",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [bucket, loadConfig, addToast]);

	useEffect(() => {
		setPolicyText(config?.policy ?? "");
	}, [config?.policy]);

	async function handleToggleVersioning() {
		const enabled = config?.versioning !== "Enabled";
		try {
			await setVersioning(bucket, enabled);
			addToast({
				title: `Versioning ${enabled ? "enabled" : "suspended"}`,
				variant: "success",
			});
		} catch (err) {
			addToast({
				title: "Error setting versioning",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handleSavePolicy() {
		setSaving(true);
		try {
			if (policyText.trim() === "") {
				await deletePolicy(bucket);
				addToast({ title: "Bucket policy deleted", variant: "success" });
			} else {
				await setPolicy(bucket, policyText);
				addToast({ title: "Bucket policy saved", variant: "success" });
			}
		} catch (err) {
			addToast({
				title: "Error saving policy",
				description: String(err),
				variant: "error",
			});
		} finally {
			setSaving(false);
		}
	}

	if (!bucket) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Bucket Settings</h1>
				<p className="text-[var(--color-text-secondary)]">No bucket specified.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/buckets">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<h1 className="text-2xl font-semibold">{bucket} — Settings</h1>
				{loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />}
			</div>

			{/* Versioning */}
			<section className="space-y-3 rounded-md border border-[var(--color-border)] p-4">
				<h2 className="text-lg font-medium">Versioning</h2>
				<div className="flex items-center gap-4">
					<span className="text-sm">
						Status:{" "}
						<span className="font-medium">
							{config?.versioning === "Enabled" ? "Enabled" : "Disabled"}
						</span>
					</span>
					<Button size="sm" variant="outline" onClick={handleToggleVersioning}>
						{config?.versioning === "Enabled" ? "Suspend" : "Enable"}
					</Button>
				</div>
			</section>

			{/* Policy */}
			<section className="space-y-3 rounded-md border border-[var(--color-border)] p-4">
				<h2 className="text-lg font-medium">Bucket Policy</h2>
				<textarea
					className="min-h-[160px] w-full rounded-md border border-[var(--color-border)] bg-transparent p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
					placeholder="Paste JSON policy here, or leave empty and save to delete"
					value={policyText}
					onChange={(e) => setPolicyText(e.target.value)}
				/>
				<div className="flex justify-end">
					<Button size="sm" onClick={handleSavePolicy} disabled={saving}>
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}
						Save Policy
					</Button>
				</div>
			</section>

			{/* Lifecycle Rules */}
			<section className="rounded-md border border-[var(--color-border)] p-4">
				<LifecycleRules bucket={bucket} />
			</section>
		</div>
	);
}
