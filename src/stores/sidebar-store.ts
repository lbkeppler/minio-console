import { create } from "zustand";

interface SidebarStore {
	collapsed: boolean;
	toggle: () => void;
	setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
	collapsed: localStorage.getItem("sidebar-collapsed") === "true",
	toggle: () =>
		set((state) => {
			const next = !state.collapsed;
			localStorage.setItem("sidebar-collapsed", String(next));
			return { collapsed: next };
		}),
	setCollapsed: (collapsed) => {
		localStorage.setItem("sidebar-collapsed", String(collapsed));
		set({ collapsed });
	},
}));
