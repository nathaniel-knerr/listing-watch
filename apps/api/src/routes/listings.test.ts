import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ListingSchema, type ListingInput } from "@listing-watch/shared";
import { buildApp } from "../app";
import { sequelize } from "../db";

// fastify.inject() sends fake HTTP requests straight into the app: no real server or port
const app = buildApp({ logger: false });

const book: ListingInput = {
	title: "A Light in the Attic",
	price: 51.77,
	rating: 3,
	inStock: true,
	url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html"
};

beforeEach(async () => {
	await sequelize.sync({ force: true }); // wipe the table between tests
});

afterAll(async () => {
	await app.close();
	await sequelize.close();
});

async function createBook(input: ListingInput = book) {
	const res = await app.inject({ method: "POST", url: "/listings", payload: input });
	return ListingSchema.parse(res.json());
}

describe("POST /listings", () => {
	it("creates a listing that matches the shared schema", async () => {
		const res = await app.inject({ method: "POST", url: "/listings", payload: book });
		expect(res.statusCode).toBe(201);
		const listing = ListingSchema.parse(res.json());
		expect(listing).toMatchObject({ ...book, status: "ok", flagReasons: [], notes: null });
	});

	it("upserts by url and keeps the review status", async () => {
		const first = await createBook();
		await app.inject({
			method: "PATCH",
			url: `/listings/${first.id}/flag`,
			payload: { status: "flagged", notes: "too cheap" }
		});

		const res = await app.inject({
			method: "POST",
			url: "/listings",
			payload: { ...book, price: 10 }
		});
		expect(res.statusCode).toBe(200);
		const updated = ListingSchema.parse(res.json());
		expect(updated.id).toBe(first.id);
		expect(updated.price).toBe(10);
		expect(updated.status).toBe("flagged");
		expect(updated.notes).toBe("too cheap");
	});

	it("rejects invalid input with 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/listings",
			payload: { ...book, rating: 9 }
		});
		expect(res.statusCode).toBe(400);
	});
});

describe("GET /listings", () => {
	it("filters to flagged listings", async () => {
		const a = await createBook();
		await createBook({ ...book, title: "Other", url: "https://books.toscrape.com/other" });
		await app.inject({ method: "PATCH", url: `/listings/${a.id}/flag`, payload: { status: "flagged" } });

		const all = await app.inject({ method: "GET", url: "/listings" });
		const flagged = await app.inject({ method: "GET", url: "/listings?flagged=true" });
		expect(all.json()).toHaveLength(2);
		expect(flagged.json()).toHaveLength(1);
	});

	it("returns 404 for a missing id", async () => {
		const res = await app.inject({ method: "GET", url: "/listings/999" });
		expect(res.statusCode).toBe(404);
	});
});

describe("PATCH /listings/:id/flag", () => {
	it("sets status and notes", async () => {
		const created = await createBook();
		const res = await app.inject({
			method: "PATCH",
			url: `/listings/${created.id}/flag`,
			payload: { status: "reviewed", notes: "looks fine" }
		});
		expect(res.statusCode).toBe(200);
		expect(ListingSchema.parse(res.json())).toMatchObject({ status: "reviewed", notes: "looks fine" });
	});

	it("rejects an unknown status", async () => {
		const created = await createBook();
		const res = await app.inject({
			method: "PATCH",
			url: `/listings/${created.id}/flag`,
			payload: { status: "banned" }
		});
		expect(res.statusCode).toBe(400);
	});
});

describe("POST /listings/recompute-flags", () => {
	const at = (n: number) => `https://books.toscrape.com/catalogue/book-${n}/index.html`;

	it("flags cheap and duplicate listings but leaves 'reviewed' alone", async () => {
		await createBook({ ...book, title: "Fair One", price: 40, url: at(1) });
		await createBook({ ...book, title: "Fair Two", price: 42, url: at(2) });
		const cheap = await createBook({ ...book, title: "Bargain", price: 10, url: at(3) });
		const dupA = await createBook({ ...book, title: "Twin Title", price: 41, url: at(4) });
		const dupB = await createBook({ ...book, title: "Twin Title!", price: 39, url: at(5) });
		await app.inject({ method: "PATCH", url: `/listings/${dupB.id}/flag`, payload: { status: "reviewed" } });

		const res = await app.inject({ method: "POST", url: "/listings/recompute-flags" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ checked: 5, withReasons: 3, changed: 3 });

		const get = async (id: number) =>
			ListingSchema.parse((await app.inject({ method: "GET", url: `/listings/${id}` })).json());
		expect(await get(cheap.id)).toMatchObject({ status: "flagged" });
		expect((await get(cheap.id)).flagReasons[0]).toMatch(/under 50% of the/);
		expect(await get(dupA.id)).toMatchObject({ status: "flagged" });
		const reviewed = await get(dupB.id);
		expect(reviewed.status).toBe("reviewed"); // human decision kept
		expect(reviewed.flagReasons).toHaveLength(1); // but reasons still recorded

		// Running again with no data changes writes nothing
		const again = await app.inject({ method: "POST", url: "/listings/recompute-flags" });
		expect(again.json()).toMatchObject({ changed: 0 });
	});
});

describe("PATCH and DELETE /listings/:id", () => {
	it("returns 409 when changing url to one that is taken", async () => {
		const a = await createBook();
		const b = await createBook({ ...book, url: "https://books.toscrape.com/other" });
		const res = await app.inject({ method: "PATCH", url: `/listings/${b.id}`, payload: { url: a.url } });
		expect(res.statusCode).toBe(409);
	});

	it("deletes a listing", async () => {
		const created = await createBook();
		const del = await app.inject({ method: "DELETE", url: `/listings/${created.id}` });
		expect(del.statusCode).toBe(204);
		const get = await app.inject({ method: "GET", url: `/listings/${created.id}` });
		expect(get.statusCode).toBe(404);
	});
});
