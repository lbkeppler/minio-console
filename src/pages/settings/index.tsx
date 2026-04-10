import { useState } from "react";
import { useProfileStore, type ServerProfile } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileForm } from "./profile-form";
import { Plus, Pencil, Trash2, Server } from "lucide-react";

export function SettingsPage() {
	const { config, deleteProfile, setActiveProfile } = useProfileStore();
	const { addToast } = useToastStore();
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
			addToast({ title: "Error setting active profile", description: String(err), variant: "error" });
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Server Profiles</h1>
				<Button onClick={handleCreate} size="sm">
					<Plus className="h-4 w-4" /> Add Profile
				</Button>
			</div>

			{config?.profiles.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-12">
					<Server className="mb-4 h-10 w-10 text-[var(--color-text-tertiary)]" />
					<p className="text-sm text-[var(--color-text-secondary)]">
						No server profiles configured yet.
					</p>
					<Button onClick={handleCreate} variant="outline" size="sm" className="mt-4">
						<Plus className="h-4 w-4" /> Add your first profile
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
									<p className="text-xs text-[var(--color-text-secondary)]">
										{profile.endpoint}
									</p>
								</div>
							</button>

							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleEdit(profile)}
								>
									<Pencil className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDelete(profile)}
								>
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
							{editingProfile ? "Edit Profile" : "New Profile"}
						</DialogTitle>
					</DialogHeader>
					<ProfileForm
						profile={editingProfile}
						onClose={() => setFormOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
