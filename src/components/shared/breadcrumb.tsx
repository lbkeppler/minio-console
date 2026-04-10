import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export function Breadcrumb() {
	const location = useLocation();
	const segments = location.pathname.split("/").filter(Boolean);

	if (segments.length === 0) return null;

	return (
		<nav className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
			<Link to="/" className="hover:text-[var(--color-text)]">
				Home
			</Link>
			{segments.map((segment, index) => {
				const path = `/${segments.slice(0, index + 1).join("/")}`;
				const isLast = index === segments.length - 1;
				const label = segment.charAt(0).toUpperCase() + segment.slice(1);

				return (
					<span key={path} className="flex items-center gap-1">
						<ChevronRight className="h-3 w-3" />
						{isLast ? (
							<span className="font-medium text-[var(--color-text)]">{label}</span>
						) : (
							<Link to={path} className="hover:text-[var(--color-text)]">
								{label}
							</Link>
						)}
					</span>
				);
			})}
		</nav>
	);
}
