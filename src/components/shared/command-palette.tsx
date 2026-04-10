import {
	Box,
	FolderOpen,
	Monitor,
	Search,
	Settings,
	Shield,
	Terminal,
	Users,
	UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface CommandItem {
	label: string;
	path: string;
	icon: React.ElementType;
	keywords: string[];
}

const commands: CommandItem[] = [
	{ label: "Buckets", path: "/buckets", icon: Box, keywords: ["bucket", "storage", "s3"] },
	{ label: "Objects", path: "/objects", icon: FolderOpen, keywords: ["object", "file", "browse"] },
	{ label: "Users", path: "/users", icon: Users, keywords: ["user", "account", "iam"] },
	{ label: "Groups", path: "/groups", icon: UsersRound, keywords: ["group", "team"] },
	{ label: "Policies", path: "/policies", icon: Shield, keywords: ["policy", "permission", "iam"] },
	{
		label: "Monitoring",
		path: "/monitoring",
		icon: Monitor,
		keywords: ["monitor", "metrics", "health"],
	},
	{
		label: "MC Terminal",
		path: "/terminal",
		icon: Terminal,
		keywords: ["terminal", "mc", "cli", "command"],
	},
	{
		label: "Settings",
		path: "/settings",
		icon: Settings,
		keywords: ["settings", "config", "preferences"],
	},
];

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = useMemo(() => {
		if (!query) return commands;
		const q = query.toLowerCase();
		return commands.filter(
			(cmd) => cmd.label.toLowerCase().includes(q) || cmd.keywords.some((kw) => kw.includes(q)),
		);
	}, [query]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when query changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	useEffect(() => {
		if (open) {
			setQuery("");
			setSelectedIndex(0);
			// Focus after render
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	const selectItem = useCallback(
		(item: CommandItem) => {
			onOpenChange(false);
			navigate(item.path);
		},
		[navigate, onOpenChange],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((i) => (i + 1) % filtered.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (filtered[selectedIndex]) {
					selectItem(filtered[selectedIndex]);
				}
			}
		},
		[filtered, selectedIndex, selectItem],
	);

	if (!open) return null;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
		// biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay
		<div className="fixed inset-0 z-50 bg-black/50" onClick={() => onOpenChange(false)}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: palette container */}
			<div
				className="mx-auto mt-[20vh] w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleKeyDown}
			>
				<div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
					<Search className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
					<input
						ref={inputRef}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Type a command..."
						className="h-11 w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] outline-none"
					/>
				</div>
				<div className="max-h-[300px] overflow-y-auto p-1">
					{filtered.length === 0 && (
						<div className="px-3 py-6 text-center text-sm text-[var(--color-text-secondary)]">
							No results found.
						</div>
					)}
					{filtered.map((cmd, i) => {
						const Icon = cmd.icon;
						return (
							<button
								key={cmd.path}
								type="button"
								className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-text)] ${
									i === selectedIndex
										? "bg-[var(--color-accent)] text-white"
										: "hover:bg-[var(--color-bg-hover)]"
								}`}
								onClick={() => selectItem(cmd)}
								onMouseEnter={() => setSelectedIndex(i)}
							>
								<Icon className="h-4 w-4 shrink-0" />
								{cmd.label}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
