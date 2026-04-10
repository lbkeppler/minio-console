import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface ServerInfo {
	version: string;
	uptime: string;
	network: string;
	drives_online: number;
	drives_offline: number;
}

export interface DiskInfo {
	path: string;
	total_bytes: number;
	used_bytes: number;
	available_bytes: number;
	usage_percent: number;
}

interface MonitoringStore {
	serverInfo: ServerInfo | null;
	diskUsage: DiskInfo[];
	loadingServerInfo: boolean;
	loadingDiskUsage: boolean;

	loadServerInfo: () => Promise<void>;
	loadDiskUsage: () => Promise<void>;
}

export const useMonitoringStore = create<MonitoringStore>((set) => ({
	serverInfo: null,
	diskUsage: [],
	loadingServerInfo: false,
	loadingDiskUsage: false,

	loadServerInfo: async () => {
		set({ loadingServerInfo: true });
		try {
			const info = await invoke<ServerInfo>("get_server_info");
			set({ serverInfo: info });
		} finally {
			set({ loadingServerInfo: false });
		}
	},

	loadDiskUsage: async () => {
		set({ loadingDiskUsage: true });
		try {
			const disks = await invoke<DiskInfo[]>("get_disk_usage");
			set({ diskUsage: disks });
		} finally {
			set({ loadingDiskUsage: false });
		}
	},
}));
