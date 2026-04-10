import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface ObjectInfo {
	key: string;
	size: number;
	last_modified: string | null;
	is_prefix: boolean;
}

export interface PresignedUrlResult {
	url: string;
	expires_in_secs: number;
}

interface ObjectStore {
	objects: ObjectInfo[];
	loading: boolean;
	currentBucket: string;
	currentPrefix: string;
	setBucket: (bucket: string) => void;
	setPrefix: (prefix: string) => void;
	loadObjects: () => Promise<void>;
	deleteObject: (key: string) => Promise<void>;
	deleteObjects: (keys: string[]) => Promise<void>;
	getPresignedUrl: (key: string, expiresInSecs?: number) => Promise<PresignedUrlResult>;
	uploadObject: (key: string, filePath: string) => Promise<void>;
	downloadObject: (key: string, destination: string) => Promise<void>;
}

export const useObjectStore = create<ObjectStore>((set, get) => ({
	objects: [],
	loading: false,
	currentBucket: "",
	currentPrefix: "",
	setBucket: (bucket) => set({ currentBucket: bucket }),
	setPrefix: (prefix) => set({ currentPrefix: prefix }),
	loadObjects: async () => {
		const { currentBucket, currentPrefix } = get();
		if (!currentBucket) return;
		set({ loading: true });
		try {
			const objects = await invoke<ObjectInfo[]>("list_objects", {
				bucket: currentBucket,
				prefix: currentPrefix,
			});
			set({ objects, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	deleteObject: async (key) => {
		const { currentBucket } = get();
		await invoke("delete_object", { bucket: currentBucket, key });
		await get().loadObjects();
	},
	deleteObjects: async (keys) => {
		const { currentBucket } = get();
		await invoke("delete_objects", { bucket: currentBucket, keys });
		await get().loadObjects();
	},
	getPresignedUrl: async (key, expiresInSecs = 3600) => {
		const { currentBucket } = get();
		return invoke<PresignedUrlResult>("get_presigned_url", {
			bucket: currentBucket,
			key,
			expiresInSecs,
		});
	},
	uploadObject: async (key, filePath) => {
		const { currentBucket } = get();
		await invoke("upload_object", {
			bucket: currentBucket,
			key,
			filePath,
		});
		await get().loadObjects();
	},
	downloadObject: async (key, destination) => {
		const { currentBucket } = get();
		await invoke("download_object", {
			bucket: currentBucket,
			key,
			destination,
		});
	},
}));
