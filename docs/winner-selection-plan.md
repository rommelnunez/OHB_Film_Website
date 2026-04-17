# Winner selection & fulfillment — implementation plan

Admin picks winners in the portal → the selected entrant replies with tickets + showtime preferences → the campaign's fulfiller (tn@wgpictures.com by default) is notified and buys/sends the tickets manually → fulfiller marks fulfilled.

This doc is the single source of truth for the feature. Scope, schema, routes, UI, email, env, and rollout order are all here. Questions still open are called out under **Open decisions**.

---

## 1. User-facing outcome

### As the admin
1. Open `/admin`, pick a campaign, open its entries table.
2. See a high-fidelity row per entry with status badge and expand-for-detail.
3. Click **Select as Winner** on one or more rows. Confirm.
4. Row flips to `Winner` and a selection email is sent to the entrant. (No fulfillment email goes out yet — that waits for the entrant's reply, see step 5.)
5. When the entrant replies (via the reply page), see their ticket count + acceptable showtimes inline on the row. At the same moment, a fulfillment notification is sent to the campaign's fulfiller (tn@wgpictures.com by default), CC'd to contact@wgpictures.com.
6. Later, the fulfiller marks the row **Fulfilled** after buying and sending tickets.

### As the entrant (winner)
1. Receive an email: copy varies by campaign type. Raffle: "You've been selected." Giveaway: "Your tickets are ready to claim." Either way: reply with how many tickets you'd like and which showtimes work.
2. Click the button → lands on `/freetickets/reply/{token}`.
3. Pick ticket count (1–4) + **multiple** acceptable showtimes (checkboxes).
4. Submit. See a thank-you page.
5. Receive tickets directly from the fulfiller as a screenshot / receipt, outside this system.

### As the fulfiller (default tn@wgpictures.com; per-campaign override possible)
1. Receive a fulfillment notification email as soon as the entrant replies, containing everything needed: entrant contact info, ticket count, the list of acceptable showtimes, and direct buy links for each. contact@wgpictures.com is always CC'd.
2. Buy tickets at one of the accepted showtimes.
3. Email the entrant the screenshot/receipt directly (outside this system; replying to the fulfillment email works — Reply-To is set to the entrant).
4. Log into `/admin`, find the row, click **Mark fulfilled**, select which showtime was booked, optionally add notes.

---

## 2. Data model

Single migration: `supabase/migrations/003_winner_selection.sql`.

Add to `campaigns`:

| Column | Type | Notes |
|---|---|---|
| `fulfillment_email` | `text` nullable | Per-campaign override for where fulfillment notifications go. Falls back to `FULFILLMENT_EMAIL` env var. |

Add to `entries`:

| Column | Type | Notes |
|---|---|---|
| `status` | `varchar(20) not null default 'pending'` | `pending` / `winner` / `fulfilled` / `declined` |
| `selected_at` | `timestamptz` | Set when admin clicks Select as Winner |
| `reply_token` | `uuid` (unique, nullable) | Generated at selection. Scoped to the entry row. |
| `requested_tickets` | `integer` | Filled by the entrant's reply; 1–4 |
| `requested_showtimes` | `jsonb` | Array of `{ theater, date, time, ticketLink }` objects. Snapshot at reply time so later showtime edits don't corrupt history. |
| `replied_at` | `timestamptz` | Single-use guard: reject if already set |
| `booked_showtime` | `jsonb` | Same shape as a single `requested_showtimes` entry; set by tn at Mark fulfilled |
| `fulfilled_at` | `timestamptz` | Set by tn at Mark fulfilled |
| `notes` | `text` | Admin scratchpad |

Indexes:
- `idx_entries_status` on `status`
- `idx_entries_reply_token` on `reply_token` (unique)

**Why `jsonb` for showtimes rather than a foreign key table:** showtimes live in `public/showtimes.csv` / `SHOWTIMES_DATA`, not in Postgres. Snapshotting the chosen rows as JSON keeps the flow simple and immutable even if the CSV changes later.

RLS: the service role already has full access via existing policies. No new policies needed.

---

## 3. API routes

### Admin (Bearer-password gated, same as existing admin routes)

- `PATCH /api/admin/entries/[id]/select`
  - No-op if `status === 'winner'` already.
  - Generates `reply_token = gen_random_uuid()`, sets `status = 'winner'`, `selected_at = now()`.
  - Fires `sendWinnerSelectionEmail(entry)` → entrant.
  - Does **not** email tn@ yet — that fires at reply time (see §5), because tn has nothing to act on without count + showtime.
  - Returns the full updated entry row.

- `PATCH /api/admin/entries/[id]/status`
  - Generic status override: `winner` / `fulfilled` / `declined` / `pending`.
  - For `fulfilled`: requires a `booked_showtime` field in the body. Sets `fulfilled_at = now()`.
  - For `pending` (undo): clears `selected_at`, keeps `reply_token` so a stray email click still works.

- `POST /api/admin/entries/[id]/resend-email`
  - Re-sends the selection email to the entrant using the existing token.
  - Separate endpoint so we can rate-limit it independently.

- The existing `GET /api/admin/campaigns/[id]` already returns the campaign + its full entry rows, so it will automatically surface the new columns after the migration — no new endpoint needed. The admin page will just refetch it when it needs to refresh the table.

### Public

- `GET /api/entry-reply/[token]`
  - Server-side lookup by `reply_token`.
  - Returns entrant's first name, city, `campaign_type`, and a **filtered** showtime list for that city (see §4.5), sourced from `public/showtimes.csv` at request time.
  - Returns 410 Gone if `replied_at` is set, 404 if token not found or `status !== 'winner'`.

- `POST /api/entry-reply`
  - Body: `{ token, requestedTickets: 1..4, requestedShowtimes: [{ theater, date, time, ticketLink }, ...] }`.
  - Zod-validated. Writes `requested_tickets`, `requested_showtimes`, `replied_at`.
  - Atomic guard: update `... where reply_token = $1 and replied_at is null` — if rowcount is 0, reject (already replied).
  - Returns `{ success: true }`.
  - Rate-limit with the existing `checkRateLimit(ip)`.

---

## 4. Pages

### `/admin` — campaign entries table

Replaces the current simple table in the campaign detail modal.

**Summary bar:**
```
47 total · 10 winners · 7 fulfilled · 30 pending
```

**Filter chips:** `All · Pending · Winners · Fulfilled · Declined`

**Search box:** client-side filter by name / email / city.

**Columns:**
- Status badge — color-coded: `Pending` (gray), `Winner` (orange), `Fulfilled` (green), `Declined` (dimmed)
- Name
- Email
- Phone
- City
- Submitted at
- Actions

**Row expand (click ▸ or the row):** reveals
- Age confirmed (Y/N), IP, user agent
- Sheet sync status + timestamp
- Reply token (monospace, with Copy button) and direct reply URL
- If replied: `Requested tickets`, `Requested showtimes` (as chips)
- If fulfilled: `Booked showtime`, `Fulfilled at`, `Notes`
- Admin notes textarea (auto-saves — see "Notes autosave" below)

**Action buttons per row (context-aware):**
- `Pending` → **Select as Winner** (primary)
- `Winner` → **Resend email** · **Copy reply link** · **Invalidate link** (rotates `reply_token`; useful if the link was shared wrongly) · **Mark fulfilled** · **Undo** (back to Pending)
- `Fulfilled` → **View details** (read-only) · **Unmark** (rare; for corrections)

Labels branch on `campaign_type`: for giveaways the button reads **Select as Recipient** and the status badge reads `Recipient`; for raffles it reads **Select as Winner** / `Winner`. Underlying DB value is always `winner` for consistency.

**Mark fulfilled form** (small inline form in the row, not a modal):
- "Which showtime did you book?" — dropdown of the entrant's `requested_showtimes`
  - If you pick "Other / manual entry", two fields appear: theater (text) + date/time (text). These are stored in `booked_showtime` as the same JSON shape `{ theater, date, time, ticketLink: null }`.
- "Notes (optional)" — text area
- [Mark fulfilled] / [Cancel]

**Notes autosave:** the row-level notes textarea debounces 800ms after the last keystroke, then fires `PATCH /api/admin/entries/[id]/status` with only the `notes` field. A small "saving…" / "saved" indicator sits beside the textarea. If the admin navigates away mid-debounce, `beforeunload` triggers an immediate flush.

**Select-as-winner confirm dialog:**
> **Select {name} as a winner?**
> This will email {email} with a reply link so they can tell us how many tickets they want and which showtimes work. Once they reply, the fulfiller will be notified to prepare tickets.
>
> You can undo the status change, but the email will already have been sent.
>
> [Cancel] [Send]

**Bulk select:** checkbox column + a bulk action bar ("Select 3 as winners") at the top when any are checked. Issues the PATCH in a loop with a small visual progress indicator.

**Toasts:**
- ✓ Green: `Email sent to {email}`
- ✗ Red: `Status updated but email failed — use Copy reply link`
- ℹ Neutral: undo / fulfillment confirmations

### Admin campaign form — additional field

Under the existing fields, add:

- **Fulfillment email** — optional text input, placeholder `tn@wgpictures.com (default)`. If the admin leaves it blank, the `FULFILLMENT_EMAIL` env var is used. Helper text: "Where new ticket requests are sent for this campaign. Leave blank to use the default."

### `/freetickets/reply/[token]` — winner reply page

Server component fetches via the GET route above, then renders a client form.

Layout echoes the entry page (same brand):
- Hero: "You're in, {first name} — let's get your tickets."
- Subhead: "Pick how many tickets you'd like and as many showtimes as would work for you. We'll lock one in and email you confirmation."
- **Tickets:** dropdown, 1 / 2 / 3 / 4 (default 2, matching the prize copy)
- **Showtimes:** grouped by theater, checkboxes, at least 1 required
  - Above the list: "Some showtimes may sell out before we get there. The more options you give us, the more likely we can book one for you."
  - "Select all for this theater" link per group
- Submit button: **Claim My Tickets**

**Submitted state:** "We got it. tn@wgpictures.com will email your tickets directly once they're booked."

**Error states:**
- Token not found / not a winner → "This link isn't valid. If you think this is a mistake, reply to your selection email."
- Already replied → "You've already submitted your preferences. If you need to change them, reply to your selection email."
- Network error → inline retry.

### 4.5 Showtime source & filtering

The CSV at `public/showtimes.csv` has no city column — only `Theater, Date, Time, Event Type, Ticket Link`. The homepage maps theater → city via a `THEATER_CITIES` constant in `public/index.html`. That same mapping needs to exist server-side.

Plan:
- Extract the theater→city mapping into `src/lib/theaters.ts` as a single exported constant, re-use it server-side for filtering, and import it into the homepage script (or inline it at build time) so there's one source of truth.
- The `GET /api/entry-reply/[token]` handler reads the CSV, parses it once per request, and returns only rows where:
  1. `THEATER_CITIES[row.theater] === entry.city`
  2. `row.date >= today` (exclude past showtimes)
  3. `row.eventType` does not contain `Sold Out` — or include them but with a `soldOut: true` flag so the UI can render them disabled rather than hiding them.
- If the CSV read fails, the endpoint returns 503 with "Showtime list is unavailable, please try again shortly" — admin gets paged via the existing error log path.
- If the entrant's city has **zero** upcoming showtimes, the reply page falls back to a free-text "I'd still like tickets — reach out to me" option; `requested_showtimes` becomes an empty array and `notes` gets "No showtimes available at reply time — entrant opted to wait".

---

## 5. Email

All via Resend, from `Our Hero Balthazar <noreply@ourherobalthazar.com>` (already verified). New template additions to `src/lib/email.ts`.

### Selection email (to entrant)
- **From:** Our Hero Balthazar <noreply@ourherobalthazar.com>
- **Reply-To:** the campaign's `fulfillment_email` (or the env default) — so a direct reply lands with whoever is handling tickets for this campaign
- **Subject:**
  - Raffle: `Good news — you've been selected for OHB tickets`
  - Giveaway: `Your OHB tickets are ready to claim`
- Greeting with name, city mention.
- Body branches on `campaign_type`:
  - **Raffle:** "You've been selected! Reply with how many tickets you'd like and which showtimes work for you. The more options you pick, the more likely we can book one before it sells out."
  - **Giveaway:** "Your tickets are ready — reply with how many you'd like and which showtimes work for you, while supplies last. Pick multiple options so we can still book you if one sells out."
- Primary button: `Claim My Tickets` → `{APP_URL}/freetickets/reply/{token}`
- Deadline line: "Please reply within 48 hours — otherwise we may offer the tickets to someone else." (Matches rules page §6. Enforced socially, not by code.)

### Fulfillment notification (to the fulfiller)
Fires at **reply time**, not at selection time. Selection without a reply is nothing the fulfiller can act on yet — buying tickets requires knowing count + showtime.

- **From:** Our Hero Balthazar <noreply@ourherobalthazar.com>
- **To:** `campaigns.fulfillment_email` if set, otherwise `FULFILLMENT_EMAIL` env var (currently `tn@wgpictures.com`)
- **CC:** `contact@wgpictures.com` (always, on every fulfillment notification, regardless of the To address)
- **Reply-To:** the entrant's email (so a reply goes directly to them)
- **Subject:** `Ticket request — {name} ({city}) — {n} tickets`
- Body:
  - Entrant: name, email, phone, city
  - Campaign name
  - Requested ticket count
  - Acceptable showtimes as a numbered list, each line hyperlinked to the `ticketLink` from showtimes.csv
  - Link back to the admin entries view: `{APP_URL}/admin`
  - One-line footer: "Mark fulfilled in admin once tickets are sent."

### Resend-selection email (to entrant)
Same as the selection email; just re-fires with the existing token. Subject gets a `(resend)` suffix so it's distinguishable in the inbox.

### No automated ticket-delivery email
tn sends tickets manually from their own inbox. The system does not try to forward screenshots or receipts — that's fragile with ticket chains and adds no value.

---

## 6. Environment variables

New:
- `FULFILLMENT_EMAIL` — default recipient for fulfillment notifications when the campaign doesn't set one. Set to `tn@wgpictures.com` today; change whenever. Required in production. If unset entirely (no campaign override either), the notification is logged + skipped with a warning, matching the existing Resend short-circuit.
- `FULFILLMENT_CC_EMAIL` — always-CC address. Defaults to `contact@wgpictures.com` in code if unset, so this env var is optional. Including it lets ops change the CC without a deploy.

Existing, relevant:
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` — used to build reply and admin links
- `ADMIN_PASSWORD` — gates all admin routes

Per-campaign override (stored in DB, set in admin form):
- `campaigns.fulfillment_email` — takes precedence over `FULFILLMENT_EMAIL`.

---

## 7. Security & edge cases

- **Reply token:** random v4 UUID, stored server-side, looked up via server route only — never embedded in client bundles. Low stakes; this is about preventing accidental URL sharing, not a cryptographic guarantee.
- **Double-select:** `PATCH /select` is idempotent — no duplicate emails if admin clicks twice.
- **Double-reply:** `POST /entry-reply` uses `update ... where reply_token = $1 and replied_at is null`. Rowcount 0 → 409 Conflict with a friendly message.
- **Undo after email sent:** UI shows a confirm dialog when admin clicks Undo on a `winner` row: "The selection email has already been sent. Undo will flip the status back to Pending and invalidate the reply link, but the email is not recalled." On confirm, status → `pending`, `selected_at` cleared, `reply_token` rotated to a new value (invalidating the old link automatically). Admin is responsible for following up with the entrant via email if needed.
- **Email failure:** status change succeeds, toast shows red, row gets a small `✗ email failed` badge + Retry. Copy reply link always works as a fallback.
- **Invalid showtime JSON:** schema validation on POST. The server recomputes the current CSV snapshot and rejects any showtime chunk that doesn't match an actual current row (prevents a tampered client submitting a fake showtime).
- **Rate limits:** reuse `checkRateLimit(ip)` on the public reply endpoint; admin endpoints don't need rate limits beyond auth.
- **Audit:** `selected_at`, `replied_at`, `fulfilled_at` columns plus server console logs give a good enough trail for a volume of tens-to-hundreds of entries. No separate audit table.

---

## 8. Integrations

| Integration | Impact |
|---|---|
| Supabase | One new migration (§2). No RLS changes. |
| Resend | Two new templates in `src/lib/email.ts`. Domain already verified. |
| Google Sheets | Unchanged. The sheet stays a raw entry log — the admin portal is source of truth for status. Revisit in a later iteration if tn wants a sheet-based workflow. |
| hCaptcha | Reuse the existing widget on the reply page (optional; entry page is the primary bot surface). Currently disabled project-wide — the reply page doesn't need it yet if we trust the token. |
| Rate limiter | Reused on `POST /entry-reply`. |

---

## 9. Rollout order

Each step is independently shippable.

1. **Migration** — adds all new columns on `campaigns` and `entries`, backfills `status = 'pending'` for existing rows. Safe; no UI change yet.
2. **Admin form: fulfillment_email field** — tiny UI addition, lets ops configure per-campaign routing before the workflow goes live.
3. **High-fidelity admin table** — status badge, expand row, search, filter chips, summary bar. No winner actions yet. Reads existing entries as `pending`.
4. **Reply page + public endpoints** — deployable without the admin trigger. Tokens don't exist yet, so traffic is 0 until step 5.
5. **Select-as-winner button + selection email** — enables the full loop. First real production use.
6. **Fulfillment email + Mark fulfilled flow** — completes the fulfiller's workflow.
7. **Polish:** bulk select, resend, undo, invalidate-link, notes autosave, CSV export (entries + winners), keyboard shortcuts on the admin table.

---

## 10. Non-goals (explicitly out of scope)

- Automated ticket delivery (screenshotting receipts, forwarding QR codes). Manual via tn.
- SMS notifications. Email only.
- Multi-admin auth / audit logs. Single shared password.
- Waitlist or auto-promote on decline. Admin can manually pick another winner.
- Sheet-based fulfillment mirror. Admin portal is source of truth.
- Expiry jobs. If a winner doesn't reply in 48h, admin decides what to do — no cron.

---

## 11. Questions for you before I build

None are blockers — I'll pick a sensible default for each unless you say otherwise. Listed in decreasing order of importance.

1. **Ticket count max.** The existing prize copy says "2 free tickets", but the plan lets winners pick 1–4. Do you want to:
   - (a) Keep the reply dropdown at **1–4** (flexible; the fulfiller ultimately decides what to buy), or
   - (b) Lock it to **exactly 2** (matches prize copy, no input needed), or
   - (c) Make the max a **per-campaign** setting in the admin form?
   — *Default if you don't answer: (a) 1–4.*

2. **Sold-out showtimes.** Currently many rows in `showtimes.csv` have `(Sold Out)` in the Event Type. Should the reply page:
   - (a) **Hide** them entirely, or
   - (b) **Show them, disabled** with a "Sold Out" label so the winner sees the full picture?
   — *Default: (b) show disabled.*

3. **Reply window enforcement.** The rules page says "48 hours." Do you want code to enforce this (auto-decline at hour 49 via a cron and notify the admin), or keep it as social pressure only?
   — *Default: social pressure only. Add enforcement later if ghosting becomes a pattern.*

4. **Selection-email CC to tn@ / contact@.** Fulfillment notification CCs `contact@wgpictures.com` always (confirmed). Do you also want the **entrant's selection email** to CC either address, so the fulfiller sees the selection happen in real time (before the reply)?
   — *Default: no. The fulfiller gets the fulfillment notification after the reply, which is when they can actually act.*

5. **Admin UI language for giveaways.** Buttons will say **Select as Recipient** and the badge will read `Recipient` when `campaign_type = giveaway`; **Select as Winner** / `Winner` for raffles. Internally the DB value stays `winner`. OK, or would you rather use `Winner` everywhere regardless of campaign type?
   — *Default: branch the label.*

6. **Giveaway success email tone.** For giveaway campaigns, the selection email reads "Your tickets are ready to claim." For raffles, "You've been selected." Those are reasonable but you may have brand preferences — worth a quick read of the draft in §5 before I commit it.

7. **Fulfillment email "From" address.** Right now I have `From: noreply@ourherobalthazar.com` with `Reply-To: the campaign's fulfillment_email`. Option: flip it so the email comes **from** `tn@wgpictures.com` directly (requires tn@ to be a verified sender in Resend — simpler for Gmail threading but one more config step). Easier to start with noreply + Reply-To and move later if needed.
   — *Default: noreply@ourherobalthazar.com + Reply-To.*

8. **Resend-email rate limit.** The **Resend email** button should probably be throttled so the admin can't spam the entrant. Per-entry cooldown of 60s? Or trust the admin and let the button be freely clickable?
   — *Default: 60s cooldown per entry, with a disabled state + countdown tooltip.*
