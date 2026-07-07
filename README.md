# Alias Jump

[中文文档](./README.zh-CN.md)

A VS Code extension that enables navigation to alias path definitions with `Ctrl+Click`. Perfect for projects using path aliases like `@/components/Button`.

## Features

- **Alias Path Navigation**: Jump to files using path aliases (e.g., `@/components/Button`)
- **Relative Path Support**: Also works with `./` and `../` relative paths
- **Multi-language Support**: Works with Vue, JavaScript, TypeScript, JSX, TSX, CSS, SCSS, Less, and Svelte
- **Auto Suffix Resolution**: Automatically resolves file extensions (`.js`, `.vue`, `.ts`, etc.)
- **Project Root Detection**: Automatically finds project root by looking for `package.json`
- **Performance Optimized**: Caches project root paths for faster navigation

## Usage

1. Configure your path aliases in VS Code settings
2. Hold `Ctrl` (or `Cmd` on macOS) and click on an alias path
3. The editor will navigate to the target file

### Example

```javascript
// With alias configured as { "@": "/src" }
import Button from '@/components/Button'  // Ctrl+Click to navigate
import { utils } from '@/utils'           // Ctrl+Click to navigate
```

## Extension Settings

This extension contributes the following settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `alias-jump-pro.mappings` | object | `{ "@": "/src" }` | Path mappings. Key is the alias, value is the path relative to project root. |
| `alias-jump-pro.rootpath` | string | `"package.json"` | File name used to identify the project root directory. |
| `alias-jump-pro.allowedsuffix` | array | `["js", "vue", "jsx", "ts", "tsx", "svelte"]` | Allowed file extensions for auto-completion. |

### Configuration Example

Add to your `settings.json`:

```json
{
  "alias-jump-pro.mappings": {
    "@": "/src",
    "@components": "/src/components",
    "@utils": "/src/utils",
    "@assets": "/src/assets"
  },
  "alias-jump-pro.allowedsuffix": ["js", "vue", "jsx", "ts", "tsx", "svelte"]
}
```

## Commands

| Command | Description |
|---------|-------------|
| `Alias Jump: Reload Configuration` | Clear cache and reload configuration |

## Supported Languages

- Vue (`.vue`)
- JavaScript (`.js`)
- TypeScript (`.ts`)
- JSX (`.jsx`)
- TSX (`.tsx`)
- CSS (`.css`)
- SCSS (`.scss`)
- Less (`.less`)
- Svelte (`.svelte`)

## License

MIT