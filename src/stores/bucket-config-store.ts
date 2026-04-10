import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface BucketConfig {
	versioning: string;
	policy: string | null;
}

export interface LifecycleRule {
	id: string;
	prefix: string;
	status: string;
	expiration_days: number | null;
}

interface BucketConfigStore {
	config: BucketConfig | null;
	lifecycleRules: LifecycleRule[];
	loading: boolean;
	loadConfig: (bucket: string) => Promise<void>;
	setVersioning: (bucket: string, enabled: boolean) => Promise<void>;
	setPolicy: (bucket: string, policy: string) => Promise<void>;
	deletePolicy: (bucket: string) => Promise<void>;
	loadLifecycleRules: (bucket: string) => Promise<void>;
	putLifecycleRule: (bucket: string, rule: LifecycleRule) => Promise<void>;
	deleteLifecycleRule: (bucket: string, ruleId: string) => Promise<void>;
}

export const useBucketConfigStore = create<BucketConfigStore>((set, get) => ({
	config: null,
	lifecycleRules: [],
	loading: false,
	loadConfig: async (bucket) => {
		set({ loading: true });
		try {
			const config = await invoke<BucketConfig>("get_bucket_config", { bucket });
			set({ config, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	setVersioning: async (bucket, enabled) => {
		await invoke("set_versioning", { bucket, enabled });
		await get().loadConfig(bucket);
	},
	setPolicy: async (bucket, policy) => {
		await invoke("set_bucket_policy", { bucket, policy });
		await get().loadConfig(bucket);
	},
	deletePolicy: async (bucket) => {
		await invoke("delete_bucket_policy", { bucket });
		await get().loadConfig(bucket);
	},
	loadLifecycleRules: async (bucket) => {
		const rules = await invoke<LifecycleRule[]>("get_lifecycle_rules", { bucket });
		set({ lifecycleRules: rules });
	},
	putLifecycleRule: async (bucket, rule) => {
		await invoke("put_lifecycle_rule", { bucket, rule });
		await get().loadLifecycleRules(bucket);
	},
	deleteLifecycleRule: async (bucket, ruleId) => {
		await invoke("delete_lifecycle_rule", { bucket, ruleId });
		await get().loadLifecycleRules(bucket);
	},
}));
