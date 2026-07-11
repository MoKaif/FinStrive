# Changelog

All notable changes to FinStrive are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

## [1.0.0] - 2026-07-11

Versioning baseline. Establishes the changelog + SemVer/Conventional-Commits
convention for FinStrive going forward.

### Security
- Stopped tracking `frontend/.env` (it is `.gitignore`d). Note: a build-time
  `REACT_APP_API_KEY` remains in earlier git history and, being a client-side
  key, ships to the browser — rotate it if it protects anything sensitive.
