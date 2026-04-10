import { Search, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
	onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
	const [query, setQuery] = useState("");
	const { t } = useTranslation();

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		onSearch(query);
	}

	function handleClear() {
		setQuery("");
		onSearch("");
	}

	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-2">
			<div className="relative flex-1">
				<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={t("pages.objects.searchByPrefix")}
					className="pl-9 pr-8"
				/>
				{query && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
			<Button type="submit" size="sm" variant="outline">
				<Search className="h-4 w-4" /> {t("common.search")}
			</Button>
		</form>
	);
}
