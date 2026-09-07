# Project delivery preference

The user explicitly requested on 2026-09-07 that completed updates to this
project be pushed to GitHub and published to their domain by default.

- After implementing and verifying a requested update, commit the relevant
  source and generated assets, push to the configured GitHub remote, and deploy
  Firebase Hosting to the existing project `bijanizadian-84e48`.
- Verify the affected public URLs after deployment and report their links and
  the Git commit. Do not call a local preview a published update.
- This applies to completed project updates, not read-only reviews or diagnoses.
- Preserve unrelated user changes; do not force-push, overwrite remote work, or
  include unreviewed unrelated files. Never commit credentials or deploy local
  handoff archives, development tooling, or agent instructions.
- Use Hosting-only deployment. Database rules, DNS, authentication, billing,
  and other infrastructure changes require separate task scope.
- A later user instruction to preview only, hold publication, or use a different
  destination overrides this default. Respect any required tool approvals.

# Verification

- Campus links and journeys: `node scripts/check-fomo-links.mjs`.
- Portfolio source changes: run `npm run build` inside `portfolio`; the built
  output is `v2/` and must be committed with its source.
- Check the affected layouts and navigation, and run `git diff --check` before
  publishing. Firebase serves the repository root with clean URLs.
