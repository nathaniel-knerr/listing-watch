import { ListingInputSchema, type ListingInput } from "@listing-watch/shared";

// The raw strings pulled off one book card, before any cleanup.
// Kept separate from Puppeteer so the cleanup logic can be tested without a browser.
export interface RawBook {
	title: string;
	priceText: string; // e.g. "£51.77"
	ratingClass: string; // e.g. "star-rating Three"
	availabilityText: string; // e.g. "In stock"
	url: string; // absolute url to the book page
}

const RATING_WORDS: Record<string, number> = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };

// "£51.77" -> 51.77. Strips the currency symbol (and the stray "Â" some encodings add).
export function parsePrice(text: string): number {
	const match = text.match(/\d+(?:\.\d+)?/);
	if (!match) throw new Error(`Could not read a price from "${text}"`);
	return Number(match[0]);
}

// "star-rating Three" -> 3. The site stores the rating as a CSS class word.
export function parseRating(className: string): number {
	const word = className.split(/\s+/).find((part) => part in RATING_WORDS);
	if (!word) throw new Error(`Could not read a rating from "${className}"`);
	return RATING_WORDS[word];
}

// "In stock" / "In stock (22 available)" -> true, anything else -> false
export function parseInStock(text: string): boolean {
	return /in stock/i.test(text);
}

// Turn one raw card into a validated ListingInput (throws if the shared schema rejects it)
export function toListingInput(raw: RawBook): ListingInput {
	return ListingInputSchema.parse({
		title: raw.title.trim(),
		price: parsePrice(raw.priceText),
		rating: parseRating(raw.ratingClass),
		inStock: parseInStock(raw.availabilityText),
		url: raw.url
	});
}
