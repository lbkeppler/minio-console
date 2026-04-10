import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface UserInfo {
	access_key: string;
	status: string;
	policies: string[];
}

export interface GroupInfo {
	name: string;
	status: string;
	members: string[];
	policies: string[];
}

export interface PolicyInfo {
	name: string;
	policy: string;
}

interface AdminStore {
	users: UserInfo[];
	groups: GroupInfo[];
	policies: PolicyInfo[];
	loadingUsers: boolean;
	loadingGroups: boolean;
	loadingPolicies: boolean;

	loadUsers: () => Promise<void>;
	createUser: (accessKey: string, secretKey: string) => Promise<void>;
	deleteUser: (accessKey: string) => Promise<void>;

	loadGroups: () => Promise<void>;
	createGroup: (name: string) => Promise<void>;
	deleteGroup: (name: string) => Promise<void>;
	addGroupMembers: (group: string, members: string[]) => Promise<void>;
	removeGroupMembers: (group: string, members: string[]) => Promise<void>;

	loadPolicies: () => Promise<void>;
	getPolicy: (name: string) => Promise<PolicyInfo>;
	createPolicy: (name: string, policy: string) => Promise<void>;
	deletePolicy: (name: string) => Promise<void>;
	attachPolicy: (policy: string, entityType: string, entityName: string) => Promise<void>;
	detachPolicy: (policy: string, entityType: string, entityName: string) => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
	users: [],
	groups: [],
	policies: [],
	loadingUsers: false,
	loadingGroups: false,
	loadingPolicies: false,

	loadUsers: async () => {
		set({ loadingUsers: true });
		try {
			const users = await invoke<UserInfo[]>("list_users");
			set({ users, loadingUsers: false });
		} catch (e) {
			set({ loadingUsers: false });
			throw e;
		}
	},
	createUser: async (accessKey, secretKey) => {
		await invoke("create_user", { accessKey, secretKey });
		await get().loadUsers();
	},
	deleteUser: async (accessKey) => {
		await invoke("delete_user", { accessKey });
		await get().loadUsers();
	},

	loadGroups: async () => {
		set({ loadingGroups: true });
		try {
			const groups = await invoke<GroupInfo[]>("list_groups");
			set({ groups, loadingGroups: false });
		} catch (e) {
			set({ loadingGroups: false });
			throw e;
		}
	},
	createGroup: async (name) => {
		await invoke("create_group", { name });
		await get().loadGroups();
	},
	deleteGroup: async (name) => {
		await invoke("delete_group", { name });
		await get().loadGroups();
	},
	addGroupMembers: async (group, members) => {
		await invoke("add_group_members", { group, members });
		await get().loadGroups();
	},
	removeGroupMembers: async (group, members) => {
		await invoke("remove_group_members", { group, members });
		await get().loadGroups();
	},

	loadPolicies: async () => {
		set({ loadingPolicies: true });
		try {
			const policies = await invoke<PolicyInfo[]>("list_policies");
			set({ policies, loadingPolicies: false });
		} catch (e) {
			set({ loadingPolicies: false });
			throw e;
		}
	},
	getPolicy: async (name) => {
		return await invoke<PolicyInfo>("get_policy", { name });
	},
	createPolicy: async (name, policy) => {
		await invoke("create_policy", { name, policy });
		await get().loadPolicies();
	},
	deletePolicy: async (name) => {
		await invoke("delete_policy", { name });
		await get().loadPolicies();
	},
	attachPolicy: async (policy, entityType, entityName) => {
		await invoke("attach_policy", { policy, entityType, entityName });
	},
	detachPolicy: async (policy, entityType, entityName) => {
		await invoke("detach_policy", { policy, entityType, entityName });
	},
}));
