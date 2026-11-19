<script lang="ts">
	import type { Listing } from "@listing-watch/shared";
	import type { SortDir, SortKey } from "#lib/listings.ts";
	import { t } from "#lib/strings.ts";
	import StatusBadge from "./StatusBadge.svelte";

	let {
		listings,
		sortKey,
		sortDir,
		onSort,
		onReview
	}: {
		listings: Listing[];
		sortKey: SortKey;
		sortDir: SortDir;
		onSort: (key: SortKey) => void;
		onReview: (listing: Listing) => void;
	} = $props();

	const columns: { key: SortKey; label: string; align: string }[] = [
		{ key: "title", label: t.columns.title, align: "text-left" },
		{ key: "price", label: t.columns.price, align: "text-right" },
		{ key: "rating", label: t.columns.rating, align: "text-left" },
		{ key: "inStock", label: t.columns.inStock, align: "text-left" },
		{ key: "status", label: t.columns.status, align: "text-left" }
	];

	const ariaSort = (key: SortKey) =>
		sortKey !== key ? "none" : sortDir === "asc" ? "ascending" : "descending";
</script>

<div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
	<table class="min-w-full divide-y divide-slate-200 text-sm">
		<thead class="bg-slate-50">
			<tr>
				{#each columns as col (col.key)}
					<th scope="col" class="px-4 py-2 font-semibold text-slate-700 {col.align}" aria-sort={ariaSort(col.key)}>
						<button
							type="button"
							class="inline-flex items-center gap-1 hover:text-slate-950"
							onclick={() => onSort(col.key)}
						>
							{col.label}
							<span class="text-xs text-slate-400" aria-hidden="true">
								{sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
							</span>
						</button>
					</th>
				{/each}
				<th scope="col" class="px-4 py-2"><span class="sr-only">{t.review}</span></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each listings as listing (listing.id)}
				<tr class="hover:bg-slate-50" data-testid="listing-row">
					<td class="max-w-md px-4 py-2">
						<div class="truncate font-medium text-slate-900" title={listing.title}>{listing.title}</div>
						{#if listing.flagReasons.length > 0}
							<div class="truncate text-xs text-red-600" title={listing.flagReasons.join("\n")}>
								{listing.flagReasons[0]}{listing.flagReasons.length > 1 ? ` (+${listing.flagReasons.length - 1})` : ""}
							</div>
						{/if}
					</td>
					<td class="px-4 py-2 text-right tabular-nums">£{listing.price.toFixed(2)}</td>
					<td class="px-4 py-2 text-amber-500" aria-label="{listing.rating} of 5">
						{"★".repeat(listing.rating)}<span class="text-slate-300">{"★".repeat(5 - listing.rating)}</span>
					</td>
					<td class="px-4 py-2 text-slate-600">{listing.inStock ? t.inStock : t.outOfStock}</td>
					<td class="px-4 py-2"><StatusBadge status={listing.status} /></td>
					<td class="px-4 py-2 text-right">
						<button
							type="button"
							class="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
							onclick={() => onReview(listing)}
						>
							{t.review}
						</button>
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">{t.noResults}</td></tr>
			{/each}
		</tbody>
	</table>
</div>
