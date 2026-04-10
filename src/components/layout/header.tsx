import { useEffect, useState } from "react";
import { Globe, Monitor, Moon, Search, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/shared/command-palette";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfileStore } from "@/stores/profile-store";
import { useThemeStore } from "@/stores/theme-store";

export function Header() {
	const { t, i18n } = useTranslation();
	const { config, setActiveProfile } = useProfileStore();
	const { theme, setTheme } = useThemeStore();
	const currentLang = i18n.language?.startsWith("pt") ? "pt-BR" : "en";
	const [paletteOpen, setPaletteOpen] = useState(false);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setPaletteOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const activeProfile = config?.profiles.find((p) => p.id === config.active_profile_id);

	const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
	const ThemeIcon = themeIcon;

	return (
		<header className="flex h-[var(--header-height)] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4">
			<div className="flex items-center gap-4">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="min-w-[160px] justify-start">
							{activeProfile ? activeProfile.alias : "No server selected"}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{config?.profiles.map((profile) => (
							<DropdownMenuItem key={profile.id} onClick={() => setActiveProfile(profile.id)}>
								<span className="flex-1">{profile.alias}</span>
								{profile.id === config.active_profile_id && (
									<span className="ml-2 text-xs text-[var(--color-accent)]">active</span>
								)}
							</DropdownMenuItem>
						))}
						{config?.profiles.length === 0 && (
							<DropdownMenuItem disabled>No profiles configured</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					className="gap-2 text-[var(--color-text-secondary)]"
					onClick={() => setPaletteOpen(true)}
				>
					<Search className="h-4 w-4" />
					<span className="text-xs">Ctrl+K</span>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-1 px-2">
							<Globe className="h-4 w-4" />
							<span className="text-xs">{currentLang === "pt-BR" ? "PT" : "EN"}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
							{t("header.language.en")}
							{currentLang === "en" && (
								<span className="ml-2 text-xs text-[var(--color-accent)]">&#10003;</span>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => i18n.changeLanguage("pt-BR")}>
							{t("header.language.ptBR")}
							{currentLang === "pt-BR" && (
								<span className="ml-2 text-xs text-[var(--color-accent)]">&#10003;</span>
							)}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<ThemeIcon className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<Sun className="mr-2 h-4 w-4" /> {t("header.theme.light")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<Moon className="mr-2 h-4 w-4" /> {t("header.theme.dark")}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<Monitor className="mr-2 h-4 w-4" /> {t("header.theme.system")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
		</header>
	);
}
