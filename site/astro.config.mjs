import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
	site: "https://lbkeppler.github.io",
	base: "/minio-console",
	integrations: [tailwind()],
	i18n: {
		defaultLocale: "pt",
		locales: ["pt", "en", "es"],
		routing: {
			prefixDefaultLocale: false,
		},
	},
});
