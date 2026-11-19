import puppeteer from "puppeteer";
import type { RawBook } from "./parse";

// CLAUDE.md: this is the ONLY site the scraper may visit
export const ALLOWED_HOST = "books.toscrape.com";
export const START_URL = "https://books.toscrape.com/catalogue/page-1.html";

// Visit every catalogue page (following the "next" link) and collect the raw book cards.
// All the fields we need are on the list pages, so we never open individual book pages.
export async function scrapeBooks(startUrl: string = START_URL): Promise<RawBook[]> {
	const browser = await puppeteer.launch();
	try {
		const page = await browser.newPage();
		const books: RawBook[] = [];
		let nextUrl: string | null = startUrl;

		while (nextUrl) {
			if (new URL(nextUrl).host !== ALLOWED_HOST) {
				throw new Error(`Refusing to scrape outside ${ALLOWED_HOST}: ${nextUrl}`);
			}
			await page.goto(nextUrl, { waitUntil: "domcontentloaded" });

			// This callback runs INSIDE the browser page, so it can use the DOM directly.
			const pageBooks = await page.$$eval("article.product_pod", (cards) =>
				cards.map((card) => {
					const link = card.querySelector<HTMLAnchorElement>("h3 a");
					return {
						title: link?.getAttribute("title") ?? "",
						url: link?.href ?? "", // .href is already absolute
						priceText: card.querySelector(".price_color")?.textContent ?? "",
						ratingClass: card.querySelector(".star-rating")?.className ?? "",
						availabilityText: card.querySelector(".availability")?.textContent ?? ""
					};
				})
			);
			books.push(...pageBooks);

			nextUrl = await page
				.$eval("li.next a", (a) => (a as HTMLAnchorElement).href)
				.catch(() => null); // no "next" link means this was the last page
			console.log(`Scraped ${books.length} books so far`);
		}
		return books;
	} finally {
		await browser.close();
	}
}
