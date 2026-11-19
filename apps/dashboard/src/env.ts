import { defineEnvVars } from "@sveltejs/kit/env";

// SvelteKit 3 environment variables. `public: true` means the browser may read it
// (imported from "$app/env/public").
export const variables = defineEnvVars({
	PUBLIC_API_URL: {
		public: true,
		description: "Base URL of the ListingWatch Fastify API",
		schema: (value) => value || "http://127.0.0.1:3001"
	}
});
