import { describe, it, expect, vi } from "vitest";
import type { ListingInput } from "@listing-watch/shared";
import { postListings } from "./post";

const listing = (n: number): ListingInput => ({
	title: `Book ${n}`,
	price: 10,
	rating: 3,
	inStock: true,
	url: `https://books.toscrape.com/catalogue/book-${n}/index.html`
});

describe("postListings", () => {
	it("counts created, updated and failed responses", async () => {
		const statuses = [201, 200, 400];
		const fakeFetch = vi.fn(async () => new Response("{}", { status: statuses.shift() }));
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await postListings([listing(1), listing(2), listing(3)], "http://api", fakeFetch);

		expect(result).toEqual({ created: 1, updated: 1, failed: 1 });
		expect(fakeFetch).toHaveBeenCalledTimes(3);
		expect(fakeFetch).toHaveBeenCalledWith(
			"http://api/listings",
			expect.objectContaining({ method: "POST", body: JSON.stringify(listing(1)) })
		);
	});
});
