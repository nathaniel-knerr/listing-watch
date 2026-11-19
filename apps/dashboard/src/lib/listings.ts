import type { FlagUpdate, Listing } from "@listing-watch/shared";

// Pure helpers for the table. No Svelte, no fetch, so they're easy to unit test.

export type SortKey = "title" | "price" | "rating" | "inStock" | "status";
export type SortDir = "asc" | "desc";

export interface ViewOptions {
	search: string;
	flaggedOnly: boolean;
	sortKey: SortKey;
	sortDir: SortDir;
}

export function filterListings(listings: Listing[], search: string, flaggedOnly: boolean): Listing[] {
	const needle = search.trim().toLowerCase();
	return listings.filter(
		(l) =>
			(!flaggedOnly || l.status === "flagged") &&
			(needle === "" || l.title.toLowerCase().includes(needle))
	);
}

export function sortListings(listings: Listing[], key: SortKey, dir: SortDir): Listing[] {
	const sign = dir === "asc" ? 1 : -1;
	return [...listings].sort((a, b) => {
		const av = a[key];
		const bv = b[key];
		let cmp: number;
		if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
		else cmp = Number(av) - Number(bv);
		return cmp * sign || a.id - b.id; // tie-break on id so order is stable
	});
}

export function viewListings(listings: Listing[], opts: ViewOptions): Listing[] {
	return sortListings(filterListings(listings, opts.search, opts.flaggedOnly), opts.sortKey, opts.sortDir);
}

export interface Page<T> {
	items: T[];
	page: number; // 1-based, clamped to the valid range
	pageCount: number;
	from: number; // 1-based index of first item shown (0 if empty)
	to: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
	const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
	const current = Math.min(Math.max(1, page), pageCount);
	const start = (current - 1) * pageSize;
	const slice = items.slice(start, start + pageSize);
	return {
		items: slice,
		page: current,
		pageCount,
		from: slice.length ? start + 1 : 0,
		to: start + slice.length
	};
}

/** The cache after a flag change, before the server answers (used for the optimistic update). */
export function applyFlagUpdate(listings: Listing[], id: number, update: FlagUpdate): Listing[] {
	return listings.map((l) =>
		l.id === id
			? { ...l, status: update.status, ...(update.notes !== undefined ? { notes: update.notes } : {}) }
			: l
	);
}

/** Swap in the server's version of one listing after a successful save. */
export function replaceListing(listings: Listing[], updated: Listing): Listing[] {
	return listings.map((l) => (l.id === updated.id ? updated : l));
}
