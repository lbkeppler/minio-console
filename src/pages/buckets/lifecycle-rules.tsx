import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBucketConfigStore } from "@/stores/bucket-config-store";
import { useToastStore } from "@/stores/toast-store";

interface LifecycleRulesProps {
	bucket: string;
}

export function LifecycleRules({ bucket }: LifecycleRulesProps) {
	const { lifecycleRules, loadLifecycleRules, putLifecycleRule, deleteLifecycleRule } =
		useBucketConfigStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const [dialogOpen, setDialogOpen] = useState(false);

	const lifecycleRuleSchema = z.object({
		id: z.string().min(1, t("validation.ruleIdRequired")),
		prefix: z.string().optional().default(""),
		expirationDays: z.coerce.number().min(1, t("validation.minOneDay")),
	});

	type LifecycleRuleFormData = z.infer<typeof lifecycleRuleSchema>;

	useEffect(() => {
		loadLifecycleRules(bucket).catch((err) => {
			addToast({
				title: "Error loading lifecycle rules",
				description: String(err),
				variant: "error",
			});
		});
	}, [bucket, loadLifecycleRules, addToast]);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<LifecycleRuleFormData>({
		resolver: zodResolver(lifecycleRuleSchema),
		defaultValues: { id: "", prefix: "", expirationDays: 30 },
	});

	async function onSubmit(data: LifecycleRuleFormData) {
		try {
			await putLifecycleRule(bucket, {
				id: data.id,
				prefix: data.prefix ?? "",
				status: "Enabled",
				expiration_days: data.expirationDays,
			});
			addToast({ title: `Lifecycle rule "${data.id}" added`, variant: "success" });
			reset();
			setDialogOpen(false);
		} catch (err) {
			addToast({
				title: "Error adding lifecycle rule",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handleDelete(ruleId: string) {
		try {
			await deleteLifecycleRule(bucket, ruleId);
			addToast({ title: `Rule "${ruleId}" deleted`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting lifecycle rule",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium">{t("pages.buckets.lifecycleRules")}</h3>
				<Button size="sm" onClick={() => setDialogOpen(true)}>
					<Plus className="h-4 w-4" /> {t("pages.buckets.addRule")}
				</Button>
			</div>

			{lifecycleRules.length === 0 ? (
				<p className="text-sm text-[var(--color-text-secondary)]">
					{t("pages.buckets.noLifecycleRules")}
				</p>
			) : (
				<div className="space-y-2">
					{lifecycleRules.map((rule) => (
						<div
							key={rule.id}
							className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-4 py-3"
						>
							<div className="space-y-1">
								<p className="text-sm font-medium">{rule.id}</p>
								<p className="text-xs text-[var(--color-text-secondary)]">
									{t("common.prefix")}: {rule.prefix || "(none)"} · {t("common.expirationDays")}:{" "}
									{rule.expiration_days != null ? `${rule.expiration_days}` : "—"} ·{" "}
									{t("common.status")}: {rule.status}
								</p>
							</div>
							<Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
								<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
							</Button>
						</div>
					))}
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("pages.buckets.addRule")}</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="rule-id" className="text-sm font-medium">
								{t("pages.buckets.ruleId")}
							</label>
							<Input id="rule-id" placeholder="expire-logs" {...register("id")} />
							{errors.id && (
								<p className="text-xs text-[var(--color-danger)]">{errors.id.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<label htmlFor="rule-prefix" className="text-sm font-medium">
								{t("common.prefix")}
							</label>
							<Input id="rule-prefix" placeholder="logs/" {...register("prefix")} />
							<p className="text-xs text-[var(--color-text-tertiary)]">
								{t("pages.buckets.prefixHint")}
							</p>
						</div>
						<div className="space-y-2">
							<label htmlFor="rule-expiration" className="text-sm font-medium">
								{t("common.expirationDays")}
							</label>
							<Input id="rule-expiration" type="number" min={1} {...register("expirationDays")} />
							{errors.expirationDays && (
								<p className="text-xs text-[var(--color-danger)]">
									{errors.expirationDays.message}
								</p>
							)}
						</div>
						<div className="flex justify-end gap-2">
							<Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
								{t("pages.buckets.addRule")}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
