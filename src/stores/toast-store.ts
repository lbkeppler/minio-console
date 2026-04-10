import { create } from "zustand";
import type { ToastData } from "@/components/ui/toast";

interface ToastState {
	toasts: ToastData[];
	addToast: (toast: Omit<ToastData, "id">) => void;
	dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	addToast: (toast) =>
		set((state) => ({
			toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
		})),
	dismissToast: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),
}));
