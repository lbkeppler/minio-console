import { invoke } from "@tauri-apps/api/core";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/stores/profile-store";

interface McCommandResult {
	output: string;
	exit_code: number;
}

interface HistoryEntry {
	command: string;
	output: string;
	exit_code: number;
}

const MC_COMMANDS = [
	"ls",
	"mb",
	"rb",
	"cp",
	"mv",
	"rm",
	"cat",
	"head",
	"stat",
	"du",
	"find",
	"diff",
	"mirror",
	"version",
	"admin info",
	"admin user list",
	"admin user add",
	"admin user remove",
	"admin user enable",
	"admin user disable",
	"admin group list",
	"admin group add",
	"admin group remove",
	"admin group info",
	"admin policy list",
	"admin policy info",
	"admin policy create",
	"admin policy remove",
	"admin policy attach",
	"admin policy detach",
	"admin policy entities",
	"admin config get",
	"admin config set",
	"admin config reset",
	"admin heal",
	"admin trace",
	"admin console",
	"admin prometheus metrics",
	"admin service restart",
	"admin service stop",
	"admin update",
	"admin bucket remote add",
	"admin bucket remote ls",
	"admin bucket remote rm",
	"admin replicate add",
	"admin replicate info",
	"admin replicate rm",
	"admin replicate status",
];

export function TerminalPage() {
	const { config } = useProfileStore();
	const { t } = useTranslation();
	const hasActiveProfile = !!config?.active_profile_id;

	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [command, setCommand] = useState("");
	const [running, setRunning] = useState(false);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [selectedSuggestion, setSelectedSuggestion] = useState(0);
	const [showSuggestions, setShowSuggestions] = useState(false);

	const outputRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const scrollToBottom = useCallback(() => {
		if (outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when history changes
	useEffect(() => {
		scrollToBottom();
	}, [history, scrollToBottom]);

	function updateSuggestions(value: string) {
		if (!value.trim()) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}
		const lower = value.toLowerCase();
		const matches = MC_COMMANDS.filter((cmd) => cmd.startsWith(lower) && cmd !== lower);
		setSuggestions(matches.slice(0, 8));
		setSelectedSuggestion(0);
		setShowSuggestions(matches.length > 0);
	}

	function handleInputChange(value: string) {
		setCommand(value);
		updateSuggestions(value);
	}

	function applySuggestion(suggestion: string) {
		setCommand(suggestion);
		setShowSuggestions(false);
		inputRef.current?.focus();
	}

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = command.trim();
			if (!trimmed || running) return;

			setRunning(true);
			setCommand("");
			setShowSuggestions(false);
			setHistoryIndex(-1);
			setCommandHistory((prev) => [trimmed, ...prev]);

			try {
				const result = await invoke<McCommandResult>("run_mc_command", {
					command: trimmed,
				});
				setHistory((prev) => [
					...prev,
					{ command: trimmed, output: result.output, exit_code: result.exit_code },
				]);
			} catch (err) {
				setHistory((prev) => [...prev, { command: trimmed, output: String(err), exit_code: 1 }]);
			} finally {
				setRunning(false);
				inputRef.current?.focus();
			}
		},
		[command, running],
	);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (showSuggestions && suggestions.length > 0) {
			if (e.key === "Tab" || (e.key === "ArrowRight" && suggestions.length > 0)) {
				e.preventDefault();
				applySuggestion(suggestions[selectedSuggestion] ?? suggestions[0] ?? "");
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedSuggestion((prev) => Math.max(prev - 1, 0));
				return;
			}
			if (e.key === "Escape") {
				setShowSuggestions(false);
				return;
			}
		} else {
			if (e.key === "ArrowUp") {
				e.preventDefault();
				if (commandHistory.length === 0) return;
				const next = Math.min(historyIndex + 1, commandHistory.length - 1);
				setHistoryIndex(next);
				const cmd = commandHistory[next] ?? "";
				setCommand(cmd);
				setShowSuggestions(false);
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				if (historyIndex <= 0) {
					setHistoryIndex(-1);
					setCommand("");
				} else {
					const next = historyIndex - 1;
					setHistoryIndex(next);
					setCommand(commandHistory[next] ?? "");
				}
				setShowSuggestions(false);
			}
		}
	}

	const handleClear = useCallback(() => {
		setHistory([]);
	}, []);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">{t("pages.terminal.title")}</h1>
				<p className="text-[var(--color-text-secondary)]">
					{t("pages.terminal.selectProfileFirst")}
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{t("pages.terminal.title")}</h1>
				<Button variant="outline" size="sm" onClick={handleClear}>
					<Trash2 className="mr-2 h-4 w-4" />
					{t("pages.terminal.clear")}
				</Button>
			</div>

			<div
				ref={outputRef}
				className="flex-1 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm"
			>
				{history.length === 0 ? (
					<p className="text-[var(--color-text-tertiary)] whitespace-pre-wrap">
						{t("pages.terminal.helpText")}
					</p>
				) : (
					history.map((entry, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: terminal history may have duplicate commands
						<div key={`${i}-${entry.command}`} className="mb-3">
							<div className="text-[var(--color-accent)]">mc $ {entry.command}</div>
							<pre
								className={`mt-1 whitespace-pre-wrap ${
									entry.exit_code === 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{entry.output}
							</pre>
						</div>
					))
				)}
				{running && (
					<div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
						<Loader2 className="h-4 w-4 animate-spin" />
						{t("common.running")}
					</div>
				)}
			</div>

			{/* Command input with autocomplete */}
			<div className="relative">
				{showSuggestions && suggestions.length > 0 && (
					<div className="absolute bottom-full left-0 mb-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg">
						{suggestions.map((s, i) => (
							<button
								key={s}
								type="button"
								onClick={() => applySuggestion(s)}
								className={`flex w-full items-center px-3 py-1.5 text-left font-mono text-sm ${
									i === selectedSuggestion
										? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
										: "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
								}`}
							>
								<span className="text-[var(--color-text-tertiary)]">mc </span>
								<span className="ml-1">{s}</span>
								{i === selectedSuggestion && (
									<span className="ml-auto text-xs text-[var(--color-text-tertiary)]">Tab</span>
								)}
							</button>
						))}
					</div>
				)}
				<form onSubmit={handleSubmit} className="flex items-center gap-2">
					<span className="shrink-0 font-mono text-sm text-[var(--color-text-secondary)]">
						mc $
					</span>
					<input
						ref={inputRef}
						value={command}
						onChange={(e) => handleInputChange(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
						onFocus={() => updateSuggestions(command)}
						placeholder={t("pages.terminal.placeholder")}
						disabled={running}
						className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 font-mono text-sm transition-colors placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<Button type="submit" size="sm" disabled={running || !command.trim()}>
						{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
					</Button>
				</form>
			</div>
		</div>
	);
}
