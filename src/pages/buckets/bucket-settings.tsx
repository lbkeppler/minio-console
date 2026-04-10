import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBucketConfigStore } from "@/stores/bucket-config-store";
import { useToastStore } from "@/stores/toast-store";
import { LifecycleRules } from "./lifecycle-rules";

type AccessMode = "private" | "download" | "public" | "custom";

function generatePolicy(bucket: string, mode: "download" | "public"): string {
	const actions =
		mode === "download"
			? ["s3:GetBucketLocation", "s3:ListBucket", "s3:GetObject"]
			: [
					"s3:GetBucketLocation",
					"s3:ListBucket",
					"s3:GetObject",
					"s3:PutObject",
					"s3:DeleteObject",
				];
	return JSON.stringify(
		{
			Version: "2012-10-17",
			Statement: [
				{
					Effect: "Allow",
					Principal: { AWS: ["*"] },
					Action: actions,
					Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
				},
			],
		},
		null,
		2,
	);
}

function detectAccessMode(policy: string, bucket: string): AccessMode {
	if (!policy.trim()) return "private";
	try {
		const downloadPolicy = generatePolicy(bucket, "download");
		const publicPolicy = generatePolicy(bucket, "public");
		const normalized = JSON.stringify(JSON.parse(policy));
		if (normalized === JSON.stringify(JSON.parse(downloadPolicy))) return "download";
		if (normalized === JSON.stringify(JSON.parse(publicPolicy))) return "public";
	} catch {
		/* invalid JSON */
	}
	return "custom";
}

export function BucketSettingsPage() {
	const [searchParams] = useSearchParams();
	const bucket = searchParams.get("bucket") ?? "";
	const { config, loading, loadConfig, setVersioning, setPolicy, deletePolicy } =
		useBucketConfigStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const [policyText, setPolicyText] = useState("");
	const [accessMode, setAccessMode] = useState<"private" | "download" | "public" | "custom">(
		"private",
	);
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
		const policy = config?.policy ?? "";
		setPolicyText(policy);
		setAccessMode(detectAccessMode(policy, bucket));
	}, [config?.policy, bucket]);

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
			if (accessMode === "private") {
				await deletePolicy(bucket);
				addToast({ title: t("pages.buckets.policyDeleted"), variant: "success" });
			} else {
				const policy = accessMode === "custom" ? policyText : generatePolicy(bucket, accessMode);
				await setPolicy(bucket, policy);
				addToast({ title: t("pages.buckets.policySaved"), variant: "success" });
			}
		} catch (err) {
			addToast({
				title: t("pages.buckets.policyError"),
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
				<h1 className="text-2xl font-semibold">{t("pages.buckets.settings")}</h1>
				<p className="text-[var(--color-text-secondary)]">{t("pages.buckets.noBucketSpecified")}</p>
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
				<h1 className="text-2xl font-semibold">
					{bucket} — {t("pages.buckets.settings")}
				</h1>
				{loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />}
			</div>

			{/* Versioning */}
			<section className="space-y-3 rounded-md border border-[var(--color-border)] p-4">
				<h2 className="text-lg font-medium">{t("pages.buckets.versioning")}</h2>
				<div className="flex items-center gap-4">
					<span className="text-sm">
						{t("common.status")}:{" "}
						<span className="font-medium">
							{config?.versioning === "Enabled" ? t("common.enabled") : t("common.disabled")}
						</span>
					</span>
					<Button size="sm" variant="outline" onClick={handleToggleVersioning}>
						{config?.versioning === "Enabled" ? t("common.suspend") : t("common.enable")}
					</Button>
				</div>
			</section>

			{/* Access Policy */}
			<section className="space-y-3 rounded-md border border-[var(--color-border)] p-4">
				<h2 className="text-lg font-medium">{t("pages.buckets.bucketPolicy")}</h2>
				<p className="text-sm text-[var(--color-text-secondary)]">
					{t("pages.buckets.policyDescription")}
				</p>
				<div className="flex flex-wrap gap-2">
					{(["private", "download", "public", "custom"] as const).map((mode) => (
						<button
							key={mode}
							type="button"
							onClick={() => setAccessMode(mode)}
							className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
								accessMode === mode
									? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
									: "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]"
							}`}
						>
							{t(`pages.buckets.accessMode.${mode}`)}
						</button>
					))}
				</div>
				{accessMode !== "custom" && (
					<p className="text-xs text-[var(--color-text-tertiary)]">
						{t(`pages.buckets.accessModeHint.${accessMode}`)}
					</p>
				)}
				{accessMode === "custom" && (
					<textarea
						className="min-h-[160px] w-full rounded-md border border-[var(--color-border)] bg-transparent p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
						placeholder={t("pages.buckets.policyPlaceholder")}
						value={policyText}
						onChange={(e) => setPolicyText(e.target.value)}
					/>
				)}
				<div className="flex justify-end">
					<Button size="sm" onClick={handleSavePolicy} disabled={saving}>
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}
						{t("pages.buckets.savePolicy")}
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
