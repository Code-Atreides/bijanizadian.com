# Greek Wars chapter onboarding

Two pages for fomo's campus site. A chapter head uses the first to onboard
their fraternity or sorority. Everyone else in the chapter uses the second to
sign up.

| Page | Used by | What happens |
|---|---|---|
| `greekwars/claim.html` | The chapter head | On phones it opens on a short pitch and a **Get started** button. Then three steps: their chapter (name, school, chapter, email, phone, active members), their fomo referral link, and the clan link to send the chapter. |
| `greekwars/clan.html` | Everyone in the chapter | The chapter's own page, with a live count toward 80% of the roster. Members already on fomo add their name, fomo username and email. New members tap **Download fomo**, which opens fomo's page with the head's referral code, then come back and add themselves. |

Signing up doesn't put anyone in a clan. These pages collect who should be in
it, and the fomo team adds people to clans in the fomo app.

Both pages have been checked on iPhone SE, iPhone 14, Galaxy S8 and Pixel 7
sizes: no sideways scrolling, 16px inputs so iPhones don't zoom, and large tap
targets.

## What's in the folder

- `greekwars/claim.html`, `greekwars/clan.html`: the two pages. Plain HTML, CSS
  and JavaScript, with no build step.
- `campus/fonts/`: the Aeonik fonts. Also `fomo-favicon.svg`, the two store
  badges and `campus/space-bg.webp`, the share image.
- `PORTING.md`: how to connect the pages to your Supabase.
- `reference/current-firebase-rules.json`: the database rules the pages rely on
  today, as a precise reference for what your database has to enforce.

## Where the data goes

As delivered, the pages save to the fomo team's Firebase test database, so they
work out of the box for trying them. **Before launch, connect them to your
Supabase** by following `PORTING.md`. Each page talks to its database through a
single `DATA` block at the top of its script, and that block is the only thing
to replace.

## Hosting

Upload the folder as it is. The pages load `/campus/fonts/...`,
`/fomo-favicon.svg` and `/badge-*.svg` from the site root.

Each clan's link looks like `https://YOUR-DOMAIN.com/greekwars/clan/sigma-chi-7kyx`,
so your host has to send every `/greekwars/clan/<anything>` to
`greekwars/clan.html`:

- **Vercel** (`vercel.json`): `{ "rewrites": [{ "source": "/greekwars/clan/:id", "destination": "/greekwars/clan.html" }] }`
- **Netlify** (`_redirects`): `/greekwars/clan/*  /greekwars/clan.html  200`
- **Next.js** (`next.config.js`): `rewrites: async () => [{ source: '/greekwars/clan/:id', destination: '/greekwars/clan.html' }]`, with the files in `public/`
- **Firebase Hosting**: `"rewrites": [{ "source": "/greekwars/clan/**", "destination": "/greekwars/clan.html" }]`
- **nginx**: `location ^~ /greekwars/clan/ { try_files /greekwars/clan.html =404; }`

**No rewrites?** In `greekwars/claim.html`, change `var CLAN_PATH = '/greekwars/clan/';`
to `var CLAN_PATH = '/greekwars/clan.html?c=';`. The clan page also opens as
`clan.html?c=<id>`.

**Different folder?** The clan page works from any address that ends in
`/clan/<id>`, or with `?c=<id>`. Set `CLAN_PATH` to match, and keep the two pages
side by side, since the clan page links to `claim` for anyone who lands on a
missing clan.

## Before launch

- [ ] The pages save to your Supabase (`PORTING.md`), and the Firebase scripts
      and config are gone from both.
- [ ] `/greekwars/clan/<id>` reaches the clan page, or `CLAN_PATH` uses `?c=`.
- [ ] `https://YOUR-DOMAIN.com` is replaced in the share tags at the top of both
      pages (`og:url`, `og:image`, `canonical`).
- [ ] The header logo (`/campus`) and the footer's Greek Wars link (`/greekwars`)
      go to your campus home and Greek Wars pages.
- [ ] The footer links to the official rules and a privacy policy, since the
      pages collect names, emails and phone numbers.
- [ ] On a phone: onboard a test chapter, open the clan link it gives you, and
      sign up. Signing up the same username again says it's already signed up,
      and a made-up clan address shows "We can't find this clan." Then delete
      the test records.
- [ ] Bijan's Irrigation workspace will later read the chapter heads and members
      too. Plan to give it read-only access to those tables.
