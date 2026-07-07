# AGENTS.md

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install deps (note: `.npmrc` enables pre/post scripts) |
| `pnpm run compile` | `check-types → lint → esbuild` (sequential) |
| `pnpm run package` | Same as compile but esbuild with `--production` (minified, no sourcemap) |
| `pnpm run watch` | Parallel `watch:esbuild` + `watch:tsc` via `npm-run-all` |
| `pnpm test` | Runs `@vscode/test-cli` (integration tests, requires VS Code); `pretest` compiles first |
| `pnpm run check-types` | `tsc --noEmit` |
| `pnpm run lint` | `eslint src` (flat config) |
| `pnpm run compile-tests` | `tsc -p . --outDir out` (compiles test files to `out/`) |

## Architecture

- **Entrypoint**: `src/extension.ts` → bundled by esbuild → `dist/extension.js` (CJS bundle).
- **Activation**: Lazy, via `onLanguage` events for 8 languages (vue, javascript, typescript, javascriptreact, typescriptreact, css, scss, less).
- **Runtime dependency**: Only `jsonc-parser`. Everything else is dev.
- **TypeScript**: `module: "Node16"`, `moduleResolution: "Node16"`, `target: "ES2022"`, `strict: true`. tsc is type-check only (no emit).

## Config Reader Chain (priority descending)

| Reader | Priority | Watches |
|--------|----------|---------|
| `VSCodeSettingsReader` | 20 | N/A (settings change triggers auto-reload) |
| `ViteConfigReader` | 15 | `vite.config.{js,ts,mjs}` |
| `WebpackConfigReader` | 15 | `webpack.config.{js,ts}`, `webpack.common.{js,ts}` |
| `TsConfigReader` | 10 | `tsconfig.json`, `jsconfig.json` |

Higher priority wins on alias key collisions. Fallback if no reader produces mappings: `{ "@": "src" }`.

## Gotchas

- **VSCodeSettingsReader** only returns mappings when user explicitly overrides the default — otherwise returns `[]` to let lower-priority readers provide values.
- **Config cache TTL**: 5 seconds (`configService.ts`). Clear with "Alias Jump: Reload Configuration" command or `clearAllCaches()`.
- **File resolution**: `joiningSuffix` in `utils/index.ts` tries direct extension append first, then `index.{ext}` fallback. Uses `allowedsuffix` setting (default: `["js","vue","jsx","ts","tsx","svelte"]`).
- **Root path detection**: Controlled by `alias-jump-pro.rootpath` setting (default `"package.json"`).
- **Comment handling**: `removeComments` in utilities strips block comments before alias parsing.
- **Alias matching**: Both `@` and `@/` formats supported. Trailing slash is automatically appended to alias key during matching.
- **Tests**: Integration tests only (require VS Code host). Run via `@vscode/test-cli`, config in `.vscode-test.mjs`. Test source in `src/test/`, compiled to `out/test/`.
- **Adding a reader**: Implement `AliasConfigReader` in `src/configReaders/`, register in `src/configReaders/index.ts`, and add file pattern to `fileWatcherService.ts`.
- **Localization**: Strings in `package.nls.json` / `package.nls.zh-cn.json`. Referenced via `%key%` syntax in `package.json`.
