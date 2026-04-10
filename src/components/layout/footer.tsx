import { useProfileStore } from "@/stores/profile-store";

export function Footer() {
	const { config } = useProfileStore();
	const activeProfile = config?.profiles.find((p) => p.id === config.active_profile_id);

	return (
		<footer className="flex h-[var(--footer-height)] items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-xs text-[var(--color-text-tertiary)]">
			<div className="flex items-center gap-2">
				{activeProfile ? (
					<>
						<span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)]" />
						<span>{activeProfile.endpoint}</span>
					</>
				) : (
					<>
						<span className="inline-block h-2 w-2 rounded-full bg-[var(--color-text-tertiary)]" />
						<span>Not connected</span>
					</>
				)}
			</div>
			<span>v0.1.0</span>
		</footer>
	);
}
