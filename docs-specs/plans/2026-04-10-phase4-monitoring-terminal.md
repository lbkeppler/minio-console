# Phase 4: Monitoring + MC Terminal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server monitoring (info, health, disk usage) and an embedded MC terminal for executing raw mc commands with formatted output.

**Architecture:** Monitoring uses `mc admin info` and `mc admin prometheus metrics` via the MC Runner. MC Terminal is a React-based terminal emulator that sends commands through Tauri IPC, executes via mc CLI, and renders output with ANSI color support.

**Tech Stack:** Rust (mc CLI runner), React 18, xterm.js (terminal emulator), Zustand, Tauri 2 IPC

---

## File Structure

### Backend (Rust)

| File | Responsibility |
|---|---|
| `src-tauri/src/mc/monitoring.rs` | Server info, health, disk metrics via mc admin |
| `src-tauri/src/mc/mod.rs` | Add monitoring module |
| `src-tauri/src/commands/monitoring.rs` | Tauri IPC commands for monitoring |
| `src-tauri/src/commands/terminal.rs` | Tauri IPC command for running raw mc commands |
| `src-tauri/src/commands/mod.rs` | Add monitoring + terminal modules |
| `src-tauri/src/lib.rs` | Register new commands |
| `src-tauri/src/models/types.rs` | Add ServerInfo, DiskInfo types |

### Frontend (React)

| File | Responsibility |
|---|---|
| `src/stores/monitoring-store.ts` | Zustand store for server info/metrics |
| `src/pages/monitoring/index.tsx` | Monitoring dashboard with server info + disk usage |
| `src/pages/monitoring/server-info-card.tsx` | Server info display card |
| `src/pages/monitoring/disk-usage.tsx` | Disk usage visualization |
| `src/pages/terminal/index.tsx` | MC Terminal with command input + output |

---

## Task 1: Monitoring Backend (Rust)

**Files:**
- Modify: `src-tauri/src/models/types.rs`
- Create: `src-tauri/src/mc/monitoring.rs`
- Create: `src-tauri/src/commands/monitoring.rs`
- Create: `src-tauri/src/commands/terminal.rs`
- Modify: `src-tauri/src/mc/mod.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Add types to models/types.rs**

Add before `#[cfg(test)]`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub version: String,
    pub uptime: String,
    pub network: String,
    pub drives_online: i32,
    pub drives_offline: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub path: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McCommandResult {
    pub output: String,
    pub exit_code: i32,
}
```

- [ ] **Step 2: Add tests**

```rust
    #[test]
    fn test_server_info_serialization() {
        let info = ServerInfo {
            version: "RELEASE.2024-06-01".to_string(),
            uptime: "3 days".to_string(),
            network: "1 OK".to_string(),
            drives_online: 4,
            drives_offline: 0,
        };
        let json = serde_json::to_string(&info).unwrap();
        let deserialized: ServerInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.version, "RELEASE.2024-06-01");
    }
```

- [ ] **Step 3: Create mc/monitoring.rs**

```rust
use crate::models::{DiskInfo, ServerInfo};
use super::{alias, runner};

pub async fn get_server_info() -> Result<ServerInfo, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "info", &al, "--json"]).await?;

    let mut version = String::new();
    let mut uptime = String::new();
    let mut network = String::new();
    let mut drives_online: i32 = 0;
    let mut drives_offline: i32 = 0;

    for line in output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(info) = json.get("info") {
                if let Some(v) = info.get("version").and_then(|v| v.as_str()) {
                    version = v.to_string();
                }
                if let Some(u) = info.get("uptime").and_then(|v| v.as_str()) {
                    uptime = u.to_string();
                }
                if let Some(n) = info.get("network").and_then(|v| v.as_str()) {
                    network = n.to_string();
                }
                // Parse servers array for drive counts
                if let Some(servers) = info.get("servers").and_then(|v| v.as_array()) {
                    for server in servers {
                        if let Some(on) = server.get("drives_online").and_then(|v| v.as_i64()) {
                            drives_online += on as i32;
                        }
                        if let Some(off) = server.get("drives_offline").and_then(|v| v.as_i64()) {
                            drives_offline += off as i32;
                        }
                    }
                }
            }
            // Some mc versions put fields at root
            if version.is_empty() {
                if let Some(v) = json.get("version").and_then(|v| v.as_str()) {
                    version = v.to_string();
                }
            }
        }
    }

    Ok(ServerInfo {
        version,
        uptime,
        network,
        drives_online,
        drives_offline,
    })
}

pub async fn get_disk_usage() -> Result<Vec<DiskInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "info", &al, "--json"]).await?;

    let mut disks = Vec::new();

    for line in output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(info) = json.get("info") {
                if let Some(servers) = info.get("servers").and_then(|v| v.as_array()) {
                    for server in servers {
                        if let Some(drives) = server.get("drives").and_then(|v| v.as_array()) {
                            for drive in drives {
                                let path = drive.get("path")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown")
                                    .to_string();
                                let total = drive.get("totalSpace")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0);
                                let used = drive.get("usedSpace")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0);
                                let available = if total > used { total - used } else { 0 };
                                let percent = if total > 0 {
                                    (used as f64 / total as f64) * 100.0
                                } else {
                                    0.0
                                };

                                disks.push(DiskInfo {
                                    path,
                                    total_bytes: total,
                                    used_bytes: used,
                                    available_bytes: available,
                                    usage_percent: percent,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(disks)
}
```

- [ ] **Step 4: Update mc/mod.rs**

Add `pub mod monitoring;`

- [ ] **Step 5: Create commands/monitoring.rs**

```rust
use crate::mc::monitoring;
use crate::models::{DiskInfo, ServerInfo};

#[tauri::command]
pub async fn get_server_info() -> Result<ServerInfo, String> {
    monitoring::get_server_info().await
}

#[tauri::command]
pub async fn get_disk_usage() -> Result<Vec<DiskInfo>, String> {
    monitoring::get_disk_usage().await
}
```

- [ ] **Step 6: Create commands/terminal.rs**

```rust
use crate::mc::{alias, runner};
use crate::models::McCommandResult;

#[tauri::command]
pub async fn run_mc_command(command: String) -> Result<McCommandResult, String> {
    // Ensure alias is set
    let al = alias::ensure_alias().await?;

    // Parse the user command — replace "ALIAS" placeholder with the real alias
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    // Build args: prepend the command parts, replace first arg after subcommand with alias if needed
    let mut args: Vec<String> = parts.iter().map(|s| s.to_string()).collect();

    // Auto-inject alias: if command starts with "admin" or known subcommands,
    // and doesn't already contain the alias, append it after the subcommand group
    let needs_alias = !args.iter().any(|a| a == &al);
    if needs_alias {
        // Determine where to inject alias based on command structure
        // mc admin info ALIAS, mc ls ALIAS/bucket, mc stat ALIAS/path
        if args.len() >= 2 && args[0] == "admin" {
            // mc admin <subcmd> ALIAS ...
            if args.len() >= 2 {
                args.insert(2.min(args.len()), al.clone());
            }
        } else if !args.is_empty() {
            // mc <cmd> ALIAS/...
            args.insert(1.min(args.len()), al.clone());
        }
    }

    // Add --json for parseable output
    if !args.iter().any(|a| a == "--json") {
        args.push("--json".to_string());
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match runner::run_mc(&arg_refs).await {
        Ok(output) => Ok(McCommandResult {
            output: format_mc_output(&output),
            exit_code: 0,
        }),
        Err(e) => Ok(McCommandResult {
            output: e,
            exit_code: 1,
        }),
    }
}

fn format_mc_output(raw: &str) -> String {
    let mut formatted = String::new();
    for line in raw.lines() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            // Pretty-print JSON
            if let Ok(pretty) = serde_json::to_string_pretty(&json) {
                formatted.push_str(&pretty);
                formatted.push('\n');
            } else {
                formatted.push_str(line);
                formatted.push('\n');
            }
        } else {
            formatted.push_str(line);
            formatted.push('\n');
        }
    }
    formatted
}
```

- [ ] **Step 7: Update commands/mod.rs**

Add:
```rust
pub mod monitoring;
pub mod terminal;
```

- [ ] **Step 8: Register commands in lib.rs**

Add to invoke_handler:
```rust
            commands::monitoring::get_server_info,
            commands::monitoring::get_disk_usage,
            commands::terminal::run_mc_command,
```

- [ ] **Step 9: Verify**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check && cargo test
```

- [ ] **Step 10: Commit**

```bash
git add src-tauri/
git commit -m "feat: add monitoring and MC terminal backend commands"
```

---

## Task 2: Monitoring Frontend

**Files:**
- Create: `src/stores/monitoring-store.ts`
- Create: `src/pages/monitoring/server-info-card.tsx`
- Create: `src/pages/monitoring/disk-usage.tsx`
- Modify: `src/pages/monitoring/index.tsx`

- [ ] **Step 1: Create monitoring store**

Create `src/stores/monitoring-store.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface ServerInfo {
	version: string;
	uptime: string;
	network: string;
	drives_online: number;
	drives_offline: number;
}

export interface DiskInfo {
	path: string;
	total_bytes: number;
	used_bytes: number;
	available_bytes: number;
	usage_percent: number;
}

interface MonitoringStore {
	serverInfo: ServerInfo | null;
	disks: DiskInfo[];
	loading: boolean;
	loadServerInfo: () => Promise<void>;
	loadDiskUsage: () => Promise<void>;
}

export const useMonitoringStore = create<MonitoringStore>((set) => ({
	serverInfo: null,
	disks: [],
	loading: false,
	loadServerInfo: async () => {
		set({ loading: true });
		try {
			const serverInfo = await invoke<ServerInfo>("get_server_info");
			set({ serverInfo, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	loadDiskUsage: async () => {
		try {
			const disks = await invoke<DiskInfo[]>("get_disk_usage");
			set({ disks });
		} catch (e) {
			throw e;
		}
	},
}));
```

- [ ] **Step 2: Create server info card**

Create `src/pages/monitoring/server-info-card.tsx`:

```tsx
import type { ServerInfo } from "@/stores/monitoring-store";
import { Server, HardDrive, Clock, Network } from "lucide-react";

interface ServerInfoCardProps {
	info: ServerInfo;
}

export function ServerInfoCard({ info }: ServerInfoCardProps) {
	const items = [
		{ icon: Server, label: "Version", value: info.version || "—" },
		{ icon: Clock, label: "Uptime", value: info.uptime || "—" },
		{ icon: Network, label: "Network", value: info.network || "—" },
		{
			icon: HardDrive,
			label: "Drives",
			value: `${info.drives_online} online${info.drives_offline > 0 ? `, ${info.drives_offline} offline` : ""}`,
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{items.map((item) => (
				<div
					key={item.label}
					className="rounded-lg border border-[var(--color-border)] p-4"
				>
					<div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
						<item.icon className="h-4 w-4" />
						<span className="text-xs font-medium uppercase">{item.label}</span>
					</div>
					<p className="mt-2 text-sm font-semibold">{item.value}</p>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 3: Create disk usage component**

Create `src/pages/monitoring/disk-usage.tsx`:

```tsx
import type { DiskInfo } from "@/stores/monitoring-store";
import { Progress } from "@/components/ui/progress";
import { HardDrive } from "lucide-react";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB", "PB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

interface DiskUsageProps {
	disks: DiskInfo[];
}

export function DiskUsage({ disks }: DiskUsageProps) {
	if (disks.length === 0) {
		return (
			<p className="text-sm text-[var(--color-text-tertiary)]">
				No disk information available.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			{disks.map((disk, i) => (
				<div
					key={`${disk.path}-${i}`}
					className="rounded-lg border border-[var(--color-border)] p-4"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<HardDrive className="h-4 w-4 text-[var(--color-text-secondary)]" />
							<span className="text-sm font-medium">{disk.path}</span>
						</div>
						<span className="text-xs text-[var(--color-text-secondary)]">
							{formatBytes(disk.used_bytes)} / {formatBytes(disk.total_bytes)}
						</span>
					</div>
					<div className="mt-2">
						<Progress value={disk.usage_percent} />
					</div>
					<div className="mt-1 flex justify-between text-xs text-[var(--color-text-tertiary)]">
						<span>{disk.usage_percent.toFixed(1)}% used</span>
						<span>{formatBytes(disk.available_bytes)} free</span>
					</div>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 4: Build monitoring page**

Replace `src/pages/monitoring/index.tsx`:

```tsx
import { useEffect } from "react";
import { useMonitoringStore } from "@/stores/monitoring-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { ServerInfoCard } from "./server-info-card";
import { DiskUsage } from "./disk-usage";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export function MonitoringPage() {
	const { serverInfo, disks, loading, loadServerInfo, loadDiskUsage } =
		useMonitoringStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const hasActiveProfile = !!config?.active_profile_id;

	function loadAll() {
		loadServerInfo().catch((err) => {
			addToast({
				title: "Error loading server info",
				description: String(err),
				variant: "error",
			});
		});
		loadDiskUsage().catch((err) => {
			addToast({
				title: "Error loading disk usage",
				description: String(err),
				variant: "error",
			});
		});
	}

	useEffect(() => {
		if (hasActiveProfile) {
			loadAll();
		}
	}, [hasActiveProfile]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Monitoring</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a server profile first.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Monitoring</h1>
				<div className="flex items-center gap-2">
					{loading && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={loadAll} size="sm" variant="outline">
						<RefreshCw className="h-4 w-4" /> Refresh
					</Button>
				</div>
			</div>

			{serverInfo && <ServerInfoCard info={serverInfo} />}

			<section className="space-y-3">
				<h2 className="text-lg font-medium">Disk Usage</h2>
				<DiskUsage disks={disks} />
			</section>
		</div>
	);
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/monitoring-store.ts src/pages/monitoring/
git commit -m "feat: add monitoring dashboard with server info and disk usage"
```

---

## Task 3: MC Terminal Frontend

**Files:**
- Modify: `src/pages/terminal/index.tsx`

- [ ] **Step 1: Build MC Terminal page**

Replace `src/pages/terminal/index.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "@/stores/profile-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trash2, Loader2 } from "lucide-react";

interface McCommandResult {
	output: string;
	exit_code: number;
}

interface HistoryEntry {
	command: string;
	output: string;
	exitCode: number;
	timestamp: Date;
}

export function TerminalPage() {
	const { config } = useProfileStore();
	const [command, setCommand] = useState("");
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [running, setRunning] = useState(false);
	const [cmdHistory, setCmdHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const outputRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, [history]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!command.trim() || running) return;

		const cmd = command.trim();
		setCommand("");
		setRunning(true);
		setCmdHistory((prev) => [cmd, ...prev]);
		setHistoryIndex(-1);

		try {
			const result = await invoke<McCommandResult>("run_mc_command", {
				command: cmd,
			});
			setHistory((prev) => [
				...prev,
				{
					command: cmd,
					output: result.output,
					exitCode: result.exit_code,
					timestamp: new Date(),
				},
			]);
		} catch (err) {
			setHistory((prev) => [
				...prev,
				{
					command: cmd,
					output: String(err),
					exitCode: 1,
					timestamp: new Date(),
				},
			]);
		} finally {
			setRunning(false);
			inputRef.current?.focus();
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (cmdHistory.length > 0) {
				const newIndex = Math.min(historyIndex + 1, cmdHistory.length - 1);
				setHistoryIndex(newIndex);
				setCommand(cmdHistory[newIndex] ?? "");
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (historyIndex > 0) {
				const newIndex = historyIndex - 1;
				setHistoryIndex(newIndex);
				setCommand(cmdHistory[newIndex] ?? "");
			} else {
				setHistoryIndex(-1);
				setCommand("");
			}
		}
	}

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">MC Terminal</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a server profile first.
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between pb-3">
				<h1 className="text-2xl font-semibold">MC Terminal</h1>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setHistory([])}
					disabled={history.length === 0}
				>
					<Trash2 className="h-4 w-4" /> Clear
				</Button>
			</div>

			{/* Output area */}
			<div
				ref={outputRef}
				className="flex-1 overflow-auto rounded-t-lg border border-b-0 border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-xs leading-relaxed"
			>
				{history.length === 0 && (
					<p className="text-[var(--color-text-tertiary)]">
						Type an mc command below. The active server alias is injected automatically.
						<br />
						Examples: admin info, ls, admin user list, admin policy list
					</p>
				)}
				{history.map((entry, i) => (
					<div key={`${entry.timestamp.getTime()}-${i}`} className="mb-3">
						<div className="flex items-center gap-2">
							<span className="text-[var(--color-accent)]">mc $</span>
							<span className="text-[var(--color-text)]">{entry.command}</span>
						</div>
						<pre
							className={`mt-1 whitespace-pre-wrap ${
								entry.exitCode !== 0
									? "text-[var(--color-danger)]"
									: "text-[var(--color-text-secondary)]"
							}`}
						>
							{entry.output || "(no output)"}
						</pre>
					</div>
				))}
				{running && (
					<div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
						<Loader2 className="h-3 w-3 animate-spin" />
						Running...
					</div>
				)}
			</div>

			{/* Command input */}
			<form onSubmit={handleSubmit} className="flex">
				<div className="flex items-center rounded-bl-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 font-mono text-xs text-[var(--color-accent)]">
					mc $
				</div>
				<Input
					ref={inputRef}
					value={command}
					onChange={(e) => setCommand(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="admin info, ls, admin user list..."
					className="rounded-none border-x-0 font-mono text-xs"
					disabled={running}
					autoFocus
				/>
				<Button
					type="submit"
					disabled={running || !command.trim()}
					className="rounded-l-none rounded-br-lg"
					size="icon"
				>
					<Send className="h-4 w-4" />
				</Button>
			</form>
		</div>
	);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/terminal/
git commit -m "feat: add MC terminal with command history and formatted output"
```

---

## Task 4: Lint and Polish

- [ ] **Step 1:** `npx @biomejs/biome check --write src/`
- [ ] **Step 2:** `export PATH="/c/Users/lkr2/.cargo/bin:$PATH" && cd src-tauri && cargo clippy -- -D warnings && cargo fmt`
- [ ] **Step 3:** `export PATH="/c/Users/lkr2/.cargo/bin:$PATH" && cd src-tauri && cargo test`
- [ ] **Step 4:** `npx tsc --noEmit`
- [ ] **Step 5:** If changes: `git add -A && git commit -m "chore: lint fixes and polish for Phase 4"`

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Monitoring + terminal backend (server info, disk usage, mc command execution) |
| 2 | Monitoring dashboard (server info cards, disk usage with progress bars) |
| 3 | MC Terminal (command input, history, formatted JSON output) |
| 4 | Lint and polish |

**End state:** Monitoring page shows server version, uptime, network, drive status, and disk usage with progress bars. MC Terminal lets users type raw mc commands with auto-injected alias, JSON formatted output, command history (arrow keys), and clear button.
