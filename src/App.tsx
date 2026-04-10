import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { BucketSettingsPage } from "@/pages/buckets/bucket-settings";
import { BucketsPage } from "@/pages/buckets/index";
import { DashboardPage } from "@/pages/dashboard/index";
import { GroupsPage } from "@/pages/groups/index";
import { MonitoringPage } from "@/pages/monitoring/index";
import { ObjectsPage } from "@/pages/objects/index";
import { PoliciesPage } from "@/pages/policies/index";
import { PolicyEditorPage } from "@/pages/policies/policy-editor";
import { SettingsPage } from "@/pages/settings/index";
import { TerminalPage } from "@/pages/terminal/index";
import { UsersPage } from "@/pages/users/index";
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
					<Route path="/buckets/settings" element={<BucketSettingsPage />} />
					<Route path="/objects" element={<ObjectsPage />} />
					<Route path="/users" element={<UsersPage />} />
					<Route path="/groups" element={<GroupsPage />} />
					<Route path="/policies" element={<PoliciesPage />} />
					<Route path="/policies/editor" element={<PolicyEditorPage />} />
					<Route path="/monitoring" element={<MonitoringPage />} />
					<Route path="/terminal" element={<TerminalPage />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
