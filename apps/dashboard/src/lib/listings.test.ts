import { describe, it, expect } from "vitest";
import type { Listing } from "@listing-watch/shared";
import { applyFlagUpdate, filterListings, paginate, replaceListing, sortListings, viewListings } from "./listings";

const make = (id: number, over: Partial<Listing> = {}): Listing => ({
	id,
	title: `Book ${id}`,
	price: 10 * id,
	rating: 3,
	inStock: true,
	url: `https://books.toscrape.com/catalogue/book-${id}/index.html`,
	status: "ok",
	flagReasons: [],
	notes: null,
	createdAt: "2026-11-19T00:00:00.000Z",
	updatedAt: "2026-11-19T00:00:00.000Z",
	...over
});

const list = [
	make(1, { title: "Sharp Objects", price: 47.82, rating: 4 }),
	make(2, { title: "Tipping the Velvet", price: 13.99, status: "flagged" }),
	make(3, { title: "Soumission", price: 50.1, rating: 1 }),
	make(4, { title: "sapiens", price: 13.99, status: "reviewed" })
];

describe("filterListings", () => {
	it("searches titles case-insensitively", () => {
		expect(filterListings(list, "  SHARP ", false).map((l) => l.id)).toEqual([1]);
	});
	it("can show flagged only", () => {
		expect(filterListings(list, "", true).map((l) => l.id)).toEqual([2]);
	});
	it("combines search and flagged filter", () => {
		expect(filterListings(list, "sharp", true)).toEqual([]);
	});
});

describe("sortListings", () => {
	it("sorts strings with localeCompare (case-insensitive order)", () => {
		expect(sortListings(list, "title", "asc").map((l) => l.title)).toEqual([
			"sapiens",
			"Sharp Objects",
			"Soumission",
			"Tipping the Velvet"
		]);
	});
	it("sorts numbers descending and breaks ties by id", () => {
		expect(sortListings(list, "price", "desc").map((l) => l.id)).toEqual([3, 1, 2, 4]);
	});
	it("does not mutate the input", () => {
		const copy = [...list];
		sortListings(list, "price", "asc");
		expect(list).toEqual(copy);
	});
});

describe("viewListings", () => {
	it("filters then sorts", () => {
		const out = viewListings(list, { search: "s", flaggedOnly: false, sortKey: "rating", sortDir: "asc" });
		// "Tipping the Velvet" has no "s", so it's filtered out; the rest sort by rating 1, 3, 4
		expect(out.map((l) => l.id)).toEqual([3, 4, 1]);
	});
});

describe("paginate", () => {
	const items = Array.from({ length: 120 }, (_, i) => i + 1);
	it("returns the requested page with 1-based from/to", () => {
		expect(paginate(items, 2, 50)).toMatchObject({ page: 2, pageCount: 3, from: 51, to: 100 });
	});
	it("clamps out-of-range pages (e.g. after a filter shrinks the list)", () => {
		expect(paginate(items, 99, 50)).toMatchObject({ page: 3, from: 101, to: 120 });
		expect(paginate([], 5, 50)).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0 });
	});
});

describe("applyFlagUpdate / replaceListing", () => {
	it("changes only the target listing's status and notes", () => {
		const out = applyFlagUpdate(list, 1, { status: "flagged", notes: "odd" });
		expect(out[0]).toMatchObject({ status: "flagged", notes: "odd" });
		expect(out[1]).toBe(list[1]); // untouched rows keep identity
	});
	it("leaves notes alone when not provided", () => {
		const withNote = [make(9, { notes: "keep me" })];
		expect(applyFlagUpdate(withNote, 9, { status: "reviewed" })[0].notes).toBe("keep me");
	});
	it("replaces a listing with the server copy", () => {
		const saved = make(2, { status: "reviewed", updatedAt: "2026-11-20T00:00:00.000Z" });
		expect(replaceListing(list, saved)[1]).toBe(saved);
	});
});
