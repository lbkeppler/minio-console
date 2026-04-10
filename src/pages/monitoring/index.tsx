import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DiskUsage } from "@/pages/monitoring/disk-usage";
import { ServerInfoCard } from "@/pages/monitoring/server-info-card";
import { useMonitoringStore } from "@/stores/monitoring-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";

export function MonitoringPage() {
	const {
		serverInfo,
		diskUsage,
		loadingServerInfo,
		loadingDiskUsage,
		loadServerInfo,
		loadDiskUsage,
	} = useMonitoringStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const { t } = useTranslation();

	const hasActiveProfile = !!config?.active_profile_id;
	const loading = loadingServerInfo || loadingDiskUsage;

	const loadAll = useCallback(() => {
		loadServerInfo().catch((err) => {
			addToast({
				title: "Error loading server info",
				description: String(err),
				variant: "error",
			});
		});
		loadDiskUsage().catch((err) => {
			addToast({
				title: "Error loading disk usage",
				description: String(err),
				variant: "error",
			});
		});
	}, [loadServerInfo, loadDiskUsage, addToast]);

	useEffect(() => {
		if (hasActiveProfile) {
			loadAll();
		}
	}, [hasActiveProfile, loadAll]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">{t("pages.monitoring.title")}</h1>
				<p className="text-[var(--color-text-secondary)]">
					{t("pages.monitoring.selectProfileFirst")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{t("pages.monitoring.title")}</h1>
				<Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
					{loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
					<span className="ml-2">{t("common.refresh")}</span>
				</Button>
			</div>

			{serverInfo && <ServerInfoCard info={serverInfo} />}

			<div className="space-y-4">
				<h2 className="text-lg font-semibold">{t("pages.monitoring.diskUsage")}</h2>
				{loadingDiskUsage ? (
					<div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
						<Loader2 size={16} className="animate-spin" />
						{t("pages.monitoring.loadingDiskUsage")}
					</div>
				) : (
					<DiskUsage disks={diskUsage} />
				)}
			</div>
		</div>
	);
}
