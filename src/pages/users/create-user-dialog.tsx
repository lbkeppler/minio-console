import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";

const userSchema = z.object({
	accessKey: z.string().min(3, "Access key must be at least 3 characters"),
	secretKey: z.string().min(8, "Secret key must be at least 8 characters"),
});

type UserFormData = z.infer<typeof userSchema>;

interface CreateUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
	const { createUser } = useAdminStore();
	const { addToast } = useToastStore();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<UserFormData>({
		resolver: zodResolver(userSchema),
	});

	async function onSubmit(data: UserFormData) {
		try {
			await createUser(data.accessKey, data.secretKey);
			addToast({ title: `User "${data.accessKey}" created`, variant: "success" });
			reset();
			onOpenChange(false);
		} catch (err) {
			addToast({
				title: "Error creating user",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create User</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="access-key" className="text-sm font-medium">
							Access Key
						</label>
						<Input id="access-key" placeholder="minio-user" {...register("accessKey")} />
						{errors.accessKey && (
							<p className="text-xs text-[var(--color-danger)]">{errors.accessKey.message}</p>
						)}
					</div>
					<div className="space-y-2">
						<label htmlFor="secret-key" className="text-sm font-medium">
							Secret Key
						</label>
						<Input
							id="secret-key"
							type="password"
							placeholder="••••••••"
							{...register("secretKey")}
						/>
						{errors.secretKey && (
							<p className="text-xs text-[var(--color-danger)]">{errors.secretKey.message}</p>
						)}
						<p className="text-xs text-[var(--color-text-tertiary)]">Minimum 8 characters.</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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
