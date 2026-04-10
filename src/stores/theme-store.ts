import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === "system") {
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		root.classList.toggle("dark", prefersDark);
	} else {
		root.classList.toggle("dark", theme === "dark");
	}
}

export const useThemeStore = create<ThemeStore>((set) => ({
	theme: (localStorage.getItem("theme") as Theme) ?? "system",
	setTheme: (theme) => {
		localStorage.setItem("theme", theme);
		applyTheme(theme);
		set({ theme });
	},
}));

applyTheme(useThemeStore.getState().theme);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
	if (useThemeStore.getState().theme === "system") {
		applyTheme("system");
	}
});
