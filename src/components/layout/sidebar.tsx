import {
	Activity,
	Database,
	FolderOpen,
	PanelLeft,
	PanelLeftClose,
	Settings,
	Shield,
	Terminal,
	Users,
	UsersRound,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";

const navItems = [
	{ path: "/buckets", label: "Buckets", icon: Database },
	{ path: "/objects", label: "Objects", icon: FolderOpen },
	{ path: "/users", label: "Users", icon: Users },
	{ path: "/groups", label: "Groups", icon: UsersRound },
	{ path: "/policies", label: "Policies", icon: Shield },
	{ path: "/monitoring", label: "Monitoring", icon: Activity },
	{ path: "/terminal", label: "MC Terminal", icon: Terminal },
];

export function Sidebar() {
	const { collapsed, toggle } = useSidebarStore();
	const location = useLocation();

	return (
		<aside
			className={cn(
				"flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-200",
				collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]",
			)}
		>
			<div className="flex items-center justify-between p-3">
				{!collapsed && (
					<span className="text-sm font-semibold text-[var(--color-text)]">MinIO</span>
				)}
				<button
					type="button"
					onClick={toggle}
					className="rounded-md p-1.5 hover:bg-[var(--color-bg-tertiary)]"
				>
					{collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
				</button>
			</div>

			<nav className="flex-1 space-y-1 px-2">
				{navItems.map((item) => {
					const isActive = location.pathname.startsWith(item.path);
					return (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
									: "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]",
								collapsed && "justify-center px-0",
							)}
							title={collapsed ? item.label : undefined}
						>
							<item.icon className="h-4 w-4 shrink-0" />
							{!collapsed && <span>{item.label}</span>}
						</Link>
					);
				})}
			</nav>

			<div className="border-t border-[var(--color-border)] p-2">
				<Link
					to="/settings"
					className={cn(
						"flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]",
						collapsed && "justify-center px-0",
					)}
				>
					<Settings className="h-4 w-4 shrink-0" />
					{!collapsed && <span>Settings</span>}
				</Link>
			</div>
		</aside>
	);
}
