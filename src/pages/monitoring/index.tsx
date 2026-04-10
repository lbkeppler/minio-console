import { Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMonitoringStore } from "@/stores/monitoring-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { DiskUsage } from "@/pages/monitoring/disk-usage";
import { ServerInfoCard } from "@/pages/monitoring/server-info-card";

export function MonitoringPage() {
	const { serverInfo, diskUsage, loadingServerInfo, loadingDiskUsage, loadServerInfo, loadDiskUsage } =
		useMonitoringStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();

	const hasActiveProfile = !!config?.active_profile_id;
	const loading = loadingServerInfo || loadingDiskUsage;

	const loadAll = () => {
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
	};

	useEffect(() => {
		if (hasActiveProfile) {
			loadAll();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasActiveProfile]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Monitoring</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a server profile first to view monitoring data.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Monitoring</h1>
				<Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
					{loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
					<span className="ml-2">Refresh</span>
				</Button>
			</div>

			{serverInfo && <ServerInfoCard info={serverInfo} />}

			<div className="space-y-4">
				<h2 className="text-lg font-semibold">Disk Usage</h2>
				{loadingDiskUsage ? (
					<div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
						<Loader2 size={16} className="animate-spin" />
						Loading disk usage...
					</div>
				) : (
					<DiskUsage disks={diskUsage} />
				)}
			</div>
		</div>
	);
}
