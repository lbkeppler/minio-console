import { Progress } from "@/components/ui/progress";
import type { DiskInfo } from "@/stores/monitoring-store";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const index = Math.min(i, units.length - 1);
	return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

interface DiskUsageProps {
	disks: DiskInfo[];
}

export function DiskUsage({ disks }: DiskUsageProps) {
	if (disks.length === 0) {
		return <p className="text-[var(--color-text-secondary)]">No disk information available.</p>;
	}

	return (
		<div className="space-y-4">
			{disks.map((disk) => (
				<div
					key={disk.path}
					className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
				>
					<div className="mb-2 flex items-center justify-between">
						<span className="font-medium">{disk.path}</span>
						<span className="text-sm text-[var(--color-text-secondary)]">
							{disk.usage_percent.toFixed(1)}%
						</span>
					</div>
					<Progress value={disk.usage_percent} />
					<div className="mt-2 flex justify-between text-sm text-[var(--color-text-secondary)]">
						<span>
							{formatBytes(disk.used_bytes)} / {formatBytes(disk.total_bytes)}
						</span>
						<span>{formatBytes(disk.available_bytes)} free</span>
					</div>
				</div>
			))}
		</div>
	);
}
