<script lang="ts">
	import { FlagUpdateSchema, ListingStatusSchema, type FlagUpdate, type Listing, type ListingStatus } from "@listing-watch/shared";
	import { t } from "#lib/strings.ts";

	let {
		listing,
		onSave,
		onClose
	}: {
		listing: Listing;
		onSave: (update: FlagUpdate) => void;
		onClose: () => void;
	} = $props();

	// Form state starts from the listing (the modal is re-created for each listing it opens)
	// svelte-ignore state_referenced_locally
	let status = $state<ListingStatus>(listing.status);
	// svelte-ignore state_referenced_locally
	let notes = $state(listing.notes ?? "");
	let error = $state<string | null>(null);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		// Validate the form with the same shared schema the API uses
		const parsed = FlagUpdateSchema.safeParse({ status, notes });
		if (!parsed.success) {
			error = parsed.error.issues.map((i) => i.message).join(", ");
			return;
		}
		onSave(parsed.data);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") onClose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="fixed inset-0 z-40 bg-slate-900/40" aria-hidden="true" onclick={onClose}></div>
<div
	class="fixed inset-x-4 top-16 z-50 mx-auto max-w-lg rounded-xl bg-white p-6 shadow-xl"
	role="dialog"
	aria-modal="true"
	aria-labelledby="flag-modal-title"
>
	<h2 id="flag-modal-title" class="text-lg font-semibold text-slate-900">{t.modal.title}</h2>
	<p class="mt-1 text-sm text-slate-600">{listing.title} · £{listing.price.toFixed(2)}</p>
	<a href={listing.url} target="_blank" rel="noreferrer" class="text-xs text-blue-600 hover:underline">
		{t.modal.viewOnSite}
	</a>

	<div class="mt-4 rounded-md bg-slate-50 p-3">
		<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.modal.reasons}</h3>
		{#if listing.flagReasons.length > 0}
			<ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
				{#each listing.flagReasons as reason, i (i)}
					<li>{reason}</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-1 text-sm text-slate-500">{t.modal.noReasons}</p>
		{/if}
	</div>

	<form class="mt-4 space-y-4" onsubmit={submit}>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">{t.modal.statusLabel}</span>
			<select
				bind:value={status}
				class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				name="status"
			>
				{#each ListingStatusSchema.options as option (option)}
					<option value={option}>{t.status[option]}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">{t.modal.notesLabel}</span>
			<textarea
				bind:value={notes}
				rows="3"
				name="notes"
				placeholder={t.modal.notesPlaceholder}
				class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			></textarea>
		</label>
		{#if error}<p class="text-sm text-red-600" role="alert">{error}</p>{/if}
		<div class="flex justify-end gap-2">
			<button
				type="button"
				class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
				onclick={onClose}
			>
				{t.modal.cancel}
			</button>
			<button type="submit" class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
				{t.modal.save}
			</button>
		</div>
	</form>
</div>
