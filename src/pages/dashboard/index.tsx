import { useTranslation } from "react-i18next";

export function DashboardPage() {
	const { t } = useTranslation();

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">{t("pages.dashboard.title")}</h1>
			<p className="text-[var(--color-text-secondary)]">
				{t("pages.dashboard.description")}
			</p>
		</div>
	);
}
