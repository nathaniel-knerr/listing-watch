import { describe, it, expect } from "vitest";
import { parsePrice, parseRating, parseInStock, toListingInput, type RawBook } from "./parse";

// Copied from the real markup on books.toscrape.com/catalogue/page-1.html
const card: RawBook = {
	title: "A Light in the Attic",
	priceText: "£51.77",
	ratingClass: "star-rating Three",
	availabilityText: "\n    \n        In stock\n    \n",
	url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html"
};

describe("parsePrice", () => {
	it("strips the currency symbol", () => {
		expect(parsePrice("£51.77")).toBe(51.77);
	});
	it("handles the mis-encoded pound sign", () => {
		expect(parsePrice("Â£10.00")).toBe(10);
	});
	it("throws when there is no number", () => {
		expect(() => parsePrice("free")).toThrow();
	});
});

describe("parseRating", () => {
	it("reads the rating word from the class list", () => {
		expect(parseRating("star-rating One")).toBe(1);
		expect(parseRating("star-rating Five")).toBe(5);
	});
	it("throws on an unknown rating", () => {
		expect(() => parseRating("star-rating")).toThrow();
	});
});

describe("parseInStock", () => {
	it("detects in-stock text with whitespace around it", () => {
		expect(parseInStock(card.availabilityText)).toBe(true);
		expect(parseInStock("In stock (22 available)")).toBe(true);
	});
	it("treats anything else as out of stock", () => {
		expect(parseInStock("Out of stock")).toBe(false);
	});
});

describe("toListingInput", () => {
	it("builds a valid listing from a raw card", () => {
		expect(toListingInput(card)).toEqual({
			title: "A Light in the Attic",
			price: 51.77,
			rating: 3,
			inStock: true,
			url: card.url
		});
	});
	it("rejects a card with no title (shared schema)", () => {
		expect(() => toListingInput({ ...card, title: "  " })).toThrow();
	});
});
