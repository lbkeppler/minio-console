import { Loader2, Plus, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type UserInfo, useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";

interface UserPoliciesDialogProps {
	user: UserInfo;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserPoliciesDialog({ user, open, onOpenChange }: UserPoliciesDialogProps) {
	const { policies, loadPolicies, attachPolicy, detachPolicy, loadUsers } = useAdminStore();
	const { addToast } = useToastStore();
	const [selectedPolicy, setSelectedPolicy] = useState("");
	const [attaching, setAttaching] = useState(false);

	useEffect(() => {
		if (open) {
			loadPolicies().catch(() => {});
		}
	}, [open, loadPolicies]);

	async function handleAttach() {
		if (!selectedPolicy) return;
		setAttaching(true);
		try {
			await attachPolicy(selectedPolicy, user.access_key);
			addToast({
				title: `Policy "${selectedPolicy}" attached to ${user.access_key}`,
				variant: "success",
			});
			setSelectedPolicy("");
			await loadUsers();
		} catch (err) {
			addToast({
				title: "Error attaching policy",
				description: String(err),
				variant: "error",
			});
		} finally {
			setAttaching(false);
		}
	}

	async function handleDetach(policy: string) {
		try {
			await detachPolicy(policy, user.access_key);
			addToast({
				title: `Policy "${policy}" detached`,
				variant: "success",
			});
			await loadUsers();
		} catch (err) {
			addToast({
				title: "Error detaching policy",
				description: String(err),
				variant: "error",
			});
		}
	}

	const availablePolicies = policies.filter((p) => !user.policies.includes(p.name));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Policies — {user.access_key}</DialogTitle>
				</DialogHeader>
				<div className="mt-4 space-y-4">
					{/* Attach new policy */}
					<div className="flex gap-2">
						<select
							value={selectedPolicy}
							onChange={(e) => setSelectedPolicy(e.target.value)}
							className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] [&>option]:bg-[var(--color-bg-secondary)] [&>option]:text-[var(--color-text)]"
						>
							<option value="">Select a policy...</option>
							{availablePolicies.map((p) => (
								<option key={p.name} value={p.name}>
									{p.name}
								</option>
							))}
						</select>
						<Button onClick={handleAttach} disabled={!selectedPolicy || attaching} size="sm">
							{attaching ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
						</Button>
					</div>

					{/* Current policies */}
					<div className="space-y-1">
						{user.policies.length === 0 ? (
							<p className="text-sm text-[var(--color-text-tertiary)]">No policies attached.</p>
						) : (
							user.policies.map((p) => (
								<div
									key={p}
									className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2"
								>
									<div className="flex items-center gap-2">
										<Shield className="h-4 w-4 text-[var(--color-accent)]" />
										<span className="text-sm">{p}</span>
									</div>
									<Button variant="ghost" size="icon" onClick={() => handleDetach(p)}>
										<X className="h-4 w-4 text-[var(--color-danger)]" />
									</Button>
								</div>
							))
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
