import { Clock, HardDrive, Network, Server } from "lucide-react";
import type { ServerInfo } from "@/stores/monitoring-store";

interface ServerInfoCardProps {
	info: ServerInfo;
}

const cards = [
	{ key: "version" as const, label: "Version", icon: Server },
	{ key: "uptime" as const, label: "Uptime", icon: Clock },
	{ key: "network" as const, label: "Network", icon: Network },
] as const;

export function ServerInfoCard({ info }: ServerInfoCardProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{cards.map(({ key, label, icon: Icon }) => (
				<div
					key={key}
					className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
				>
					<div className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
						<Icon size={16} />
						{label}
					</div>
					<div className="text-lg font-semibold">{info[key]}</div>
				</div>
			))}
			<div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
				<div className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
					<HardDrive size={16} />
					Drives
				</div>
				<div className="text-lg font-semibold">
					<span className="text-[var(--color-success)]">{info.drives_online} online</span>
					{" / "}
					<span className={info.drives_offline > 0 ? "text-[var(--color-error)]" : ""}>
						{info.drives_offline} offline
					</span>
				</div>
			</div>
		</div>
	);
}
