# Connecting the onboarding pages to Supabase

This is for whoever moves the pages from Firebase to Supabase. It's written so
a coding assistant can follow it too.

## What to change

Each page's script opens with a block headed **THE DATA LAYER**, which defines
`DATA`. It's the only code on the page that touches a database.

1. Replace the `DATA` block in each page with a Supabase version that keeps the
   same functions, arguments, results and error codes (listed below).
2. Remove the two Firebase `<script>` tags in each page's `<head>` and the
   `firebaseConfig` object.
3. Load supabase-js v2, for example
   `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`,
   and create the client with your project URL and **anon** key. The service
   role key must never appear in a page.

Leave everything else as it is: the checks on each field, the screens, the
copy, the links and the layout. The pages already check every field before
calling `DATA`. The database has to check them again, because anyone can call
it directly with the anon key.

Both pages already define `withTimeout(promise, ms)`, which rejects with
`{ code: 'TIMEOUT' }`. Wrap each database call in it: 15 s for writes, 12 s for
reading a clan.

## The functions

### `greekwars/claim.html`

**`DATA.ready`**: `true` if the client was created, otherwise `false`. The page
shows a connection error instead of saving.

**`DATA.createClan(id, clan, head)`** saves a new clan and its head's private
details together: both or neither.

- `id`: made by the page as a slug of the chapter name plus four random
  characters, for example `sigma-chi-7kyx`. It matches `^[a-z0-9-]{3,48}$`.
- `clan`: `{ chapter, school, lead, actives }`. `lead` is the head's fomo
  username.
- `head`: `{ firstName, lastName, email, phone, fomoUsername, referralLink, school, chapter, actives }`.
- Resolves once saved.
- Rejects `{ code: 'TAKEN' }` if a clan with this `id` already exists. The page
  retries twice with a new id.
- Rejects `{ code: 'TIMEOUT' }`, or anything else, on any other failure. The
  page shows a try-again message.

### `greekwars/clan.html`

**`DATA.ready`**: as above. If it's `false`, the page says it couldn't load the clan.

**`DATA.getClan(id)`** resolves with `{ chapter, school, lead, kind, actives }`,
or with `null` when there's no clan with that id. The page then shows "We can't
find this clan."

- `lead`: the head's fomo username. The page builds the Download button and the
  referral code from it (`https://fomo.family/r/<lead>`).
- `kind`: `'claim'` only on clans the fomo team made; otherwise leave it out.
- `actives`: the roster size. The goal is 80% of it.
- Rejects on a failure to read, and the page says it couldn't load the clan.

**`DATA.watchCount(id, onCount, onError)`** calls `onCount(n)` with how many
people have signed up for the clan, straight away and again when it changes.
It calls `onError()` if the count can't be read, and the page hides the count.

**`DATA.addMember(id, member)`** saves one member.

- `member`: `{ fomoUsername, firstName, lastName, email }`. Clans made on the
  claim page always send all four.
- Resolves once saved. Only then should the count go up.
- Rejects `{ code: 'DUPLICATE' }` if that username, ignoring case, has already
  signed up for this clan. The page says it's already signed up.
- Rejects `{ code: 'TIMEOUT' }`, or anything else, on any other failure.

**`DATA.attachHead(id, key, lead, referralLink)`** is only for clans the fomo
team made for chapters that registered before these pages. Those clans live on
bijanizadian.com. On your site every clan comes from the claim page with its
head already set, so `getClan` never returns `kind: 'claim'`, the head screen
never shows, and `attachHead` can simply reject `{ code: 'REFUSED' }`.

## What the database must enforce

The pages use the anon key and no login, so these rules belong in the database
(tables, constraints, RLS and functions), not only in the page.
`reference/current-firebase-rules.json` is the exact version the pages rely on
today.

**Clans**

- `id` matches `^[a-z0-9-]{3,48}$`. A clan can't be overwritten or deleted from
  a browser, and creating one with an id that exists fails (`TAKEN`).
- `chapter` and `school`: 2–120 characters. `actives`: a whole number from 5 to
  1,000. `lead` matches `^[A-Za-z0-9_.-]{2,32}$`. The creation time comes from
  the server.
- A browser can read one clan by its id (`chapter`, `school`, `lead`, `actives`),
  but it can't list clans.

**Heads** (one per clan)

- Saved in the same transaction as the clan, so a single function called with
  `rpc` is the natural fit.
- First and last name: 1–50 characters. Email: a valid address, up to 200
  characters. Phone: 7–30 characters of digits, spaces and `+ ( ) . -`. The fomo
  username must equal the clan's `lead`. The referral link must equal
  `'https://fomo.family/r/' + fomo username`. School, chapter and actives match
  the clan. The time comes from the server.
- Never readable from a browser.

**Members**

- One per clan per username, ignoring case, so a repeat fails (`DUPLICATE`).
  The clan must exist.
- The fomo username matches `^[A-Za-z0-9_.-]{2,32}$`. First and last name
  (1–50 characters) and email (valid, up to 200) are required. The time comes
  from the server.
- Never readable from a browser.

**The count**

- A browser can get the *number* of members for one clan, but never who they
  are. A function that returns only the count does it. The current Firebase
  version exposes the usernames behind its count, and this closes that gap.
- Supabase Realtime only delivers rows the browser can read, and members must
  not be readable. So `watchCount` should poll the count function (every 15 s is
  plenty) rather than subscribe.

## A shape that fits

- `clans`: `id text primary key`, `chapter`, `school`, `lead`, `actives int`,
  `created_at timestamptz default now()`
- `clan_heads`: `clan_id text primary key references clans`, `first_name`,
  `last_name`, `email`, `phone`, `fomo_username`, `referral_link`, `school`,
  `chapter`, `actives`, `submitted_at timestamptz default now()`
- `clan_members`: `clan_id text references clans`, `username_key text` (the
  lowercased username), `fomo_username`, `first_name`, `last_name`, `email`,
  `submitted_at timestamptz default now()`, `primary key (clan_id, username_key)`

Turn RLS on for all three, with no select policies for `anon` on `clan_heads`
and `clan_members`. Then three functions, `security definer` with a fixed
`search_path`, each checking its inputs:

- `create_clan(...)` inserts the clan and its head. A duplicate id raises
  `unique_violation` (`23505`); map it to `TAKEN`.
- `get_clan(id)` returns the public fields.
- `clan_count(id)` returns the number.

Add members with an RLS insert policy or a `join_clan(...)` function, and map
`23505` to `DUPLICATE`.

## Reading it in your admin

On your server, with the service role key: one row per clan, joined to its
head and members. The fields are the ones above. Keep the admin behind a login,
since the rows include emails and phone numbers.

## Checks before launch

- On a phone: onboard a test chapter, open its link, sign up. The count goes up
  by one.
- Sign up the same username again, with different capitals: it's refused as
  already signed up.
- Open `/greekwars/clan/no-such-clan`: "We can't find this clan."
- With only the anon key, try to read `clan_heads` and `clan_members`, to list
  `clans`, and to overwrite a clan. All four must fail.
- Delete the test records.
