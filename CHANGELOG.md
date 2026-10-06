# Changelog

All notable changes to flowbite-xor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/) as git tags (`X.Y.Z`, no `v`).

## [Unreleased]

### Added

- `theme`: Flowbite's color roles for light and dark, with contrast fixes.
- `theme-toggle`: a button switching between light and dark; the choice is remembered per browser.
- 22 components from the official `flowbite-4` kit (`alert`, `avatar`, `badge`, `button`, `button-group`, `card`,
  `checkbox`, `dropdown`, `indicator`, `input`, `kbd`, `label`, `modal`, `pagination`, `radio`, `select`,
  `skeleton`, `spinner`, `table`, `tabs`, `textarea`, `toggle`), with Stimulus controllers instead of Flowbite's
  JavaScript.
- Components the official kit lacks: `breadcrumb`, `drawer`, `empty-state`, `navbar`, `page-header`, `progress`,
  `sidebar`, `stat-card`, `toast`, `tooltip`.
- `form-theme`, a Symfony form theme rendering through the kit's components, and `form-field`, the labelled control
  with help text and errors it renders each row with.
- `layouts`: base, app (sidebar, navbar, page header, toasts), auth, settings, error and blank.
- Blocks: `dashboard-home`, `login`, `signup`, `forgot-password`, `settings-profile`, `not-found`.
