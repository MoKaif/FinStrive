# Changelog

All notable changes to FinStrive are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Fixed
- Value Research's renamed `Mutual Funds / SIFs` section is recognised in both
  holdings statements and transaction-history exports, including the
  `Mutual Funds & SIFs` worksheet-tab variant. Mutual-fund rows are no longer
  skipped when importing exports generated after the August 2026 format change.

## [1.3.0] - 2026-08-09

### Added
- Value Research transaction history import. The all-time export carries every
  purchase, dividend and PPF deposit with its date, which extends the portfolio
  back over the years that monthly statements cannot reach
  (`POST /api/holdings/history/import`, plus timeline and transaction endpoints).
- A "Portfolio since inception" chart plotting cost against value by month. Cost
  is exact and reconciles with the holdings statement to the paisa; value is a
  carry-forward reconstruction and is labelled as one on the panel, since the
  export prices a holding only on the days it was traded.
- Standing cost corrections now apply to the history too, attributed to the month
  the instrument was actually bought — so the Tata Capital IPO shows ₹14,996
  leaving in October 2025 rather than units appearing for free.
- Two charts the ledger could always have supported: bank balance over time, read
  from the closing balance on statement rows rather than derived, and where the
  money came from alongside where it went.

### Fixed
- **Chart figures were wrong.** The sign of `Amount` carries no meaning in this
  data — the same account pair appears with both signs, 145 negative and 79
  positive on `HDFCBank → Expenses:Transport` alone. The charts summed signed
  amounts while the stat cards summed absolute ones, so one page reported income
  as both ₹735,693.56 and ₹739,248.44. Direction now comes from the account pair
  and magnitude is always absolute, in one shared classifier.
- Over half of all outflow was invisible. ₹503,709 of transfers into investments
  appeared in no chart, so "where the money went" answered for 45% of spending
  and "net" was not a cash position. Investing is now its own class.
- ₹210,007 of inflow went uncounted, including money returning from
  `Expenses:Family` and refunds booked against `Expenses:Food`. Returns now net
  off the category they came from instead of vanishing.
- A `HDFCBank → HDFCBank` self-transfer counted as spending; transfers between
  your own accounts are now neutral.
- The daily chart bucketed by UTC but labelled in local time, so IST transactions
  after midnight landed on the previous day.
- Time-range filters measured from today, emptying every chart during any gap in
  importing; they now measure from the most recent transaction.

### Changed
- "Where the money went" is a ranked bar chart rather than a donut. Eight slices
  cannot be compared by angle, and the eight-hue palette it needed failed
  colour-blind separation; one series needs one colour.
- Chart series use the categorical pair the portfolio already uses. Green and red
  stay on signed figures in text, where they mean gain and loss.

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
