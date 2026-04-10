import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface ServerProfile {
	id: string;
	alias: string;
	endpoint: string;
	access_key: string;
	use_ssl: boolean;
}

export interface AppConfig {
	active_profile_id: string | null;
	profiles: ServerProfile[];
	theme: string;
	sidebar_collapsed: boolean;
}

export interface ConnectionTestResult {
	success: boolean;
	message: string;
	server_version: string | null;
}

interface ProfileStore {
	config: AppConfig | null;
	loading: boolean;
	loadConfig: () => Promise<void>;
	addProfile: (
		alias: string,
		endpoint: string,
		accessKey: string,
		secretKey: string,
		useSsl: boolean,
	) => Promise<void>;
	updateProfile: (
		id: string,
		alias: string,
		endpoint: string,
		accessKey: string,
		secretKey: string | null,
		useSsl: boolean,
	) => Promise<void>;
	deleteProfile: (id: string) => Promise<void>;
	setActiveProfile: (id: string) => Promise<void>;
	testConnection: (
		endpoint: string,
		accessKey: string,
		secretKey: string | null,
		profileId: string | null,
		useSsl: boolean,
	) => Promise<ConnectionTestResult>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
	config: null,
	loading: false,
	loadConfig: async () => {
		set({ loading: true });
		const config = await invoke<AppConfig>("get_config");
		set({ config, loading: false });
	},
	addProfile: async (alias, endpoint, accessKey, secretKey, useSsl) => {
		const config = await invoke<AppConfig>("add_profile", {
			alias,
			endpoint,
			accessKey,
			secretKey,
			useSsl,
		});
		set({ config });
	},
	updateProfile: async (
		id,
		alias,
		endpoint,
		accessKey,
		secretKey,
		useSsl,
	) => {
		const config = await invoke<AppConfig>("update_profile", {
			id,
			alias,
			endpoint,
			accessKey,
			secretKey,
			useSsl,
		});
		set({ config });
	},
	deleteProfile: async (id) => {
		const config = await invoke<AppConfig>("delete_profile", { id });
		set({ config });
	},
	setActiveProfile: async (id) => {
		const config = await invoke<AppConfig>("set_active_profile", { id });
		set({ config });
	},
	testConnection: async (endpoint, accessKey, secretKey, profileId, useSsl) => {
		return invoke<ConnectionTestResult>("test_connection", {
			endpoint,
			accessKey,
			secretKey,
			profileId,
			useSsl,
		});
	},
}));
