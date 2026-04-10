import { Clock, HardDrive, Network, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServerInfo } from "@/stores/monitoring-store";

interface ServerInfoCardProps {
	info: ServerInfo;
}

export function ServerInfoCard({ info }: ServerInfoCardProps) {
	const { t } = useTranslation();

	const cards = [
		{ key: "version" as const, label: t("pages.monitoring.version"), icon: Server },
		{ key: "uptime" as const, label: t("pages.monitoring.uptime"), icon: Clock },
		{ key: "network" as const, label: t("pages.monitoring.network"), icon: Network },
	] as const;

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
					{t("pages.monitoring.drives")}
				</div>
				<div className="text-lg font-semibold">
					<span className="text-[var(--color-success)]">
						{info.drives_online} {t("common.online")}
					</span>
					{" / "}
					<span className={info.drives_offline > 0 ? "text-[var(--color-error)]" : ""}>
						{info.drives_offline} {t("common.offline")}
					</span>
				</div>
			</div>
		</div>
	);
}
