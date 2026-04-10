import { Pencil, Plus, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type ServerProfile, useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { ProfileForm } from "./profile-form";

export function SettingsPage() {
	const { config, deleteProfile, setActiveProfile } = useProfileStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();
	const [formOpen, setFormOpen] = useState(false);
	const [editingProfile, setEditingProfile] = useState<ServerProfile | undefined>();

	function handleEdit(profile: ServerProfile) {
		setEditingProfile(profile);
		setFormOpen(true);
	}

	function handleCreate() {
		setEditingProfile(undefined);
		setFormOpen(true);
	}

	async function handleDelete(profile: ServerProfile) {
		try {
			await deleteProfile(profile.id);
			addToast({ title: `Profile "${profile.alias}" deleted`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error deleting profile", description: String(err), variant: "error" });
		}
	}

	async function handleSetActive(id: string) {
		try {
			await setActiveProfile(id);
		} catch (err) {
			addToast({
				title: "Error setting active profile",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{t("pages.settings.profiles")}</h1>
				<Button onClick={handleCreate} size="sm">
					<Plus className="h-4 w-4" /> {t("pages.settings.addProfile")}
				</Button>
			</div>

			{config?.profiles.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-12">
					<Server className="mb-4 h-10 w-10 text-[var(--color-text-tertiary)]" />
					<p className="text-sm text-[var(--color-text-secondary)]">
						{t("pages.settings.noProfiles")}
					</p>
					<Button onClick={handleCreate} variant="outline" size="sm" className="mt-4">
						<Plus className="h-4 w-4" /> {t("pages.settings.addFirstProfile")}
					</Button>
				</div>
			)}

			<div className="space-y-2">
				{config?.profiles.map((profile) => {
					const isActive = profile.id === config.active_profile_id;
					return (
						<div
							key={profile.id}
							className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
								isActive
									? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
									: "border-[var(--color-border)]"
							}`}
						>
							<button
								type="button"
								onClick={() => handleSetActive(profile.id)}
								className="flex flex-1 items-center gap-3 text-left"
							>
								<div
									className={`h-2 w-2 rounded-full ${
										isActive ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"
									}`}
								/>
								<div>
									<p className="text-sm font-medium">{profile.alias}</p>
									<p className="text-xs text-[var(--color-text-secondary)]">{profile.endpoint}</p>
								</div>
							</button>

							<div className="flex items-center gap-1">
								<Button variant="ghost" size="icon" onClick={() => handleEdit(profile)}>
									<Pencil className="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="icon" onClick={() => handleDelete(profile)}>
									<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingProfile ? t("pages.settings.editProfile") : t("pages.settings.newProfile")}
						</DialogTitle>
					</DialogHeader>
					<ProfileForm profile={editingProfile} onClose={() => setFormOpen(false)} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
