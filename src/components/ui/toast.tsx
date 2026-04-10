import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ToastData {
	id: string;
	title: string;
	description?: string;
	variant?: "default" | "success" | "error" | "warning";
	duration?: number;
}

const icons = {
	default: Info,
	success: CheckCircle,
	error: AlertCircle,
	warning: AlertCircle,
};

const variantStyles = {
	default: "border-[var(--color-border)]",
	success: "border-[var(--color-success)]",
	error: "border-[var(--color-danger)]",
	warning: "border-[var(--color-warning)]",
};

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
	const variant = toast.variant ?? "default";
	const Icon = icons[variant];

	useEffect(() => {
		const timer = setTimeout(() => {
			onDismiss(toast.id);
		}, toast.duration ?? 4000);
		return () => clearTimeout(timer);
	}, [toast.id, toast.duration, onDismiss]);

	return (
		<div
			className={cn(
				"pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-[var(--color-bg)] p-4 shadow-lg",
				variantStyles[variant],
			)}
		>
			<Icon className="mt-0.5 h-4 w-4 shrink-0" />
			<div className="flex-1">
				<p className="text-sm font-medium">{toast.title}</p>
				{toast.description && (
					<p className="mt-1 text-xs text-[var(--color-text-secondary)]">{toast.description}</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => onDismiss(toast.id)}
				className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
}

export function ToastContainer({
	toasts,
	onDismiss,
}: {
	toasts: ToastData[];
	onDismiss: (id: string) => void;
}) {
	return (
		<div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			{toasts.map((t) => (
				<Toast key={t.id} toast={t} onDismiss={onDismiss} />
			))}
		</div>
	);
}
