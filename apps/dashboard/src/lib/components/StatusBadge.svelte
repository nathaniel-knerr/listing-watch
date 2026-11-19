<script lang="ts">
	import type { ListingStatus } from "@listing-watch/shared";
	import { t } from "#lib/strings.ts";

	let { status }: { status: ListingStatus } = $props();

	const styles: Record<ListingStatus, string> = {
		ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
		flagged: "bg-red-50 text-red-700 ring-red-600/20",
		reviewed: "bg-slate-100 text-slate-700 ring-slate-500/20"
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset {styles[status]}"
	data-testid="status-badge"
>
	{t.status[status]}
</span>
