# PRD — Transfer/Manufacturer/Bulk-Destroy (2026-05-11)

Owner: Elron · Status: Draft · Mode: Karpathy (slice-by-slice, codex-reviewed)

## Problem (in user's words, paraphrased)

Three pains in the reagents Dashboard:

1. **Cross-team transfer** is implemented but invisible/broken in UX — bulk-action bar renders one button per other team, overflows on mobile, no real dialog. User also wants a *pull* variant (request items from another team via a banner in their dashboard).
2. **Manufacturer (יצרן)** lives only on `reagents`, not on `reagent_catalog`. When duplicating a shipment, the manufacturer must be re-typed. It should be persisted on the catalog item (like supplier) and inherited on duplication, while remaining editable.
3. **Bulk delete is broken**:
   - The "destructive" path doesn't actually destroy (no destruction-log entry, possibly silent fail in prod).
   - Layout: extra team-buttons appear next to Archive/Delete and overflow the mobile screen.
   - Bulk delete should open a per-item **quantity** dialog (like single-item destroy), where blank/Enter ⇒ full quantity, otherwise partial qty. Destruction is logged per item.

## Goals

- One clear Transfer dialog (push), plus an inbound pull-request banner mirroring the expiry banner.
- `manufacturer` on catalog schema, inherited by reagents created/duplicated from catalog, still overridable on the reagent itself.
- Bulk "destroy" path that actually writes destruction-log entries with quantities, with a clean per-item modal flow that defaults to full quantity on Enter.
- Mobile-clean bulk-action bar.

## Non-goals

- Approvals/permissions UI for push (push is no-approval, per user).
- Manufacturer free-text autocompletion across teams.
- Reworking destruction-log schema.

## Slices (Karpathy: smallest measurable diff first)

| # | Slice | V (value) | C (cost) | B (blast) | Notes |
|---|---|---|---|---|---|
| **S1** | **Bulk-destroy: per-item quantity dialog + real destruction-log writes** | H — fixes the "doesn't actually delete" complaint and gives proper audit trail | M — reuse `DestructionDialog`, sequential modal flow, API loop | M — touches destruction-log + reagent removal | Replace `handleBulkDelete` → queue modal flow; on confirm call `destroyReagent` per item; on empty/Enter use full qty; clear selection. |
| **S2** | **Bulk-action bar mobile cleanup** — collapse per-team buttons into one `Transfer ▾` button → opens dialog | H — fixes overflow now | S | L | Pure UI: new `TransferReagentsDialog.tsx`. Keeps existing `importReagentsToTeam` API. |
| **S3** | **Manufacturer on catalog schema** — DB migration + API + create/edit forms + duplicate inheritance | M — quality-of-life, addresses repetitive typing | M | M | Directus migration adds `manufacturer` to `reagent_catalog`; catalog routes/types updated; `BulkAddForm` + `CreateCatalogItemDialog` propagate; reagent inherits on creation. |
| **S4** | **Pull-request (inbound transfer)**: dashboard banner like expiry-banner, request flow | M | L | M | New table `transfer_requests {source_team, target_team, item_ids, status}`; endpoints `POST /api/transfers/request`, `POST /api/transfers/:id/approve|deny`; banner component reads pending-requests for current team. |
| **S5** | **Deploy + smoke check** | — | S | M | Build, push to main, deploy, screenshot mobile bulk bar + transfer dialog + destruction flow. |

Each slice ends with: build green, `npm test` for touched files, codex review (`codex review`), one commit, no premature next-slice work.

## Open questions (resolved)

- **Bulk-delete semantics:** destruction-log per item with quantity dialog. *Confirmed 2026-05-11.*
- **Transfer UX:** dedicated dialog button; pull-request banner mirroring expiry banner. *Confirmed 2026-05-11.*

## Out-of-scope reminders

- No refactor of unrelated bulk-action handlers.
- No new abstractions until S3 lands and we see if `manufacturer` repeats elsewhere.
