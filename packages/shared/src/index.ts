import { z } from "zod";

// The three states a listing can be in
export const ListingStatusSchema = z.enum(["ok", "flagged", "reviewed"]);

// What the scraper sends in
export const ListingInputSchema = z.object({
	title: z.string().min(1),
	price: z.number().nonnegative(),
	rating: z.number().int().min(1).max(5),
	inStock: z.boolean(),
	url: z.string().url()
});

// What a saved listing looks like (adds database fields).
// Dates arrive as ISO strings because they travel as JSON.
export const ListingSchema = ListingInputSchema.extend({
	id: z.number().int(),
	status: ListingStatusSchema,
	flagReasons: z.array(z.string()),
	notes: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string()
});

// Partial edit of the scraped fields (PATCH /listings/:id)
export const ListingUpdateSchema = ListingInputSchema.partial();

// What the "flag this listing" request contains (PATCH /listings/:id/flag)
export const FlagUpdateSchema = z.object({
	status: ListingStatusSchema,
	notes: z.string().optional()
});

// Route params like /listings/:id. Coerce because URL params are always strings.
export const IdParamsSchema = z.object({
	id: z.coerce.number().int().positive()
});

// Query string for GET /listings?flagged=true
export const ListingQuerySchema = z.object({
	flagged: z.enum(["true", "false"]).optional()
});

// Response of POST /listings/recompute-flags
export const RecomputeResultSchema = z.object({
	checked: z.number().int(),
	withReasons: z.number().int(),
	changed: z.number().int()
});

// TypeScript types generated from the rules, so you never write them twice
export type ListingStatus = z.infer<typeof ListingStatusSchema>;
export type ListingInput = z.infer<typeof ListingInputSchema>;
export type Listing = z.infer<typeof ListingSchema>;
export type ListingUpdate = z.infer<typeof ListingUpdateSchema>;
export type FlagUpdate = z.infer<typeof FlagUpdateSchema>;
export type RecomputeResult = z.infer<typeof RecomputeResultSchema>;
