import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBucketConfigStore } from "@/stores/bucket-config-store";
import { useToastStore } from "@/stores/toast-store";

const lifecycleRuleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
	prefix: z.string().optional().default(""),
	expirationDays: z.coerce.number().min(1, "Must be at least 1 day"),
});

type LifecycleRuleFormData = z.infer<typeof lifecycleRuleSchema>;

interface LifecycleRulesProps {
	bucket: string;
}

export function LifecycleRules({ bucket }: LifecycleRulesProps) {
	const { lifecycleRules, loadLifecycleRules, putLifecycleRule, deleteLifecycleRule } =
		useBucketConfigStore();
	const { addToast } = useToastStore();
	const [dialogOpen, setDialogOpen] = useState(false);

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
				<h3 className="text-lg font-medium">Lifecycle Rules</h3>
				<Button size="sm" onClick={() => setDialogOpen(true)}>
					<Plus className="h-4 w-4" /> Add Rule
				</Button>
			</div>

			{lifecycleRules.length === 0 ? (
				<p className="text-sm text-[var(--color-text-secondary)]">No lifecycle rules configured.</p>
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
									Prefix: {rule.prefix || "(none)"} · Expiration:{" "}
									{rule.expiration_days != null ? `${rule.expiration_days} days` : "—"} · Status:{" "}
									{rule.status}
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
						<DialogTitle>Add Lifecycle Rule</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="rule-id" className="text-sm font-medium">
								Rule ID
							</label>
							<Input id="rule-id" placeholder="expire-logs" {...register("id")} />
							{errors.id && (
								<p className="text-xs text-[var(--color-danger)]">{errors.id.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<label htmlFor="rule-prefix" className="text-sm font-medium">
								Prefix
							</label>
							<Input id="rule-prefix" placeholder="logs/" {...register("prefix")} />
							<p className="text-xs text-[var(--color-text-tertiary)]">
								Optional. Filter objects by key prefix.
							</p>
						</div>
						<div className="space-y-2">
							<label htmlFor="rule-expiration" className="text-sm font-medium">
								Expiration Days
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
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
								Add Rule
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
