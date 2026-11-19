import type { ListingInput } from "@listing-watch/shared";
import { scrapeBooks } from "./scrape";
import { toListingInput } from "./parse";
import { postListings } from "./post";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";

// Fail fast with a clear message if the API isn't running
const health = await fetch(`${API_URL}/health`).catch(() => null);
if (!health?.ok) {
	console.error(`API not reachable at ${API_URL}. Start it with: pnpm --filter api dev`);
	process.exit(1);
}

const raw = await scrapeBooks();

// Clean + validate each card. A bad card is skipped and reported instead of crashing the run.
const listings: ListingInput[] = [];
for (const book of raw) {
	try {
		listings.push(toListingInput(book));
	} catch (err) {
		console.warn(`Skipping "${book.title}": ${err instanceof Error ? err.message : String(err)}`);
	}
}

const result = await postListings(listings, API_URL);
console.log(
	`Done. Scraped ${raw.length}, valid ${listings.length}. ` +
		`Created ${result.created}, updated ${result.updated}, failed ${result.failed}.`
);
if (result.failed > 0) process.exitCode = 1;
