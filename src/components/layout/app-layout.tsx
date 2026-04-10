import { Outlet } from "react-router-dom";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ToastContainer } from "@/components/ui/toast";
import { useToastStore } from "@/stores/toast-store";
import { Footer } from "./footer";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppLayout() {
	const { toasts, dismissToast } = useToastStore();

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)]">
			<Header />
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex flex-1 flex-col overflow-hidden">
					<div className="border-b border-[var(--color-border)] px-6 py-3">
						<Breadcrumb />
					</div>
					<div className="flex-1 overflow-auto p-6">
						<Outlet />
					</div>
				</main>
			</div>
			<Footer />
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
