import type { Listing, ListingStatus } from "@listing-watch/shared";

// Pure flagging rules: no database, no HTTP. Give them listings, get reasons back.
// Thresholds were picked by measuring the real 1,000 books (see AI_LOG.md / README).

/** Flag a book priced under this fraction of the median price for its star rating. */
export const PRICE_THRESHOLD = 0.5; // 158 of 1,000 books on books.toscrape.com
/** Flag two titles at least this similar (0–1) after normalizing, if their numbers match. */
export const TITLE_SIMILARITY_THRESHOLD = 0.9; // 2 real duplicate pairs, 0 series false positives

export type FlaggableListing = Pick<Listing, "id" | "title" | "price" | "rating">;

export function median(values: number[]): number {
	if (values.length === 0) throw new Error("median of empty list");
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * "Can You Keep a Secret? (Fear Street Relaunch #4)" -> "can you keep a secret"
 * Lowercase, drop series info in parentheses, turn punctuation into spaces, collapse spaces.
 */
export function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/\([^)]*\)/g, " ")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

// Classic edit distance: fewest single-character inserts/deletes/swaps to turn a into b
function levenshtein(a: string, b: string): number {
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const curr = [i];
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
		}
		prev = curr;
	}
	return prev[b.length];
}

/** 1 = identical, 0 = nothing in common. Compares already-normalized strings. */
export function titleSimilarity(a: string, b: string): number {
	const longest = Math.max(a.length, b.length);
	if (longest === 0) return 1;
	return 1 - levenshtein(a, b) / longest;
}

// The numbers in a title ("vol 6" -> "6"). Different numbers = different volume, not a copy.
function numbersIn(normalized: string): string {
	return (normalized.match(/\d+/g) ?? []).join(",");
}

/** Reason per listing id for books priced well below the median of their star rating. */
export function findCheapListings(
	listings: FlaggableListing[],
	threshold = PRICE_THRESHOLD
): Map<number, string> {
	const pricesByRating = new Map<number, number[]>();
	for (const l of listings) {
		pricesByRating.set(l.rating, [...(pricesByRating.get(l.rating) ?? []), l.price]);
	}
	const reasons = new Map<number, string>();
	for (const l of listings) {
		const med = median(pricesByRating.get(l.rating) ?? [l.price]);
		if (l.price < threshold * med) {
			reasons.set(
				l.id,
				`Price £${l.price.toFixed(2)} is under ${threshold * 100}% of the £${med.toFixed(2)} median for ${l.rating}-star books`
			);
		}
	}
	return reasons;
}

/** Reasons per listing id for titles that are near-copies of another listing's title. */
export function findDuplicateTitles(
	listings: FlaggableListing[],
	threshold = TITLE_SIMILARITY_THRESHOLD
): Map<number, string[]> {
	// Copy fields explicitly (not `...l`): Sequelize rows expose id/title through getters,
	// which object spread does not copy.
	const prepared = listings.map((l) => {
		const norm = normalizeTitle(l.title);
		return { id: l.id, title: l.title, norm, nums: numbersIn(norm) };
	});
	const reasons = new Map<number, string[]>();
	const add = (id: number, reason: string) => reasons.set(id, [...(reasons.get(id) ?? []), reason]);

	for (let i = 0; i < prepared.length; i++) {
		for (let j = i + 1; j < prepared.length; j++) {
			const a = prepared[i];
			const b = prepared[j];
			if (a.nums !== b.nums) continue;
			// Cheap shortcut: if the lengths differ too much, similarity can't reach the threshold
			const longest = Math.max(a.norm.length, b.norm.length);
			if (longest > 0 && Math.abs(a.norm.length - b.norm.length) / longest > 1 - threshold) continue;
			const sim = titleSimilarity(a.norm, b.norm);
			if (sim >= threshold) {
				const pct = Math.round(sim * 100);
				add(a.id, `Title is ${pct}% similar to #${b.id} "${b.title}"`);
				add(b.id, `Title is ${pct}% similar to #${a.id} "${a.title}"`);
			}
		}
	}
	return reasons;
}

/** Run every rule. Every listing gets an entry (empty array = nothing suspicious). */
export function computeFlagReasons(listings: FlaggableListing[]): Map<number, string[]> {
	const cheap = findCheapListings(listings);
	const dupes = findDuplicateTitles(listings);
	const all = new Map<number, string[]>();
	for (const l of listings) {
		const reasons = [...(dupes.get(l.id) ?? [])];
		const cheapReason = cheap.get(l.id);
		if (cheapReason) reasons.unshift(cheapReason);
		all.set(l.id, reasons);
	}
	return all;
}

/**
 * What status a listing should have after the rules run:
 * - "reviewed" is a human decision and is never changed.
 * - "ok" with reasons becomes "flagged".
 * - "flagged" that HAD rule reasons but now has none goes back to "ok".
 *   (A listing a human flagged with no rule reasons stays flagged.)
 */
export function nextStatus(
	current: ListingStatus,
	previousReasons: string[],
	newReasons: string[]
): ListingStatus {
	if (current === "reviewed") return "reviewed";
	if (newReasons.length > 0) return "flagged";
	if (current === "flagged" && previousReasons.length > 0) return "ok";
	return current;
}
