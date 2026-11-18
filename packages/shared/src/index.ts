import { z } from "zod";

// What the scraper sends in
export const ListingInputSchema = z.object({
	title: z.string().min(1),
	price: z.number().nonnegative(),
	rating: z.number().int().min(1).max(5),
	inStock: z.boolean(),
	url: z.string().url()
});

// What a saved listing looks like (adds database fields)
export const ListingSchema = ListingInputSchema.extend({
	id: z.number().int(),
	status: z.enum(["ok", "flagged", "reviewed"]),
	notes: z.string().nullable(),
	flagReason: z.string().nullable()
});

// What the "flag this listing" request contains
export const FlagUpdateSchema = z.object({
	status: z.enum(["ok", "flagged", "reviewed"]),
	notes: z.string().optional()
});

// TypeScript types generated from the rules, so you never write them twice
export type ListingInput = z.infer<typeof ListingInputSchema>;
export type Listing = z.infer<typeof ListingInputSchema>;
export type FlagUpdate = z.infer<typeof FlagUpdateSchema>;
