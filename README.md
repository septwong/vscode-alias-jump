# Alias Jump Pro

[中文文档](./README.zh-CN.md)

A VS Code extension for jumping to files from alias and relative paths. Hold `Ctrl` (`Cmd` on macOS) and click a path to open it.

## Usage

Use an alias in your project:

```ts
import Button from '@/components/Button'
import { formatDate } from '@/utils/date'
```

`./` and `../` paths work too. Hover a path to see where it ultimately resolves.

### Automatic detection

No extra setup is needed. The extension reads aliases from:

- VS Code settings
- Vite
- Webpack
- `tsconfig.json`
- `jsconfig.json`

If none is found, `@` resolves to `src` by default.

Supported languages and frameworks:

- Vue
- JavaScript
- TypeScript
- CSS, SCSS, and Less
- Svelte
- uni-app

## Manual configuration

To override automatic detection, add this to VS Code `settings.json`:

```json
{
  "alias-jump-pro.mappings": {
    "@": "src",
    "@components": "src/components"
  }
}
```

Optional settings:

- `alias-jump-pro.rootpath`: project-root marker; defaults to `package.json`.
- `alias-jump-pro.allowedsuffix`: extensions to try for extensionless paths.

## Command

`Alias Jump Pro: Reload Configuration` reloads the configuration.

## License

MIT
