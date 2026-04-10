import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBucketStore } from "@/stores/bucket-store";
import { useToastStore } from "@/stores/toast-store";

interface CreateBucketDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateBucketDialog({ open, onOpenChange }: CreateBucketDialogProps) {
	const { createBucket } = useBucketStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();

	const bucketSchema = z.object({
		name: z
			.string()
			.min(3, t("validation.bucketNameMin"))
			.max(63, t("validation.bucketNameMax"))
			.regex(
				/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
				t("validation.bucketNamePattern"),
			),
	});

	type BucketFormData = z.infer<typeof bucketSchema>;

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<BucketFormData>({
		resolver: zodResolver(bucketSchema),
	});

	async function onSubmit(data: BucketFormData) {
		try {
			await createBucket(data.name);
			addToast({ title: `Bucket "${data.name}" created`, variant: "success" });
			reset();
			onOpenChange(false);
		} catch (err) {
			addToast({
				title: "Error creating bucket",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("pages.buckets.createBucket")}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="bucket-name" className="text-sm font-medium">
							{t("pages.buckets.bucketName")}
						</label>
						<Input id="bucket-name" placeholder="my-bucket" {...register("name")} />
						{errors.name && (
							<p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
						)}
						<p className="text-xs text-[var(--color-text-tertiary)]">
							{t("pages.buckets.bucketNameHint")}
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							{t("common.create")}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
