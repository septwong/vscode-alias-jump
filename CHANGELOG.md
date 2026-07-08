# Change Log

All notable changes to the "alias-jump-pro" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.3.0] - 2026-07-08

### Added

- uni-app support: detect `pages.json`, automatically resolve `@` → `src/` or project root
- `UniAppConfigReader`: smart alias mapping based on `src/` directory existence
- `.nvue` / `.uvue` file support in activation events and suffix resolution
- Watch `pages.json` changes for cache invalidation

## [1.2.1] - 2026-07-07

### Changed

- Update Logo

## [1.2.0] - 2026-07-07

### Fixed

- Path matching now uses the path token under the cursor instead of the first quoted string on the line.
- Missing Svelte definition provider registration.
- `esbuild.js` no longer throws a secondary error when an esbuild error has no location.

### Changed

- `alias-jump-pro.rootpath` now finds the closest project root from the current file, improving monorepo support.
- Config readers now resolve aliases from the detected project root.
- Default suffix resolution now includes `css`, `scss`, and `less`.
- Chinese README is included in the packaged extension.

### Added

- Hover provider showing the resolved absolute file path for alias and relative imports.
- Local `tsconfig.json` / `jsconfig.json` `extends` chain support.
- Backtick import path support.
- Unquoted CSS `url(@/...)` path support.
- Unit coverage for path parsing, suffix resolution, config readers, tsconfig extends, and nested project root detection.

## [1.1.0] - 2026-04-02

### Added

- Auto-read `tsconfig.json`/`jsconfig.json` `compilerOptions.paths` for alias mappings
- Multi-workspace support - different projects can have different configurations
- Auto-read `vite.config.js/ts` `resolve.alias` for alias mappings
- Auto-read `webpack.config.js/ts` `resolve.alias` for alias mappings
- Config file change detection - automatically reload when config files change
- Chinese (zh-cn) localization support

### Changed

- Config priority: VS Code settings > Vite/Webpack > tsconfig/jsconfig

## [1.0.0] - 2026-04-02

### Added

- Initial stable release
- Alias path navigation with `Ctrl+Click`
- Support for path aliases (e.g., `@/components/Button`)
- Support for relative paths (`./` and `../`)
- Multi-language support (Vue, JS, TS, JSX, TSX, CSS, SCSS, Less)
- Auto suffix resolution for file extensions
- Project root detection via `package.json`
- Configuration settings for custom path mappings
- `Reload Configuration` command to clear cache
