# Changelog

All notable changes to FinStrive are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

## [1.2.0] - 2026-08-03

### Changed
- The rest of the app now uses the terminal language the portfolio tab
  introduced: flat panels, hairline rules, monospaced tabular figures, and
  hierarchy carried by weight and separation rather than size, gradient or
  shadow. Covers the navbar, home, sign-in and registration, transactions,
  reconciliation, the stock screens and every shared control. Emoji headings,
  gradient buttons and the glass cards are gone.
- The landing page describes what the app does instead of advertising "20k+
  users" and "$100M+ tracked" against a single-user ledger.

### Fixed
- Editing a transaction's date had no effect. The repository copied every
  editable field except `TxnDate`, so the API answered 200 and the row kept its
  original date. It now also picks up an edited `DescriptionRaw`, and normalises
  the date to UTC for the `timestamptz` column.
- Sessions no longer half-expire. Tokens last a week and nothing checked that,
  so once one lapsed the app still looked signed in — most endpoints carry no
  `[Authorize]` attribute and kept answering — while the holdings API returned
  401. The stored token is now checked on boot, and a 401 from our own API
  clears the session and returns you to sign-in.
- Tokens are no longer retired early. `SecurityTokenDescriptor.Expires` is read
  as UTC, and it was being given local time, cutting the life of every token by
  the host's UTC offset.
- Editing a category in the ledger sent one request per keystroke; it now saves
  when the field is left.

## [1.1.0] - 2026-07-26

### Added
- Value Research holdings statements. Upload the monthly `.xls` and the portfolio
  tab shows the positions it contains, keeping every statement so the portfolio
  can be tracked over time (`POST /api/holdings/import`, plus snapshot, timeline
  and per-instrument history endpoints).
- Standing cost-basis corrections. Where a statement reports no cost for a
  holding, a stored rule supplies it and is replayed across every statement,
  past and future. Seeded with the Tata Capital IPO allotment at ₹14,996.
- Portfolio UI rebuilt as a dense terminal-style view: reconciliation of the
  corrected totals against the ones printed on the statement, allocation by
  asset class, value history, and a holdings table that nests folios under the
  instrument they belong to.

### Fixed
- Instruments held across several folios are no longer double-counted. Value
  Research prints both an aggregate row and one row per folio; the aggregate is
  now excluded from totals whenever its folio rows are present.
- The bearer token is attached per request rather than pushed onto axios
  defaults. Logging in without a page reload previously sent no token at all,
  and logging out left the old one attached. The interceptor is scoped to this
  app's own origin so the token is never sent to Financial Modeling Prep.

## [1.0.0] - 2026-07-11

Versioning baseline. Establishes the changelog + SemVer/Conventional-Commits
convention for FinStrive going forward.

### Security
- Stopped tracking `frontend/.env` (it is `.gitignore`d). Note: a build-time
  `REACT_APP_API_KEY` remains in earlier git history and, being a client-side
  key, ships to the browser — rotate it if it protects anything sensitive.
