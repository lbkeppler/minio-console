import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ServerProfile, useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";

const profileSchema = z.object({
	alias: z.string().min(1, "Alias is required"),
	endpoint: z.string().min(1, "Endpoint is required"),
	accessKey: z.string().min(1, "Access key is required"),
	secretKey: z.string().min(1, "Secret key is required"),
	useSsl: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
	profile?: ServerProfile;
	onClose: () => void;
}

export function ProfileForm({ profile, onClose }: ProfileFormProps) {
	const { addProfile, updateProfile, testConnection } = useProfileStore();
	const { addToast } = useToastStore();
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const {
		register,
		handleSubmit,
		getValues,
		formState: { errors, isSubmitting },
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			alias: profile?.alias ?? "",
			endpoint: profile?.endpoint ?? "",
			accessKey: profile?.access_key ?? "",
			secretKey: "",
			useSsl: profile?.use_ssl ?? true,
		},
	});

	async function onSubmit(data: ProfileFormData) {
		try {
			if (profile) {
				await updateProfile(
					profile.id,
					data.alias,
					data.endpoint,
					data.accessKey,
					data.secretKey || null,
					data.useSsl,
				);
				addToast({ title: "Profile updated", variant: "success" });
			} else {
				await addProfile(data.alias, data.endpoint, data.accessKey, data.secretKey, data.useSsl);
				addToast({ title: "Profile created", variant: "success" });
			}
			onClose();
		} catch (err) {
			addToast({
				title: "Error saving profile",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handleTestConnection() {
		const values = getValues();
		if (!values.endpoint || !values.accessKey) return;

		setTesting(true);
		setTestResult(null);
		try {
			const result = await testConnection(
				values.endpoint,
				values.accessKey,
				values.secretKey || null,
				profile?.id ?? null,
				values.useSsl,
			);
			setTestResult(result);
		} catch (err) {
			setTestResult({ success: false, message: String(err) });
		} finally {
			setTesting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="space-y-2">
				<label className="text-sm font-medium" htmlFor="alias">
					Alias
				</label>
				<Input id="alias" placeholder="e.g., local, production" {...register("alias")} />
				{errors.alias && (
					<p className="text-xs text-[var(--color-danger)]">{errors.alias.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium" htmlFor="endpoint">
					Endpoint
				</label>
				<Input
					id="endpoint"
					placeholder="e.g., localhost:9000 or minio.example.com"
					{...register("endpoint")}
				/>
				{errors.endpoint && (
					<p className="text-xs text-[var(--color-danger)]">{errors.endpoint.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium" htmlFor="accessKey">
					Access Key
				</label>
				<Input id="accessKey" placeholder="Access key" {...register("accessKey")} />
				{errors.accessKey && (
					<p className="text-xs text-[var(--color-danger)]">{errors.accessKey.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium" htmlFor="secretKey">
					Secret Key {profile && "(leave blank to keep current)"}
				</label>
				<Input id="secretKey" type="password" placeholder="Secret key" {...register("secretKey")} />
				{errors.secretKey && (
					<p className="text-xs text-[var(--color-danger)]">{errors.secretKey.message}</p>
				)}
			</div>

			<div className="flex items-center gap-2">
				<input type="checkbox" id="useSsl" {...register("useSsl")} className="rounded" />
				<label htmlFor="useSsl" className="text-sm">
					Use SSL/TLS
				</label>
			</div>

			{testResult && (
				<div
					className={`flex items-center gap-2 rounded-md p-3 text-sm ${
						testResult.success
							? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
							: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
					}`}
				>
					{testResult.success ? (
						<CheckCircle className="h-4 w-4" />
					) : (
						<XCircle className="h-4 w-4" />
					)}
					{testResult.message}
				</div>
			)}

			<div className="flex justify-between pt-2">
				<Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
					{testing && <Loader2 className="h-4 w-4 animate-spin" />}
					Test Connection
				</Button>
				<div className="flex gap-2">
					<Button type="button" variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
						{profile ? "Update" : "Create"}
					</Button>
				</div>
			</div>
		</form>
	);
}
