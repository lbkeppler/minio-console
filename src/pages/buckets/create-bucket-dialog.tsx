import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useBucketStore } from "@/stores/bucket-store";
import { useToastStore } from "@/stores/toast-store";
import { Loader2 } from "lucide-react";

const bucketSchema = z.object({
	name: z
		.string()
		.min(3, "Bucket name must be at least 3 characters")
		.max(63, "Bucket name must be at most 63 characters")
		.regex(
			/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
			"Bucket name must be lowercase, start/end with letter or number",
		),
});

type BucketFormData = z.infer<typeof bucketSchema>;

interface CreateBucketDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateBucketDialog({ open, onOpenChange }: CreateBucketDialogProps) {
	const { createBucket } = useBucketStore();
	const { addToast } = useToastStore();

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
					<DialogTitle>Create Bucket</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="bucket-name" className="text-sm font-medium">
							Bucket Name
						</label>
						<Input
							id="bucket-name"
							placeholder="my-bucket"
							{...register("name")}
						/>
						{errors.name && (
							<p className="text-xs text-[var(--color-danger)]">
								{errors.name.message}
							</p>
						)}
						<p className="text-xs text-[var(--color-text-tertiary)]">
							Lowercase letters, numbers, hyphens, and periods. 3-63 characters.
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Create
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
