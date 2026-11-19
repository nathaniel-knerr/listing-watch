import { createMutation, createQuery, useQueryClient, type QueryClient } from "@tanstack/svelte-query";
import type { FlagUpdate, Listing } from "@listing-watch/shared";
import { fetchListings, flagListing } from "./api";
import { applyFlagUpdate, replaceListing } from "./listings";

export const listingsKey = ["listings"] as const;

export function createListingsQuery() {
	return createQuery(() => ({ queryKey: listingsKey, queryFn: fetchListings }));
}

export interface FlagVariables {
	listing: Listing;
	update: FlagUpdate;
}

// What onMutate returns and onError receives: the list before the optimistic change
export interface FlagContext {
	previous?: Listing[];
}

/**
 * Options for the flag mutation, with an OPTIMISTIC update:
 * 1. onMutate: change the cached list right away so the table updates instantly,
 *    remembering the old list.
 * 2. onError: put the old list back (rollback) and tell the page.
 * 3. onSuccess: swap in the server's copy (it has the new updatedAt).
 *
 * Kept as a plain function (not tied to a component) so it can be tested with a real QueryClient.
 * `save` defaults to the real API call; tests pass a fake.
 */
export function flagMutationOptions(
	queryClient: QueryClient,
	onRollback: (listing: Listing) => void,
	save: (id: number, update: FlagUpdate) => Promise<Listing> = flagListing
) {
	return {
		mutationFn: ({ listing, update }: FlagVariables) => save(listing.id, update),

		onMutate: async ({ listing, update }: FlagVariables): Promise<FlagContext> => {
			// Stop any in-flight refetch from overwriting our optimistic change
			await queryClient.cancelQueries({ queryKey: listingsKey });
			const previous = queryClient.getQueryData<Listing[]>(listingsKey);
			if (previous) {
				queryClient.setQueryData<Listing[]>(listingsKey, applyFlagUpdate(previous, listing.id, update));
			}
			return { previous };
		},

		onError: (_err: Error, { listing }: FlagVariables, snapshot: FlagContext | undefined) => {
			if (snapshot?.previous) queryClient.setQueryData(listingsKey, snapshot.previous);
			onRollback(listing);
		},

		onSuccess: (saved: Listing) => {
			queryClient.setQueryData<Listing[]>(listingsKey, (old) => (old ? replaceListing(old, saved) : old));
		}
	};
}

export function createFlagMutation(onRollback: (listing: Listing) => void) {
	const queryClient = useQueryClient();
	return createMutation(() => flagMutationOptions(queryClient, onRollback));
}
