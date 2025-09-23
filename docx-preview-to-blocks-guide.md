# docx-preview 文档数据到 Editor.js Blocks 转换指南

## 概述

本文档详细说明了如何将 `docx-preview` 库解析得到的 document JSON 数据转换为 Editor.js 的 blocks 格式，包括各种元素类型、文本内容和样式信息的处理。

## 1. 文档结构解析流程

### 1.1 入口点

```typescript
// 使用 docx-preview 的 parseAsync 方法解析 docx 文件
const document = await parseAsync(arrayBuffer, {
  renderComments: true,
  experimental: false,
  trimXmlDeclaration: true
});

// 核心数据位于 document.documentPart.body.children
const bodyChildren = document.documentPart.body.children;
```

### 1.2 文档结构

```
document
├── documentPart
│   ├── body
│   │   └── children[]  // 主要内容数组
│   ├── styles          // 样式定义
│   └── numbering       // 编号定义
├── commentsPart        // 批注信息
└── other parts...
```

## 2. 元素类型映射与递归处理

### 2.1 递归结构特点

**重要**: `document.documentPart.body.children` 下的每个元素都可能包含 `children` 属性，形成递归的树形结构。处理时需要递归遍历所有子元素。

```typescript
// 递归处理示例
function processElement(element: any): void {
  // 处理当前元素
  handleCurrentElement(element);
  
  // 递归处理子元素
  if (element.children && Array.isArray(element.children)) {
    element.children.forEach(child => processElement(child));
  }
}
```

### 2.2 元素类型分类（HTML渲染参考）

根据元素的功能和渲染特点，可以将所有类型归类为以下几类：

#### 文本类元素
- **类型**: `paragraph`, `run`, `text`, `tab`, `br`, `symbol`
- **HTML映射**: `<p>`, `<span>`, `<br>`
- **特点**: 主要承载文本内容和基础格式

#### 结构类元素
- **类型**: `table`, `tr`, `td`, `list`, `listItem`, `heading`
- **HTML映射**: `<table>`, `<ul>`, `<ol>`, `<h1-6>`
- **特点**: 定义文档的结构和层次

#### 对象类元素
- **类型**: `image`, `drawing`, `shape`, `textbox`, `chart`
- **HTML映射**: `<img>`, `<div>`, `<canvas>`
- **特点**: 嵌入的媒体和图形对象

#### 辅助类元素
- **类型**: `bookmark`, `field`, `comment`, `footnote`
- **HTML映射**: `<a name>`, `<sup>`, `<span class="comment">`
- **特点**: 提供额外的功能和引用

#### 分隔类元素
- **类型**: `pageBreak`, `sectionBreak`
- **HTML映射**: `<hr>`, `<div class="page-break">`
- **特点**: 控制文档的分页和分节

### 2.3 Editor.js 块类型映射

| docx-preview 类型 | 分类 | Editor.js 块类型 | 处理方法 |
|------------------|------|-----------------|----------|
| `paragraph` | 文本类 | `paragraph` | `createParagraphBlock()` |
| `heading`/`title` | 结构类 | `header` | `createHeaderBlock()` |
| `table` | 结构类 | `table` | `createTableBlock()` |
| `list`/`numbering` | 结构类 | `list` | `createListBlock()` |
| `image`/`picture` | 对象类 | `image` | `createImageBlock()` |
| `run`/`text` | 文本类 | 合并到父段落 | 递归处理 |
| `br` | 文本类 | 换行符 | 文本内处理 |
| `pageBreak` | 分隔类 | `delimiter` | `createDelimiterBlock()` |
| 未知类型 | - | `paragraph` | 默认作为段落处理 |

### 2.2 类型判断逻辑

```typescript
switch (element.type) {
  case 'paragraph':
    return this.createParagraphBlock(element, index);
  case 'table':
    return this.createTableBlock(element, index);
  case 'heading':
  case 'title':
    return this.createHeaderBlock(element, index);
  case 'list':
  case 'numbering':
    return this.createListBlock(element, index);
  case 'image':
  case 'picture':
    return this.createImageBlock(element, index);
  default:
    // 未知类型作为段落处理
    return this.createParagraphBlock(element, index);
}
```

## 3. 文本内容提取

### 3.1 文本提取策略

文本内容可能存在于多个位置，按优先级顺序：

1. **直接文本属性**: `element.text`
2. **子元素递归**: `element.children[]`
3. **文本运行**: `element.runs[]`

### 3.2 递归文本提取实现

```typescript
private extractTextFromElement(element: any): string {
  if (!element) return '';
  
  let text = '';
  
  // 1. 直接文本属性
  if (element.text) {
    text += element.text;
  }
  
  // 2. 处理特殊文本元素
  switch (element.type) {
    case 'tab':
      text += '\t';
      break;
    case 'br':
      text += '\n';
      break;
    case 'symbol':
      text += element.char || '';
      break;
  }
  
  // 3. 递归提取子元素文本（重要：处理嵌套结构）
  if (element.children && Array.isArray(element.children)) {
    text += element.children
      .map((child: any) => this.extractTextFromElement(child))
      .join('');
  }
  
  // 4. 提取文本运行
  if (element.runs && Array.isArray(element.runs)) {
    text += element.runs
      .map((run: any) => {
        // 递归处理run中的子元素
        if (run.children) {
          return this.extractTextFromElement(run);
        }
        return run.text || '';
      })
      .join('');
  }
  
  return text;
}
```

## 4. 样式信息提取

### 4.1 样式来源

样式信息可以从多个来源获取：

1. **CSS 样式字符串**: `element.cssStyle`
2. **行间距**: `element.lineSpacing`
3. **字符属性**: `element.runProps`
4. **段落属性**: `element.paragraphProperties`
5. **字符属性**: `element.characterProperties` / `element.runProperties`

### 4.2 样式提取实现

```typescript
private extractStylesFromElement(element: any): any {
  const styles: any = {};
  
  if (!element) return styles;
  
  // 1. 从 cssStyle 中提取样式
  if (element.cssStyle) {
    this.parseCssStyleString(element.cssStyle, styles);
  }
  
  // 2. 从 lineSpacing 中提取行间距
  if (element.lineSpacing) {
    if (typeof element.lineSpacing === 'number') {
      styles.lineHeight = element.lineSpacing;
    } else if (element.lineSpacing.line) {
      styles.lineHeight = element.lineSpacing.line;
    }
  }
  
  // 3. 从 runProps 中提取字符属性
  if (element.runProps) {
    this.extractRunProperties(element.runProps, styles);
  }
  
  // 4. 从 paragraphProperties 中提取段落属性
  if (element.paragraphProperties) {
    this.extractParagraphProperties(element.paragraphProperties, styles);
  }
  
  // 5. 从 characterProperties/runProperties 中提取字符属性
  if (element.characterProperties || element.runProperties) {
    this.extractCharacterProperties(element.characterProperties || element.runProperties, styles);
  }
  
  return styles;
}
```

### 4.3 CSS 样式字符串解析

```typescript
private parseCssStyleString(cssStyle: string, styles: any): void {
  if (!cssStyle || typeof cssStyle !== 'string') return;
  
  const declarations = cssStyle.split(';').filter(decl => decl.trim());
  
  declarations.forEach(declaration => {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value) {
      // 转换 CSS 属性名为 camelCase
      const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styles[camelCaseProperty] = value;
    }
  });
}
```

### 4.4 runProps 字符属性提取

```typescript
private extractRunProperties(runProps: any, styles: any): void {
  if (!runProps) return;
  
  // 字体族
  if (runProps.fontFamily || runProps.rFonts) {
    const fontFamily = runProps.fontFamily || runProps.rFonts?.ascii || runProps.rFonts?.eastAsia;
    if (fontFamily) {
      styles.fontFamily = this.mapChineseFontName(fontFamily);
    }
  }
  
  // 字号 (Word 中的字号需要除以 2)
  if (runProps.fontSize || runProps.sz) {
    const fontSize = runProps.fontSize || runProps.sz;
    styles.fontSize = typeof fontSize === 'number' ? `${fontSize / 2}pt` : fontSize;
  }
  
  // 颜色
  if (runProps.color) {
    styles.color = runProps.color.startsWith('#') ? runProps.color : `#${runProps.color}`;
  }
  
  // 粗体
  if (runProps.bold || runProps.b) {
    styles.fontWeight = 'bold';
  }
  
  // 斜体
  if (runProps.italic || runProps.i) {
    styles.fontStyle = 'italic';
  }
  
  // 下划线
  if (runProps.underline || runProps.u) {
    styles.textDecoration = 'underline';
  }
  
  // 删除线
  if (runProps.strike) {
    styles.textDecoration = styles.textDecoration ? `${styles.textDecoration} line-through` : 'line-through';
  }
}
```

## 5. 具体块类型处理

### 5.1 段落块 (Paragraph)

```typescript
private createParagraphBlock(element: any, index: number): any {
  const text = this.extractTextFromElement(element);
  const styles = this.extractStylesFromElement(element);
  
  return {
    id: `paragraph_${Date.now()}_${index}`,
    type: 'paragraph',
    data: {
      text: text || '',
      styles: styles
    }
  };
}
```

### 5.2 标题块 (Header)

```typescript
private createHeaderBlock(element: any, index: number): any {
  const text = this.extractTextFromElement(element);
  const styles = this.extractStylesFromElement(element);
  const level = this.extractHeaderLevel(element);
  
  return {
    id: `header_${Date.now()}_${index}`,
    type: 'header',
    data: {
      text: text || '',
      level: level,
      styles: styles
    }
  };
}
```

### 5.3 表格块 (Table)

```typescript
private createTableBlock(element: any, index: number): any {
  const tableData = this.extractTableData(element);
  const styles = this.extractStylesFromElement(element);
  
  return {
    id: `table_${Date.now()}_${index}`,
    type: 'table',
    data: {
      withHeadings: tableData.withHeadings,
      content: tableData.content,
      styles: styles
    }
  };
}
```

### 5.4 列表块 (List)

```typescript
private createListBlock(element: any, index: number): any {
  const listData = this.extractListData(element);
  const styles = this.extractStylesFromElement(element);
  
  return {
    id: `list_${Date.now()}_${index}`,
    type: 'list',
    data: {
      style: listData.style, // 'ordered' 或 'unordered'
      items: listData.items,
      styles: styles
    }
  };
}
```

### 5.5 图片块 (Image)

```typescript
private createImageBlock(element: any, index: number): any {
  const imageData = this.extractImageData(element);
  const styles = this.extractStylesFromElement(element);
  
  return {
    id: `image_${Date.now()}_${index}`,
    type: 'image',
    data: {
      file: {
        url: imageData.url,
        name: imageData.name || 'image'
      },
      caption: imageData.caption || '',
      withBorder: false,
      withBackground: false,
      stretched: false,
      styles: styles
    }
  };
}
```

## 6. 完整转换流程

### 6.1 递归文档结构解析

```typescript
private parseDocumentStructure(document: any): any[] {
  const blocks: any[] = [];
  
  try {
    // 检查文档结构
    if (!document?.documentPart?.body?.children) {
      console.warn('文档结构不完整，缺少documentPart.body.children');
      return blocks;
    }
    
    const bodyChildren = document.documentPart.body.children;
    console.log('文档body子元素数量:', bodyChildren.length);
    
    // 递归处理每个子元素
    this.processElementsRecursively(bodyChildren, blocks);
    
    console.log('成功解析的块数量:', blocks.length);
    return blocks;
    
  } catch (error) {
    console.error('解析文档结构时出错:', error);
    return blocks;
  }
}

/**
 * 递归处理元素数组
 */
private processElementsRecursively(elements: any[], blocks: any[], depth: number = 0): void {
  if (!elements || !Array.isArray(elements)) return;
  
  elements.forEach((element, index) => {
    console.log(`${'  '.repeat(depth)}处理第${index}个元素:`, element.type || 'unknown');
    
    // 根据元素类型分类处理
    const elementCategory = this.categorizeElement(element);
    
    switch (elementCategory) {
      case 'block': // 块级元素，创建独立的编辑器块
        const block = this.createBlockFromDocumentElement(element, blocks.length);
        if (block) {
          blocks.push(block);
        }
        break;
        
      case 'inline': // 内联元素，合并到当前块
        this.mergeInlineElement(element, blocks);
        break;
        
      case 'container': // 容器元素，递归处理子元素
        if (element.children) {
          this.processElementsRecursively(element.children, blocks, depth + 1);
        }
        break;
        
      case 'ignore': // 忽略的元素类型
        console.log(`忽略元素类型: ${element.type}`);
        break;
    }
    
    // 递归处理子元素（如果还有的话）
    if (element.children && elementCategory !== 'container') {
      this.processElementsRecursively(element.children, blocks, depth + 1);
    }
  });
}

/**
 * 元素分类
 */
private categorizeElement(element: any): 'block' | 'inline' | 'container' | 'ignore' {
  if (!element.type) return 'ignore';
  
  const blockTypes = ['paragraph', 'heading', 'title', 'table', 'list', 'image', 'pageBreak'];
  const inlineTypes = ['run', 'text', 'tab', 'br', 'symbol'];
  const containerTypes = ['body', 'section', 'div'];
  const ignoreTypes = ['bookmark', 'field', 'comment', 'footnote'];
  
  if (blockTypes.includes(element.type)) return 'block';
  if (inlineTypes.includes(element.type)) return 'inline';
  if (containerTypes.includes(element.type)) return 'container';
  if (ignoreTypes.includes(element.type)) return 'ignore';
  
  // 默认作为块级元素处理
  return 'block';
}

/**
 * 合并内联元素到最后一个块
 */
private mergeInlineElement(element: any, blocks: any[]): void {
  if (blocks.length === 0) {
    // 如果没有块，创建一个新的段落块
    const newBlock = {
      id: `paragraph_${Date.now()}`,
      type: 'paragraph',
      data: {
        text: this.extractTextFromElement(element),
        styles: this.extractStylesFromElement(element)
      }
    };
    blocks.push(newBlock);
  } else {
    // 合并到最后一个块
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock.type === 'paragraph') {
      const additionalText = this.extractTextFromElement(element);
      lastBlock.data.text += additionalText;
      
      // 合并样式
      const additionalStyles = this.extractStylesFromElement(element);
      Object.assign(lastBlock.data.styles, additionalStyles);
    }
  }
}
```

### 6.2 导入流程

```typescript
async import(file: File): Promise<EditorData> {
  // 1. 读取文件
  const arrayBuffer = await file.arrayBuffer();
  
  // 2. 解析文档
  const document = await parseAsync(arrayBuffer, {
    renderComments: true,
    experimental: false,
    trimXmlDeclaration: true
  });
  
  // 3. 转换为编辑器块
  const editorBlocks = this.parseDocumentStructure(document);
  
  // 4. 创建编辑器数据
  const editorData: EditorData = {
    time: Date.now(),
    blocks: editorBlocks,
    version: '2.28.2'
  };
  
  // 5. 处理批注
  const comments = extractCommentsFromDocument(document);
  this.associateCommentsWithBlocks(editorData, comments);
  
  return editorData;
}
```

## 7. 调试和日志

### 7.1 调试信息

在转换过程中，系统会输出详细的调试信息：

```typescript
console.log('提取样式的元素结构:', {
  type: element.type,
  cssStyle: element.cssStyle,
  lineSpacing: element.lineSpacing,
  runProps: element.runProps,
  paragraphProperties: element.paragraphProperties,
  characterProperties: element.characterProperties
});
```

### 7.2 常见问题排查

1. **元素类型未识别**: 检查 `element.type` 的值
2. **文本提取失败**: 检查 `element.text`、`element.children`、`element.runs`
3. **样式丢失**: 检查各个样式来源是否存在
4. **字体映射问题**: 检查中文字体名称映射

## 8. 扩展和优化

### 8.1 支持新的元素类型

要支持新的元素类型，需要：

1. 在 `createBlockFromDocumentElement` 中添加新的 case
2. 实现对应的 `createXxxBlock` 方法
3. 实现对应的数据提取方法

### 8.2 样式处理优化

1. **缓存样式映射**: 避免重复计算
2. **样式继承**: 处理父子元素样式继承
3. **样式合并**: 合并多个来源的样式

### 8.3 性能优化

1. **批量处理**: 减少 DOM 操作
2. **异步处理**: 大文档分批处理
3. **内存管理**: 及时清理临时对象

## 9. 总结

通过以上流程，可以将 `docx-preview` 解析的 document JSON 数据完整地转换为 Editor.js 的 blocks 格式，保留原文档的结构、内容和样式信息。关键点包括：

1. **结构化解析**: 直接从 `document.documentPart.body.children` 获取元素
2. **类型映射**: 将 docx 元素类型映射到 Editor.js 块类型
3. **文本提取**: 从多个可能的位置提取文本内容
4. **样式处理**: 从多个来源提取和合并样式信息
5. **错误处理**: 提供回退机制和详细的调试信息

这种方法相比传统的 HTML 渲染方式更加高效和准确，能够更好地保持原文档的格式和样式。