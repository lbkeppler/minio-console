import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface BucketInfo {
	name: string;
	creation_date: string | null;
}

interface BucketStore {
	buckets: BucketInfo[];
	loading: boolean;
	loadBuckets: () => Promise<void>;
	createBucket: (name: string) => Promise<void>;
	deleteBucket: (name: string) => Promise<void>;
}

export const useBucketStore = create<BucketStore>((set, get) => ({
	buckets: [],
	loading: false,
	loadBuckets: async () => {
		set({ loading: true });
		try {
			const buckets = await invoke<BucketInfo[]>("list_buckets");
			set({ buckets, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	createBucket: async (name) => {
		await invoke("create_bucket", { name });
		await get().loadBuckets();
	},
	deleteBucket: async (name) => {
		await invoke("delete_bucket", { name });
		await get().loadBuckets();
	},
}));
