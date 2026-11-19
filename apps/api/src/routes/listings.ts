import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodType } from "zod";
import {
	ListingInputSchema,
	ListingUpdateSchema,
	FlagUpdateSchema,
	IdParamsSchema,
	ListingQuerySchema
} from "@listing-watch/shared";
import { ListingModel } from "../db";

// Validate `data` with a shared Zod schema. On failure, send a 400 and return null
// so the route can stop. Keeps every route's validation identical.
function parseOr400<T>(schema: ZodType<T>, data: unknown, reply: FastifyReply): T | null {
	const result = schema.safeParse(data);
	if (!result.success) {
		void reply.code(400).send({ error: "Invalid request", issues: result.error.issues });
		return null;
	}
	return result.data;
}

export async function listingRoutes(app: FastifyInstance) {
	// READ all (optionally only flagged ones: /listings?flagged=true)
	app.get("/listings", async (req, reply) => {
		const query = parseOr400(ListingQuerySchema, req.query, reply);
		if (!query) return reply;
		return ListingModel.findAll({
			where: query.flagged === "true" ? { status: "flagged" } : {},
			order: [["id", "ASC"]]
		});
	});

	// READ one
	app.get("/listings/:id", async (req, reply) => {
		const params = parseOr400(IdParamsSchema, req.params, reply);
		if (!params) return reply;
		const listing = await ListingModel.findByPk(params.id);
		if (!listing) return reply.code(404).send({ error: "Listing not found" });
		return listing;
	});

	// CREATE or UPDATE by url (the scraper calls this for every book).
	// Re-scraping refreshes the scraped fields but keeps status, flagReasons and notes,
	// so a human's review isn't wiped out by the next scrape.
	app.post("/listings", async (req, reply) => {
		const input = parseOr400(ListingInputSchema, req.body, reply);
		if (!input) return reply;
		const existing = await ListingModel.findOne({ where: { url: input.url } });
		if (existing) {
			await existing.update(input);
			return reply.code(200).send(existing);
		}
		const created = await ListingModel.create(input);
		return reply.code(201).send(created);
	});

	// UPDATE scraped fields by id
	app.patch("/listings/:id", async (req, reply) => {
		const params = parseOr400(IdParamsSchema, req.params, reply);
		if (!params) return reply;
		const changes = parseOr400(ListingUpdateSchema, req.body, reply);
		if (!changes) return reply;
		const listing = await ListingModel.findByPk(params.id);
		if (!listing) return reply.code(404).send({ error: "Listing not found" });
		if (changes.url && changes.url !== listing.url) {
			const clash = await ListingModel.findOne({ where: { url: changes.url } });
			if (clash) return reply.code(409).send({ error: "Another listing already has that url" });
		}
		await listing.update(changes);
		return listing;
	});

	// FLAG / REVIEW: set status and (optionally) notes
	app.patch("/listings/:id/flag", async (req, reply) => {
		const params = parseOr400(IdParamsSchema, req.params, reply);
		if (!params) return reply;
		const flag = parseOr400(FlagUpdateSchema, req.body, reply);
		if (!flag) return reply;
		const listing = await ListingModel.findByPk(params.id);
		if (!listing) return reply.code(404).send({ error: "Listing not found" });
		await listing.update({
			status: flag.status,
			...(flag.notes !== undefined ? { notes: flag.notes } : {})
		});
		return listing;
	});

	// DELETE
	app.delete("/listings/:id", async (req, reply) => {
		const params = parseOr400(IdParamsSchema, req.params, reply);
		if (!params) return reply;
		const deleted = await ListingModel.destroy({ where: { id: params.id } });
		if (deleted === 0) return reply.code(404).send({ error: "Listing not found" });
		return reply.code(204).send();
	});
}
