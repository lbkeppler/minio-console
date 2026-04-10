import { invoke } from "@tauri-apps/api/core";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function TerminalPage() {
	const { config } = useProfileStore();
	const hasActiveProfile = !!config?.active_profile_id;

	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [command, setCommand] = useState("");
	const [running, setRunning] = useState(false);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [commandHistory, setCommandHistory] = useState<string[]>([]);

	const outputRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const scrollToBottom = useCallback(() => {
		if (outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [history, scrollToBottom]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = command.trim();
			if (!trimmed || running) return;

			setRunning(true);
			setCommand("");
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
				setHistory((prev) => [
					...prev,
					{ command: trimmed, output: String(err), exit_code: 1 },
				]);
			} finally {
				setRunning(false);
				inputRef.current?.focus();
			}
		},
		[command, running],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowUp") {
				e.preventDefault();
				if (commandHistory.length === 0) return;
				const next = Math.min(historyIndex + 1, commandHistory.length - 1);
				setHistoryIndex(next);
				setCommand(commandHistory[next] ?? "");
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
			}
		},
		[commandHistory, historyIndex],
	);

	const handleClear = useCallback(() => {
		setHistory([]);
	}, []);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">MC Terminal</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a server profile first to use the terminal.
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">MC Terminal</h1>
				<Button variant="outline" size="sm" onClick={handleClear}>
					<Trash2 className="mr-2 h-4 w-4" />
					Clear
				</Button>
			</div>

			<div
				ref={outputRef}
				className="flex-1 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm"
			>
				{history.length === 0 ? (
					<p className="text-[var(--color-text-tertiary)]">
						Type an mc command below and press Enter. Commands are executed
						against the active server profile.
						{"\n\n"}Examples: ls, admin info, version
					</p>
				) : (
					history.map((entry, i) => (
						<div key={`${i}-${entry.command}`} className="mb-3">
							<div className="text-[var(--color-accent)]">
								mc $ {entry.command}
							</div>
							<pre
								className={`mt-1 whitespace-pre-wrap ${
									entry.exit_code === 0
										? "text-green-400"
										: "text-red-400"
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
						Running...
					</div>
				)}
			</div>

			<form onSubmit={handleSubmit} className="flex items-center gap-2">
				<span className="shrink-0 font-mono text-sm text-[var(--color-text-secondary)]">
					mc $
				</span>
				<Input
					ref={inputRef}
					value={command}
					onChange={(e) => setCommand(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Enter command..."
					disabled={running}
					className="font-mono"
					autoFocus
				/>
				<Button type="submit" size="sm" disabled={running || !command.trim()}>
					{running ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</Button>
			</form>
		</div>
	);
}
