import { create } from "zustand";
import type { ToastData } from "@/components/ui/toast";

interface ToastStore {
	toasts: ToastData[];
	addToast: (toast: Omit<ToastData, "id">) => void;
	dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
	toasts: [],
	addToast: (toast) =>
		set((state) => ({
			toasts: [
				...state.toasts,
				{ ...toast, id: crypto.randomUUID() },
			],
		})),
	dismissToast: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),
}));
