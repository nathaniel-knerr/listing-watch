// Every user-facing string lives here so adding i18n later means swapping one object.
export const t = {
	appTitle: "ListingWatch",
	appSubtitle: "Book listings scraped from books.toscrape.com",
	searchPlaceholder: "Search titles…",
	searchLabel: "Search listings",
	flaggedOnly: "Flagged only",
	loading: "Loading listings…",
	loadError: "Could not load listings. Is the API running on",
	retry: "Retry",
	noResults: "No listings match.",
	showing: (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
	prev: "Previous",
	next: "Next",
	page: (n: number, of: number) => `Page ${n} of ${of}`,
	columns: {
		title: "Title",
		price: "Price",
		rating: "Rating",
		inStock: "Stock",
		status: "Status",
		actions: ""
	},
	inStock: "In stock",
	outOfStock: "Out of stock",
	review: "Review",
	status: { ok: "OK", flagged: "Flagged", reviewed: "Reviewed" },
	modal: {
		title: "Review listing",
		reasons: "Why the rules flagged it",
		noReasons: "No flag rules matched this listing.",
		statusLabel: "Status",
		notesLabel: "Notes",
		notesPlaceholder: "Optional note for the next reviewer",
		cancel: "Cancel",
		save: "Save",
		viewOnSite: "View on books.toscrape.com"
	},
	saveError: (title: string) => `Couldn't save "${title}". The change was undone.`,
	dismiss: "Dismiss"
} as const;
