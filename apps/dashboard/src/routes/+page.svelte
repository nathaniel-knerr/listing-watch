<script lang="ts">
	import type { FlagUpdate, Listing } from "@listing-watch/shared";
	import { API_URL } from "#lib/api.ts";
	import { paginate, viewListings, type SortDir, type SortKey } from "#lib/listings.ts";
	import { createFlagMutation, createListingsQuery } from "#lib/queries.ts";
	import { t } from "#lib/strings.ts";
	import ListingTable from "#lib/components/ListingTable.svelte";
	import FlagModal from "#lib/components/FlagModal.svelte";

	const PAGE_SIZE = 50;

	let search = $state("");
	let flaggedOnly = $state(false);
	let sortKey = $state<SortKey>("title");
	let sortDir = $state<SortDir>("asc");
	let page = $state(1);
	let selected = $state<Listing | null>(null);
	let saveError = $state<string | null>(null);

	const listingsQuery = createListingsQuery();
	const flagMutation = createFlagMutation((listing) => {
		saveError = t.saveError(listing.title);
	});

	const visible = $derived(
		viewListings(listingsQuery.data ?? [], { search, flaggedOnly, sortKey, sortDir })
	);
	const current = $derived(paginate(visible, page, PAGE_SIZE));
	const flaggedCount = $derived((listingsQuery.data ?? []).filter((l) => l.status === "flagged").length);

	function sortBy(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
		else {
			sortKey = key;
			sortDir = "asc";
		}
	}

	function save(update: FlagUpdate) {
		if (!selected) return;
		saveError = null;
		flagMutation.mutate({ listing: selected, update });
		selected = null; // close right away: the table already shows the change (optimistic)
	}
</script>

<main class="mx-auto max-w-6xl px-4 py-8">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-slate-900">{t.appTitle}</h1>
		<p class="text-sm text-slate-600">{t.appSubtitle}</p>
	</header>

	<div class="mb-4 flex flex-wrap items-center gap-4">
		<input
			type="search"
			bind:value={search}
			oninput={() => (page = 1)}
			placeholder={t.searchPlaceholder}
			aria-label={t.searchLabel}
			class="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
		/>
		<label class="inline-flex items-center gap-2 text-sm text-slate-700">
			<input type="checkbox" bind:checked={flaggedOnly} onchange={() => (page = 1)} class="rounded" />
			{t.flaggedOnly} ({flaggedCount})
		</label>
	</div>

	{#if saveError}
		<div class="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
			{saveError}
			<button type="button" class="font-medium hover:underline" onclick={() => (saveError = null)}>{t.dismiss}</button>
		</div>
	{/if}

	{#if listingsQuery.isPending}
		<p class="text-slate-500">{t.loading}</p>
	{:else if listingsQuery.isError}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
			{t.loadError} {API_URL}?
			<button type="button" class="ml-2 font-medium underline" onclick={() => listingsQuery.refetch()}>{t.retry}</button>
		</div>
	{:else}
		<ListingTable listings={current.items} {sortKey} {sortDir} onSort={sortBy} onReview={(l) => (selected = l)} />

		<nav class="mt-4 flex items-center justify-between text-sm text-slate-600">
			<span>{t.showing(current.from, current.to, visible.length)}</span>
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
					disabled={current.page <= 1}
					onclick={() => (page = current.page - 1)}>{t.prev}</button
				>
				<span>{t.page(current.page, current.pageCount)}</span>
				<button
					type="button"
					class="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
					disabled={current.page >= current.pageCount}
					onclick={() => (page = current.page + 1)}>{t.next}</button
				>
			</div>
		</nav>
	{/if}
</main>

{#if selected}
	{#key selected.id}
		<FlagModal listing={selected} onSave={save} onClose={() => (selected = null)} />
	{/key}
{/if}
