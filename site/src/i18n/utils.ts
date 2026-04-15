import { ui, defaultLang, type Lang } from "./ui";

export function getLangFromUrl(url: URL): Lang {
	const [, base, lang] = url.pathname.split("/");
	// base is "minio-console" (deploy base), lang is the locale segment
	if (lang && lang in ui) return lang as Lang;
	return defaultLang as Lang;
}

export function useTranslations(lang: Lang) {
	return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
		return ui[lang][key] ?? ui[defaultLang][key];
	};
}

export function getLocalizedPath(lang: Lang, path: string = ""): string {
	const cleanPath = path.replace(/^\//, "");
	if (lang === defaultLang) return `/${cleanPath}`;
	return `/${lang}/${cleanPath}`;
}
