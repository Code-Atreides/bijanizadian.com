# fomo campus Discord — build spec

A brief for the agent building the fomo campus Discord server and its bot.
Everything below is a requirement unless marked *optional*.

Program facts referenced here (Greek Wars rules, the five campus-team seats,
prize amounts) come from the live program and are fixed. Do not invent roles,
channels, or mechanics that restate or contradict them.

---

## 0. Brand rules that apply everywhere

- **"fomo" is always lowercase.** Server name, channel names, role names, bot
  replies, embed titles, button labels, command descriptions. Never "Fomo" or
  "FOMO".
- Embed accent colour is **fomo blue `#516AF6`**. Use `#0B091F` (fomo ink) only
  as a dark field, `#4A36FF` (electric blue) only as a small accent. No rainbow,
  neon, or metallic styling.
- One focal point per embed. Long embeds get split, not crammed.
- Never surface a user's balance, positions, or personal information in a public
  channel — not in leaderboards, not in bot replies, not in screenshots.

---

## 1. Channel structure

Open with **6–10 channels total.** Ten members spread across thirty rooms reads
as dead; across six it reads as alive. Add a channel only when an existing one is
visibly overflowing.

Organize by **lifecycle stage, not topic**:

| Channel | Type | Purpose |
| --- | --- | --- |
| `#start-here` | text, read-only | rules, scam warning, Greek Wars terms, disclaimer |
| `#announcements` | announcement | staff only; the room people mute last |
| `#introductions` | text | the first action every new member takes |
| `#general` | text | slowmode 5–10s |
| `#greek-wars` | text | chapter competition chat |
| `#leaderboard` | text, read-only | weekly standings, bot-posted via webhook |
| `#dinner-series` | forum | one thread per host / per dinner |
| `#campus-team` | text, role-gated | the five seats only |

**Ephemeral channels.** Game Day is school-vs-school on live realised PnL during
a single football game. Create the channel at kickoff, archive it after. Do not
leave a permanent `#gameday` channel dead for 51 weeks a year.

**Forum channels** for anything with parallel long-lived threads (dinner recaps,
chapter coordination). Plain text channels for conversation.

---

## 2. Onboarding

This is the highest-leverage surface in the build. Members who post within their
first 24 hours retain far better than lurkers, so the flow exists to produce a
first post.

Required Discord Community features:

- **Rules Screening** — members must accept before they can type.
- **Server Onboarding** — the interest/role picker shown on join.
- **Welcome Screen** — three entries maximum, pointing at `#start-here`,
  `#introductions`, `#greek-wars`.

Onboarding questions, in this order:

1. **Which school?** → assigns the school role.
2. **Chapter, campus team, or just here?** → assigns the function role and
   unlocks the matching channels.

A new member should land in a server that already looks tailored to them.

Other settings:

- **Verification Level: Medium or High.** A trading-adjacent server gets raided.
- **2FA required for moderator actions.**
- One join DM, at most. Short, no external links, and it must never ask for
  anything — scam bots send exactly this message, so ours has to read plainly.
- `#start-here` gives one concrete first action: *post your school and chapter in
  #introductions.*

---

## 3. Roles and permissions

Three role families:

- **Identity** — `@ucla`, `@sigma-chi`, one per school and per chapter.
- **Function** — the five campus-team seats, named exactly and in this order:
  `@campus-president`, `@growth`, `@partnerships`, `@content`, `@culture`
  (dinners and events belong to Culture; there is no `@events` role).
- **Staff** — `@mod` (timeout, delete, kick) and `@admin` (roles, channels,
  bans), kept separate. Fewest possible admins.

Permission rules:

- **Sync permissions at the category level**, override per channel only where
  genuinely needed. Bespoke per-channel permissions become unmaintainable by
  month two.
- Deny `@everyone`: **Mention @everyone/@here**, **Manage Messages**, and
  **Create Invite** on public categories. Only staff pings the room.
- The bot gets a **scoped permission bitfield, never Administrator.** Compute
  exactly what it needs.
- Bot token lives in an environment variable or secret store. **Never in the
  repository**, never in a config file that gets committed.

---

## 4. Cadence

A community without a predictable rhythm dies. Build the cadence into the bot
rather than leaving it to whoever remembers.

- **Weekly leaderboard drop** at a fixed day and time: Greek Wars chapter
  standings on raw PnL, plus the top trader per chapter. Same slot every week.
- **Discord Scheduled Events**, created programmatically with RSVP, for Game Days
  and dinners. Always include the timezone.
- One low-stakes weekly ritual — a Sunday thread — that requires no prize money.
- **Seed before launch.** Get 20–50 people in (campus team, one or two onboarded
  chapters) and talking before the invite goes wide.

---

## 5. Moderation

Assume adversaries from day one. A trading community is a phishing magnet.

- **AutoMod on**: spam filter, mention-spam limit of 5, and a custom word list
  covering the scam vocabulary — `airdrop`, `dm me`, `giveaway`, `seed phrase`,
  `wallet connect`, `support ticket`.
- **Pinned standing rule**: staff will never DM you first, and will never ask for
  a seed phrase, a private key, a screenshot of your balance, or payment.
  Admin impersonation over DM is the most common attack on servers like this.
- Lock nickname changes. *Optional but recommended:* a join-time check that flags
  names within a small edit distance of staff names.
- **Slowmode** on `#general` (5–10s). Nearly free, and it blunts raid velocity.
- **Audit log channel** the bot writes to: joins, leaves, role changes, message
  deletions, timeouts. You need the history when something goes wrong.
- **Escalation ladder**, written down and applied consistently: warn → timeout
  (10m / 1h / 24h) → kick → ban, with an appeal path. Inconsistent enforcement is
  how a community loses trust in its mods.
- **Raid mode**: one staff command that raises verification to Highest and pauses
  invites.

---

## 6. Finance rules — these go in the server rules verbatim

- **No financial advice. No signal-calling. No coordinated buying.** State it
  explicitly and moderate it actively. This is the rule that protects the
  program.
- **Standing disclaimer** in `#start-here` and on every prize or leaderboard
  post: *trading involves risk including loss of principal, and a prize is not a
  trading return.*
- PnL screenshots, if allowed at all: no account balances, no personal
  information.
- **Greek Wars terms pinned verbatim** — a chapter qualifies by onboarding 80%+
  of active members and keeping fomo downloaded through the semester; ranking is
  on **raw PnL**, not points, volume, or activity; every qualifying chapter's #1
  trader wins **$500**; the #1 chapter nationally wins **$10,000**; season is
  Fall 2026, Aug 24 – Dec 11. People will argue about the rules. The pin ends the
  argument.
- Discord's own minimum age is 13; gate to the app's floor if it is higher.

---

## 7. Bot engineering

- **Slash commands**, not prefix commands. Register guild-scoped in development
  (instant) and global in production (up to an hour to propagate).
- **Ephemeral replies** for anything personal — `/mystats`, role self-assign
  confirmations — so channels do not fill with bot noise.
- **Rate limits**: honour `X-RateLimit-*` headers and `Retry-After`, back off
  exponentially. Bulk role assignment across a few hundred members will 429 you
  if it runs unthrottled.
- **Request only the gateway intents actually used.** `GUILD_MEMBERS` and
  `MESSAGE_CONTENT` are privileged and must be enabled in the developer portal.
- **IDs live in config, not in source.** Guild, channel, and role IDs change —
  the server will be rebuilt at least once.
- **Idempotent operations.** Re-running setup must not duplicate roles or re-post
  announcements. Key off stored state, not "I think I already ran."
- **Webhooks** for automated announcements (leaderboards, event reminders): they
  render cleanly and do not consume the bot's rate limit.

---

## 8. Metrics

Log weekly:

- new joins
- **percentage of joiners who post within 7 days** — the number that matters most
- WAU as a share of total members
- messages per active member
- 4-week retention

Discord's Server Insights unlocks at 500 members. Below that, the bot logs joins,
leaves, and first messages itself.

---

## 9. Anti-patterns

Do not ship any of these:

- thirty channels at launch
- `@everyone` mentionable by members
- welcome DMs carrying external links
- an announcements channel that goes quiet for three weeks
- `#general` unmoderated overnight
- events posted without a timezone
- the bot granted Administrator "for now"
