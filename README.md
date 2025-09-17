# Docly - 在线文档编辑器

Docly 是一款基于 Vue 3 + Vite 的现代化在线文档编辑器，专注于 Word 文件的编辑、导入导出与批注功能。

## 特性

- 🚀 基于 Vue 3 + Vite 的现代化架构
- 📝 强大的富文本编辑功能（基于 Editor.js）
- 📄 支持 Word 文档导入导出
- 💬 批注功能支持
- 🔌 插件化架构，易于扩展
- 📱 响应式设计，支持多设备
- 💾 实时保存与状态管理

## 技术栈

- **前端框架**: Vue 3 + Vite
- **编辑器**: Editor.js
- **状态管理**: Pinia
- **UI 组件**: Naive UI
- **文件处理**: Mammoth.js (Word导入) + docxtemplater (Word导出)
- **类型支持**: TypeScript

## 项目结构

```
src/
├── components/          # Vue 组件
│   └── DoclyEditor.vue  # 主编辑器组件
├── core/               # 编辑器核心
│   └── EditorCore.ts   # 编辑器核心类
├── plugins/            # 插件系统
│   └── PluginManager.ts # 插件管理器
├── fileHandlers/       # 文件处理
│   └── WordHandler.ts  # Word文件处理器
├── stores/             # 状态管理
│   └── editorStore.ts  # 编辑器状态
├── types/              # TypeScript类型定义
│   └── index.ts        # 类型定义文件
└── utils/              # 工具函数
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 许可证

本项目采用 Apache License 2.0 许可证 - 详见 [LICENSE](LICENSE) 文件。
