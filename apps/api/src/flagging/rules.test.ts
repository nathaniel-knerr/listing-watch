import { describe, it, expect } from "vitest";
import {
	median,
	normalizeTitle,
	titleSimilarity,
	findCheapListings,
	findDuplicateTitles,
	computeFlagReasons,
	nextStatus,
	type FlaggableListing
} from "./rules";

let nextId = 1;
const book = (title: string, price = 30, rating = 3): FlaggableListing => ({
	id: nextId++,
	title,
	price,
	rating
});

describe("median", () => {
	it("handles odd and even counts", () => {
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 3, 2])).toBe(2.5);
	});
});

describe("normalizeTitle", () => {
	it("lowercases, drops series info in parentheses and punctuation", () => {
		expect(normalizeTitle("Can You Keep a Secret? (Fear Street Relaunch #4)")).toBe("can you keep a secret");
		expect(normalizeTitle("The Star-Touched Queen")).toBe("the star touched queen");
	});
});

describe("titleSimilarity", () => {
	it("is 1 for identical and lower for different strings", () => {
		expect(titleSimilarity("abc", "abc")).toBe(1);
		expect(titleSimilarity("abcd", "abcx")).toBe(0.75);
	});
});

describe("findCheapListings (under 50% of median for the same rating)", () => {
	it("flags only books well below their own rating's median", () => {
		const fair = [book("A", 40, 3), book("B", 42, 3), book("C", 38, 3)];
		const cheap = book("Cheap", 15, 3); // median of 3-star = 39 -> 15 < 19.5
		const borderline = book("Border", 20, 3); // 20 >= 19.5 -> not flagged
		const otherRating = book("Other", 15, 5); // only 5-star book, its own median -> not flagged
		const reasons = findCheapListings([...fair, cheap, borderline, otherRating]);
		expect([...reasons.keys()]).toEqual([cheap.id]);
		expect(reasons.get(cheap.id)).toMatch(/under 50% of the £\d+\.\d\d median for 3-star books/);
	});
});

describe("findDuplicateTitles (>= 90% similar, numbers must match)", () => {
	it("flags exact and near-exact copies, both ways", () => {
		const a = book("The Star-Touched Queen");
		const b = book("The Star Touched Queen!");
		const reasons = findDuplicateTitles([a, b, book("Something Else Entirely")]);
		expect(reasons.get(a.id)?.[0]).toContain(`#${b.id}`);
		expect(reasons.get(b.id)?.[0]).toContain(`#${a.id}`);
		expect(reasons.size).toBe(2);
	});

	it("ignores series info in parentheses", () => {
		const a = book("Can You Keep a Secret? (Fear Street Relaunch #4)");
		const b = book("Can You Keep a Secret?");
		expect(findDuplicateTitles([a, b]).size).toBe(2);
	});

	it("does NOT flag different volumes of a series", () => {
		const v6 = book("Fruits Basket, Vol. 6 (Fruits Basket #6)");
		const v7 = book("Fruits Basket, Vol. 7 (Fruits Basket #7)");
		expect(findDuplicateTitles([v6, v7]).size).toBe(0);
	});

	it("works with objects whose fields are getters (like Sequelize rows)", () => {
		class Row {
			constructor(private data: FlaggableListing) {}
			get id() { return this.data.id; }
			get title() { return this.data.title; }
			get price() { return this.data.price; }
			get rating() { return this.data.rating; }
		}
		const a = new Row(book("Twin Title"));
		const b = new Row(book("Twin Title"));
		expect([...findDuplicateTitles([a, b]).keys()]).toEqual([a.id, b.id]);
	});

	it("does NOT flag merely similar titles below 90%", () => {
		expect(findDuplicateTitles([book("The Kite Runner"), book("The Maze Runner")]).size).toBe(0);
	});
});

describe("computeFlagReasons", () => {
	it("returns an entry for every listing and combines rules", () => {
		const others = [book("A", 40), book("B", 40), book("C", 40)];
		const dupCheap = book("Same Title", 10);
		const dup = book("Same Title", 40);
		const reasons = computeFlagReasons([...others, dupCheap, dup]);
		expect(reasons.size).toBe(5);
		expect(reasons.get(others[0].id)).toEqual([]);
		expect(reasons.get(dupCheap.id)).toHaveLength(2); // cheap + duplicate
		expect(reasons.get(dup.id)).toHaveLength(1);
	});
});

describe("nextStatus", () => {
	it("never overrides a human 'reviewed'", () => {
		expect(nextStatus("reviewed", [], ["cheap"])).toBe("reviewed");
	});
	it("flags an ok listing that now has reasons", () => {
		expect(nextStatus("ok", [], ["cheap"])).toBe("flagged");
	});
	it("un-flags a rule-flagged listing whose reasons went away", () => {
		expect(nextStatus("flagged", ["cheap"], [])).toBe("ok");
	});
	it("keeps a manual flag (no previous rule reasons)", () => {
		expect(nextStatus("flagged", [], [])).toBe("flagged");
	});
});
