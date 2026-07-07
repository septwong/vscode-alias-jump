# Alias Jump

[English](./README.md)

一个 VS Code 扩展，支持使用 `Ctrl+Click` 跳转到别名路径定义。非常适合使用路径别名的项目，如 `@/components/Button`。

## 功能特性

- **别名路径跳转**：通过路径别名跳转到文件（例如 `@/components/Button`）
- **相对路径支持**：同时支持 `./` 和 `../` 相对路径
- **多语言支持**：支持 Vue、JavaScript、TypeScript、JSX、TSX、CSS、SCSS、Less 和 Svelte
- **自动配置识别**：自动读取 VS Code settings、Vite、Webpack、`tsconfig.json` 和 `jsconfig.json`
- **自动后缀解析**：自动解析文件扩展名（`.js`、`.vue`、`.ts`、`.css`、`.scss`、`.less` 等）
- **嵌套项目根目录检测**：从当前文件向上查找最近的项目根标记，适合 monorepo
- **性能优化**：缓存已解析的项目配置以加快导航速度

## 使用方法

1. 在 VS Code settings、Vite、Webpack、`tsconfig.json` 或 `jsconfig.json` 中配置路径别名
2. 按住 `Ctrl`（macOS 上为 `Cmd`）并点击别名路径
3. 编辑器将跳转到目标文件

### 示例

```javascript
// 配置别名为 { "@": "src" }
import Button from '@/components/Button'  // Ctrl+Click 跳转
import { utils } from '@/utils'           // Ctrl+Click 跳转
```

```scss
.logo {
  background-image: url(@/assets/logo);
}
```

## 扩展设置

此扩展提供以下设置：

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `alias-jump-pro.mappings` | object | `{ "@": "/src" }` | 路径映射。键为别名，值为相对于项目根目录的路径。 |
| `alias-jump-pro.rootpath` | string | `"package.json"` | 从当前文件向上查找最近项目根目录时使用的文件名。 |
| `alias-jump-pro.allowedsuffix` | array | `["js", "vue", "jsx", "ts", "tsx", "svelte", "css", "scss", "less"]` | 解析无扩展名路径时尝试的文件扩展名。 |

### 配置示例

添加到你的 `settings.json`：

```json
{
  "alias-jump-pro.mappings": {
    "@": "src",
    "@components": "src/components",
    "@utils": "src/utils",
    "@assets": "src/assets"
  },
  "alias-jump-pro.allowedsuffix": ["js", "vue", "jsx", "ts", "tsx", "svelte", "css", "scss", "less"]
}
```

### 自动配置来源

Alias Jump 按以下优先级读取别名：

1. VS Code 设置 `alias-jump-pro.mappings`
2. Vite `resolve.alias`
3. Webpack `resolve.alias`
4. `tsconfig.json` / `jsconfig.json` 的 `compilerOptions.paths`
5. 兜底配置 `{ "@": "src" }`

## 命令

| 命令 | 描述 |
|------|------|
| `Alias Jump: Reload Configuration` | 清除缓存并重新加载配置 |

## 支持的语言

- Vue (`.vue`)
- JavaScript (`.js`)
- TypeScript (`.ts`)
- JSX (`.jsx`)
- TSX (`.tsx`)
- CSS (`.css`)
- SCSS (`.scss`)
- Less (`.less`)
- Svelte (`.svelte`)

## 许可证

MIT
