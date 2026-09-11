# Alias Jump Pro

[English](./README.md)

VS Code 路径跳转扩展：按住 `Ctrl`（macOS 为 `Cmd`）点击别名或相对路径，即可打开目标文件。

## 使用

直接在项目里使用别名即可：

```ts
import Button from '@/components/Button'
import { formatDate } from '@/utils/date'
```

也支持 `./`、`../` 等相对路径。将鼠标悬停在路径上，可查看它最终指向的位置。

### 自动识别

无需额外配置。扩展会自动读取以下位置的别名：

- VS Code 设置
- Vite
- Webpack
- `tsconfig.json`
- `jsconfig.json`

如果没有找到配置，则默认将 `@` 解析为 `src`。

支持：

- Vue
- JavaScript
- TypeScript
- CSS、SCSS、Less
- Svelte
- uni-app

## 手动配置

如需覆盖自动识别，在 VS Code `settings.json` 中添加：

```json
{
  "alias-jump-pro.mappings": {
    "@": "src",
    "@components": "src/components"
  }
}
```

可选设置：

- `alias-jump-pro.rootpath`：项目根目录标记，默认 `package.json`。
- `alias-jump-pro.allowedsuffix`：无扩展名路径的尝试后缀。

## 命令

`Alias Jump Pro: Reload Configuration`：重新读取配置。

## 许可证

MIT
