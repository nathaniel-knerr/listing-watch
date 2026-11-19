import { PUBLIC_API_URL } from "$app/env/public";
import { ListingSchema, type FlagUpdate, type Listing } from "@listing-watch/shared";

export const API_URL = PUBLIC_API_URL;

const ListingListSchema = ListingSchema.array();

// Every response is parsed with the shared Zod schema, so if the API ever sends
// something unexpected the dashboard fails loudly instead of rendering garbage.
async function request(path: string, init?: RequestInit): Promise<unknown> {
	const res = await fetch(`${API_URL}${path}`, init);
	if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed with ${res.status}`);
	return res.json();
}

export async function fetchListings(): Promise<Listing[]> {
	return ListingListSchema.parse(await request("/listings"));
}

export async function flagListing(id: number, update: FlagUpdate): Promise<Listing> {
	return ListingSchema.parse(
		await request(`/listings/${id}/flag`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(update)
		})
	);
}
