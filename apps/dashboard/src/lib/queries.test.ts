import { describe, it, expect, vi } from "vitest";
import { MutationObserver, QueryClient } from "@tanstack/svelte-query";
import type { FlagUpdate, Listing } from "@listing-watch/shared";
import { flagMutationOptions, listingsKey, type FlagContext, type FlagVariables } from "./queries";

const listing: Listing = {
	id: 1,
	title: "Sharp Objects",
	price: 47.82,
	rating: 4,
	inStock: true,
	url: "https://books.toscrape.com/catalogue/sharp-objects_997/index.html",
	status: "ok",
	flagReasons: [],
	notes: null,
	createdAt: "2026-11-19T00:00:00.000Z",
	updatedAt: "2026-11-19T00:00:00.000Z"
};

// A promise we resolve/reject by hand, so the test can look at the cache WHILE the save is pending
function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: Error) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function setup() {
	const queryClient = new QueryClient();
	queryClient.setQueryData(listingsKey, [listing]);
	const pending = deferred<Listing>();
	const save = vi.fn((_id: number, _update: FlagUpdate) => pending.promise);
	const onRollback = vi.fn();
	const observer = new MutationObserver<Listing, Error, FlagVariables, FlagContext>(
		queryClient,
		flagMutationOptions(queryClient, onRollback, save)
	);
	const cached = () => queryClient.getQueryData<Listing[]>(listingsKey)?.[0];
	return { observer, pending, save, onRollback, cached };
}

const variables: FlagVariables = { listing, update: { status: "flagged", notes: "too cheap" } };

describe("flag mutation (optimistic update)", () => {
	it("updates the cache before the server answers, then keeps the server copy", async () => {
		const { observer, pending, save, onRollback, cached } = setup();
		const done = observer.mutate(variables);

		await vi.waitFor(() => expect(save).toHaveBeenCalledWith(1, variables.update));
		expect(cached()).toMatchObject({ status: "flagged", notes: "too cheap" }); // optimistic

		const server = { ...listing, status: "flagged" as const, notes: "too cheap", updatedAt: "2026-11-20T00:00:00.000Z" };
		pending.resolve(server);
		await done;
		expect(cached()).toEqual(server);
		expect(onRollback).not.toHaveBeenCalled();
	});

	it("rolls back to the old data when the save fails", async () => {
		const { observer, pending, save, onRollback, cached } = setup();
		const done = observer.mutate(variables).catch(() => undefined);

		await vi.waitFor(() => expect(save).toHaveBeenCalled());
		expect(cached()?.status).toBe("flagged"); // optimistic

		pending.reject(new Error("500"));
		await done;
		expect(cached()).toEqual(listing); // rolled back
		expect(onRollback).toHaveBeenCalledWith(listing);
	});
});
