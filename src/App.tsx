import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard/index";
import { BucketsPage } from "@/pages/buckets/index";
import { ObjectsPage } from "@/pages/objects/index";
import { UsersPage } from "@/pages/users/index";
import { GroupsPage } from "@/pages/groups/index";
import { PoliciesPage } from "@/pages/policies/index";
import { MonitoringPage } from "@/pages/monitoring/index";
import { TerminalPage } from "@/pages/terminal/index";
import { SettingsPage } from "@/pages/settings/index";
import { useProfileStore } from "@/stores/profile-store";

export function App() {
	const loadConfig = useProfileStore((s) => s.loadConfig);

	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	return (
		<BrowserRouter>
			<Routes>
				<Route element={<AppLayout />}>
					<Route path="/" element={<DashboardPage />} />
					<Route path="/buckets" element={<BucketsPage />} />
					<Route path="/objects" element={<ObjectsPage />} />
					<Route path="/users" element={<UsersPage />} />
					<Route path="/groups" element={<GroupsPage />} />
					<Route path="/policies" element={<PoliciesPage />} />
					<Route path="/monitoring" element={<MonitoringPage />} />
					<Route path="/terminal" element={<TerminalPage />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
