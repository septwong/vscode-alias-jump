# Alias Jump

[English](./README.md)

一个 VS Code 扩展，支持使用 `Ctrl+Click` 跳转到别名路径定义。非常适合使用路径别名的项目，如 `@/components/Button`。

## 功能特性

- **别名路径跳转**：通过路径别名跳转到文件（例如 `@/components/Button`）
- **相对路径支持**：同时支持 `./` 和 `../` 相对路径
- **多语言支持**：支持 Vue、JavaScript、TypeScript、JSX、TSX、CSS、SCSS 和 Less
- **自动后缀解析**：自动解析文件扩展名（`.js`、`.vue`、`.ts` 等）
- **项目根目录检测**：通过查找 `package.json` 自动识别项目根目录
- **性能优化**：缓存项目根路径以加快导航速度

## 使用方法

1. 在 VS Code 设置中配置路径别名
2. 按住 `Ctrl`（macOS 上为 `Cmd`）并点击别名路径
3. 编辑器将跳转到目标文件

### 示例

```javascript
// 配置别名为 { "@": "/src" }
import Button from '@/components/Button'  // Ctrl+Click 跳转
import { utils } from '@/utils'           // Ctrl+Click 跳转
```

## 扩展设置

此扩展提供以下设置：

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `alias-jump.mappings` | object | `{ "@": "/src" }` | 路径映射。键为别名，值为相对于项目根目录的路径。 |
| `alias-jump.rootpath` | string | `"package.json"` | 用于识别项目根目录的文件名。 |
| `alias-jump.allowedsuffix` | array | `["js", "vue", "jsx", "ts", "tsx", "svelte"]` | 自动补全支持的文件扩展名。 |

### 配置示例

添加到你的 `settings.json`：

```json
{
  "alias-jump.mappings": {
    "@": "/src",
    "@components": "/src/components",
    "@utils": "/src/utils",
    "@assets": "/src/assets"
  },
  "alias-jump.allowedsuffix": ["js", "vue", "jsx", "ts", "tsx", "svelte"]
}
```

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

## 许可证

MIT