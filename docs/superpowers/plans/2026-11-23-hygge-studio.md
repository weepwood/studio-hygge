# Hygge Studio 实现计划

> **面向 AI 代理的工作者：** 本计划在当前仓库内联执行。

**目标：** 将 Studio 改成只提供 Topo、Blocks、Marble 的 Hygge 风格个人创作工作台。

**架构：** 保留三个现有生成器、路径路由、参数存储、保存作品和导出能力。精简工具注册表与入口页，并在共享 UI 层用暖色设计令牌更新导航、控制面板、画布舞台和弹层。

**技术栈：** Vite、React、TypeScript、Tailwind CSS v4、React Router。

---

## 文件职责

- `src/tools/registry.ts`：仅注册 Topo、Blocks、Marble。
- `src/tools/home/index.tsx`：三效果入口及预览。
- `src/index.css`：Hygge 色板、字体、纹理、画布舞台、圆角与阴影令牌。
- `src/components/app-shell.tsx`：应用标题与共享外壳。
- `src/components/tool-switcher.tsx`：精简的暖色工具导航。
- `src/components/canvas-area.tsx`：画布周边暖色舞台。
- `src/components/sidebar.tsx`、`saved-designs-panel.tsx`、`ui/button.tsx`、`ui/select.tsx`、`ui/switch.tsx`：共享交互组件的浅色状态。
- `src/tools/topo/index.tsx`、`src/tools/blocks/index.tsx`：默认预览配色和随机配色适配暖色主题。

## 实施步骤

- [ ] 精简工具注册表到 topo、blocks、marble，并保留根路径入口。
- [ ] 用 `topo.jpg`、`blocks.jpg`、`marble.jpg` 建立暖色效果选择首页。
- [ ] 替换深色令牌并加入低对比纹理、暖色分隔线、柔和焦点态和适配窄屏的间距。
- [ ] 将工具导航改为暖色浅面板，移除 About 入口并修正活动态和移动端选择器。
- [ ] 更新画布、控制面板、按钮、开关、选择器、保存作品面板中的深色专用颜色。
- [ ] 将 Topo 和 Blocks 默认/随机背景调整为暖白与自然配色；Marble 继续沿用已有生成器设置。
- [ ] 静态检查改动差异与引用，避免运行仓库测试或构建命令。
