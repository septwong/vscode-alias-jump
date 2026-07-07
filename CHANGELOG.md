# Change Log

All notable changes to the "alias-jump-pro" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.0] - 2026-07-07

### Fixed

- Greedy regex in path matching that could overflow into line comments
- Missing `onLanguage:svelte` activation event — Svelte files now trigger the extension

### Changed

- Removed `removeComments` utility — no longer needed after regex fix
- Removed unused `rootpath` configuration from internal config (setting retained for compatibility)
- Removed unused `context` parameter from `ConfigService`
- Removed unused `configDir` parameter from `WebpackConfigReader`

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