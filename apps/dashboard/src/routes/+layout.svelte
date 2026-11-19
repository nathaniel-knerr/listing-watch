<script lang="ts">
	import "./layout.css";
	import favicon from "#lib/assets/favicon.svg";
	import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
	import type { LayoutProps } from "./$types";
	import { t } from "#lib/strings.ts";

	let { children }: LayoutProps = $props();

	// One cache for the whole app. staleTime avoids refetching 1,000 rows on every focus.
	const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{t.appTitle}</title>
</svelte:head>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
