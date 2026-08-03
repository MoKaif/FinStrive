# Changelog

All notable changes to FinStrive are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

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
