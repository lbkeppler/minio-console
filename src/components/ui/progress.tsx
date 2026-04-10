import { cn } from "@/lib/utils";

interface ProgressProps {
	value: number;
	className?: string;
}

export function Progress({ value, className }: ProgressProps) {
	return (
		<div
			className={cn(
				"h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]",
				className,
			)}
		>
			<div
				className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
				style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
			/>
		</div>
	);
}
