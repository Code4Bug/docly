# Docly - 在线文档编辑器

Docly 是一款基于 Vue 3 + Vite 的现代化在线文档编辑器，专注于 Word 文件的编辑、导入导出与高级文本处理功能。

## 核心特性

- 基于 Vue 3 + Vite 的现代化架构
- 强大的富文本编辑功能（基于 Editor.js）
- 完整的 Word 文档导入导出支持
- 高级文本分析与样式保持功能
- 智能字体处理（支持楷体、仿宋等中文字体）
- 插件化架构，易于扩展
- 响应式设计，支持多设备
- 实时保存与状态管理
- 文档预览功能
- 批注系统支持

## 技术栈

- **前端框架**: Vue 3.5+ + Vite 5.4+
- **编辑器核心**: Editor.js 2.31+
- **状态管理**: Pinia 3.0+
- **UI 组件库**: Naive UI 2.43+
- **文件处理**: docxtemplater 3.66+ (Word导出) + docx-preview 0.3+ (Word预览)
- **工具库**: @vueuse/core 13.9+ (Vue组合式工具)
- **类型支持**: TypeScript
- **构建工具**: Vite + @vitejs/plugin-vue

## 项目结构

```
src/
├── components/          # Vue 组件
│   ├── DoclyEditor.vue  # 主编辑器组件
│   └── HelloWorld.vue   # 示例组件
├── core/               # 编辑器核心
│   └── EditorCore.ts   # 编辑器核心类，提供完整的编辑器功能
├── plugins/            # 插件系统
│   └── PluginManager.ts # 插件管理器，支持动态加载和管理插件
├── fileHandlers/       # 文件处理模块
│   └── WordHandler.ts  # Word文件处理器，支持导入导出和预览
├── stores/             # 状态管理
│   └── editorStore.ts  # 编辑器状态管理，基于 Pinia
├── types/              # TypeScript类型定义
│   └── index.ts        # 完整的类型定义文件
├── utils/              # 工具函数
│   └── TextAnalyzer.ts # 文本分析工具，支持样式提取和字体处理
├── assets/             # 静态资源
│   ├── css/            # 样式文件
│   ├── fonts/          # 字体文件
│   ├── favicon.ico     # 网站图标
│   └── logo.png        # 项目Logo
├── App.vue             # 根组件
└── main.js             # 应用入口文件
```

## 快速开始

### 环境要求

- Node.js 16.0+ 
- npm 7.0+ 或 yarn 1.22+

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 核心功能使用

### 编辑器初始化

```javascript
import { EditorCore } from './core/EditorCore'

const editor = new EditorCore({
  holder: 'editor-container',
  plugins: [
    { name: 'header', enabled: true },
    { name: 'paragraph', enabled: true },
    { name: 'list', enabled: true }
  ]
})

await editor.init()
```

### Word 文档处理

```javascript
import { WordHandler } from './fileHandlers/WordHandler'

const wordHandler = new WordHandler()

// 导入 Word 文档
const fileInput = document.querySelector('#file-input')
const file = fileInput.files[0]
const editorData = await wordHandler.import(file)

// 导出为 Word 文档
const exportedFile = await wordHandler.export(editorData)
```

### 文本分析

```javascript
import { TextAnalyzer } from './utils/TextAnalyzer'

const analyzer = new TextAnalyzer()

// 分析文本样式
const styles = analyzer.extractStyles(element)

// 处理字体信息
const fontInfo = analyzer.processFontFamily(styles.fontFamily)
```

## API 文档

### EditorCore

编辑器核心类，提供完整的编辑器功能。

#### 方法

- `init()`: 初始化编辑器
- `save()`: 保存编辑器数据
- `render(data)`: 渲染编辑器数据
- `destroy()`: 销毁编辑器实例
- `insertBlock(type, data)`: 插入新块
- `getCurrentBlock()`: 获取当前块

### WordHandler

Word 文档处理器，支持导入导出和预览。

#### 方法

- `import(file)`: 导入 Word 文档
- `export(data)`: 导出为 Word 文档
- `preview(data)`: 生成预览

### PluginManager

插件管理器，支持动态加载和管理插件。

#### 方法

- `registerPlugin(plugin)`: 注册插件
- `loadPlugin(name, config)`: 加载插件
- `unloadPlugin(name)`: 卸载插件
- `getPlugin(name)`: 获取插件实例

## 开发指南

### 开发环境设置

1. 克隆项目
```bash
git clone <repository-url>
cd Docly
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

### 项目架构

Docly 采用模块化架构设计：

- **核心层 (Core)**: 提供编辑器基础功能
- **插件层 (Plugins)**: 可扩展的插件系统
- **处理层 (Handlers)**: 文件处理和格式转换
- **工具层 (Utils)**: 通用工具和辅助函数
- **界面层 (Components)**: Vue 组件和用户界面

### 添加新功能

1. **添加新的编辑器插件**
```javascript
// 在 plugins/ 目录下创建新插件
export class MyPlugin implements EditorPlugin {
  name = 'my-plugin'
  
  init(editor: EditorInstance): void {
    // 插件初始化逻辑
  }
}
```

2. **扩展文件处理器**
```javascript
// 在 fileHandlers/ 目录下扩展处理器
export class MyFileHandler implements FileHandler {
  async import(file: File): Promise<EditorData> {
    // 文件导入逻辑
  }
  
  async export(data: EditorData): Promise<File> {
    // 文件导出逻辑
  }
}
```

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 Vue 3 Composition API 最佳实践
- 为所有公共方法添加 JSDoc 注释
- 使用 ESLint 和 Prettier 保持代码风格一致

### 测试

```bash
# 运行单元测试
npm run test

# 运行端到端测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

### 构建和部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 分析构建包大小
npm run analyze
```

## 贡献指南

我们欢迎所有形式的贡献！请遵循以下步骤：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 常见问题

### Q: 如何添加自定义字体支持？

A: 在 `src/assets/fonts/` 目录下添加字体文件，然后在 `src/assets/css/fonts.css` 中定义字体样式。

### Q: 如何扩展 Word 文档的导入支持？

A: 修改 `src/fileHandlers/WordHandler.ts` 中的 `htmlToEditorData` 方法，添加对新元素类型的处理逻辑。

### Q: 如何自定义编辑器工具栏？

A: 在 `EditorCore` 初始化时配置 `plugins` 参数，启用或禁用特定的编辑器工具。

## 许可证

本项目采用 Apache License 2.0 许可证 - 详见 [LICENSE](LICENSE) 文件。
