import { RecomputeResultSchema, type ListingInput, type RecomputeResult } from "@listing-watch/shared";

export interface PostResult {
	created: number;
	updated: number;
	failed: number;
}

// Send each listing to POST /listings. The API upserts by url:
// 201 = new listing, 200 = existing one refreshed.
// `fetchFn` is a parameter so tests can pass a fake instead of hitting a real server.
export async function postListings(
	listings: ListingInput[],
	apiUrl: string,
	fetchFn: typeof fetch = fetch
): Promise<PostResult> {
	const result: PostResult = { created: 0, updated: 0, failed: 0 };
	for (const listing of listings) {
		const res = await fetchFn(`${apiUrl}/listings`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(listing)
		});
		if (res.status === 201) result.created++;
		else if (res.status === 200) result.updated++;
		else {
			result.failed++;
			console.warn(`POST failed (${res.status}) for ${listing.url}: ${await res.text()}`);
		}
	}
	return result;
}

// Ask the API to re-run the flag rules across all listings (call once, after posting)
export async function recomputeFlags(
	apiUrl: string,
	fetchFn: typeof fetch = fetch
): Promise<RecomputeResult> {
	const res = await fetchFn(`${apiUrl}/listings/recompute-flags`, { method: "POST" });
	if (!res.ok) throw new Error(`recompute-flags failed (${res.status}): ${await res.text()}`);
	return RecomputeResultSchema.parse(await res.json());
}
