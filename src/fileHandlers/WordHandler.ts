import { renderAsync, parseAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import type { FileHandler, EditorData, Comment, CommentRange } from '../types';
import { TextAnalyzer } from '../utils/TextAnalyzer';
import { extractCommentsFromDocument } from './WordHandlerComments';

/**
 * Word文件处理器
 * 负责Word文件的导入和导出
 */
export class WordHandler implements FileHandler {
  
  /**
   * 将元素按段落分割成多个Block
   * 处理元素内包含的多个段落（通过换行符或<br>标签分割）
   */
  private splitElementIntoParagraphs(element: Element, index: number): any[] {
    const blocks: any[] = [];
    const htmlContent = element.innerHTML || '';
    const textContent = element.textContent?.trim() || '';
    
    // 如果没有内容，返回空数组
    if (!textContent) {
      return blocks;
    }
    
    // 检查是否包含<br>标签或换行符
    const hasBrTags = htmlContent.includes('<br>') || htmlContent.includes('<br/>') || htmlContent.includes('<br />');
    const hasNewlines = textContent.includes('\n');
    
    if (hasBrTags || hasNewlines) {
      // 分割HTML内容
      let parts: string[] = [];
      
      if (hasBrTags) {
        // 按<br>标签分割
        parts = htmlContent.split(/<br\s*\/?>/i);
      } else {
        // 按换行符分割纯文本
        parts = textContent.split('\n');
      }
      
      // 为每个非空部分创建一个段落块
      parts.forEach((part, partIndex) => {
        const trimmedPart = part.trim();
        if (trimmedPart) {
          // 如果是HTML内容，需要清理可能的HTML标签
          const cleanText = hasBrTags ? this.cleanHtmlText(trimmedPart) : trimmedPart;
          
          if (cleanText) {
            const block = {
              id: `paragraph_${Date.now()}_${index}_${partIndex}`,
              type: 'paragraph',
              data: {
                text: cleanText,
                styles: this.extractElementStyles(element)
              }
            };
            console.log('创建分割段落块:', block);
            blocks.push(block);
          }
        }
      });
    } else {
      // 没有分割标记，创建单个段落块
      const block = {
        id: `paragraph_${Date.now()}_${index}`,
        type: 'paragraph',
        data: {
          text: this.extractStyledText(element),
          styles: this.extractElementStyles(element)
        }
      };
      console.log('创建单个段落块:', block);
      blocks.push(block);
    }
    
    return blocks;
  }

  /**
   * 将纯文本按段落分割
   * 通过双换行符或单换行符分割文本
   */
  private splitTextIntoParagraphs(text: string): string[] {
    // 首先尝试按双换行符分割（标准段落分隔）
    let paragraphs = text.split(/\n\s*\n/);
    
    // 如果没有双换行符，按单换行符分割
    if (paragraphs.length === 1) {
      paragraphs = text.split('\n');
    }
    
    // 过滤空段落并清理空白字符
    return paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * 清理HTML文本，移除多余的标签但保留基本格式
   */
  private cleanHtmlText(htmlText: string): string {
    // 创建临时元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    
    // 获取纯文本内容
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    return textContent.trim();
  }

  /**
   * 解析文档结构，遍历document.documentPart.body.children
   * 为每个type类型创建独立的编辑器块，支持递归处理嵌套结构
   */
  private parseDocumentStructure(document: any): any[] {
    const blocks: any[] = [];
    
    try {
      // 检查文档结构是否存在
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
      
      // 根据元素类型分类处理
      const elementCategory = this.categorizeElement(element);
      
      
      switch (elementCategory) {
        case 'block': // 块级元素，创建独立的编辑器块
          const block = this.createBlockFromDocumentElement(element, blocks.length);
          if (block) {
            blocks.push(block);
          }
          // 注意：块级元素已经在createBlockFromDocumentElement中处理了子元素，不需要再递归
          break;
          
        case 'inline': // 内联元素，合并到当前块
          this.mergeInlineElement(element, blocks);
          // 内联元素的子元素也需要递归处理
          if (element.children) {
            this.processElementsRecursively(element.children, blocks, depth + 1);
          }
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

  /**
   * 根据文档元素创建编辑器块
   * 将docx文档元素类型映射到editor.js块类型
   */
  private createBlockFromDocumentElement(element: any, index: number): any | null {
    if (!element || !element.type) {
      console.warn('元素缺少type属性:', element);
      return null;
    }
    
    const elementType = element.type;
    
    switch (elementType) {
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
        console.log(`未知元素类型: ${elementType}，尝试作为段落处理`);
        return this.createParagraphBlock(element, index);
    }
  }

  /**
   * 创建段落块
   */
  private createParagraphBlock(element: any, index: number): any {
    const text = this.extractTextFromElement(element);
    const styles = this.extractStylesFromElement(element);
    
    const block = {
      id: `paragraph_${Date.now()}_${index}`,
      type: 'paragraph',
      data: {
        text: text || '',
        styles: styles
      }
    };
    
    return block;
  }

  /**
   * 创建标题块
   */
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

  /**
   * 创建表格块
   */
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

  /**
   * 创建列表块
   */
  private createListBlock(element: any, index: number): any {
    const listData = this.extractListData(element);
    const styles = this.extractStylesFromElement(element);
    
    return {
      id: `list_${Date.now()}_${index}`,
      type: 'list',
      data: {
        style: listData.style,
        items: listData.items,
        styles: styles
      }
    };
  }

  /**
   * 创建图片块
   */
  private createImageBlock(element: any, index: number): any {
    const imageData = this.extractImageData(element);
    const styles = this.extractStylesFromElement(element);
    
    return {
      id: `image_${Date.now()}_${index}`,
      type: 'image',
      data: {
        file: imageData.file,
        caption: imageData.caption,
        withBorder: imageData.withBorder,
        withBackground: imageData.withBackground,
        stretched: imageData.stretched,
        styles: styles
      }
    };
  }

  /**
   * 从文档元素中提取文本内容
   */
  /**
   * 从元素中提取文本内容，支持递归处理嵌套结构和特殊文本元素
   */
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

  /**
   * 从文档元素中提取样式信息
   * 支持从cssStyle、lineSpacing、runProps等多个来源获取样式
   */
  private extractStylesFromElement(element: any): any {
    const styles: any = {};
    
    if (!element) return styles;
    
    // 1. 从cssStyle中提取样式
    if (element.cssStyle) {
      this.parseCssStyleString(element.cssStyle, styles);
    }
    
    // 2. 从lineSpacing中提取行间距
    if (element.lineSpacing) {
      if (typeof element.lineSpacing === 'number') {
        styles.lineHeight = element.lineSpacing;
      } else if (element.lineSpacing.line) {
        styles.lineHeight = element.lineSpacing.line;
      }
    }
    
    // 3. 从runProps中提取字符属性
    if (element.runProps) {
      this.extractRunProperties(element.runProps, styles);
    }
    
    // 4. 提取段落属性（保持原有逻辑）
    if (element.paragraphProperties) {
      const pPr = element.paragraphProperties;
      
      // 对齐方式
      if (pPr.alignment) {
        styles.textAlign = pPr.alignment;
      }
      
      // 缩进
      if (pPr.indent) {
        if (pPr.indent.left) styles.marginLeft = `${pPr.indent.left}px`;
        if (pPr.indent.right) styles.marginRight = `${pPr.indent.right}px`;
        if (pPr.indent.firstLine) styles.textIndent = `${pPr.indent.firstLine}px`;
      }
      
      // 间距
      if (pPr.spacing) {
        if (pPr.spacing.before) styles.marginTop = `${pPr.spacing.before}px`;
        if (pPr.spacing.after) styles.marginBottom = `${pPr.spacing.after}px`;
        if (pPr.spacing.line) styles.lineHeight = pPr.spacing.line;
      }
    }
    
    // 5. 提取字符属性（保持原有逻辑）
    if (element.characterProperties || element.runProperties) {
      const rPr = element.characterProperties || element.runProperties;
      
      // 字体
      if (rPr.fontFamily) {
        styles.fontFamily = this.mapChineseFontName(rPr.fontFamily);
      }
      
      // 字号
      if (rPr.fontSize) {
        styles.fontSize = `${rPr.fontSize}pt`;
      }
      
      // 颜色
      if (rPr.color) {
        styles.color = rPr.color;
      }
      
      // 粗体
      if (rPr.bold) {
        styles.fontWeight = 'bold';
      }
      
      // 斜体
      if (rPr.italic) {
        styles.fontStyle = 'italic';
      }
      
      // 下划线
      if (rPr.underline) {
        styles.textDecoration = 'underline';
      }
    }
    
    return styles;
  }
  
  /**
   * 解析CSS样式字符串
   */
  private parseCssStyleString(cssStyle: string, styles: any): void {
    if (!cssStyle || typeof cssStyle !== 'string') return;
    
    // 分割CSS样式字符串
    const declarations = cssStyle.split(';').filter(decl => decl.trim());
    
    declarations.forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        // 转换CSS属性名为camelCase
        const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        
        // 特殊处理字体族
        if (camelCaseProperty === 'fontFamily') {
          styles[camelCaseProperty] = this.mapChineseFontName(value);
        } else {
          styles[camelCaseProperty] = value;
        }
      }
    });
  }
  
  /**
   * 从runProps中提取字符属性
   */
  private extractRunProperties(runProps: any, styles: any): void {
    if (!runProps) return;
    
    // 字体族
    if (runProps.fontFamily || runProps.rFonts) {
      const fontFamily = runProps.fontFamily || runProps.rFonts?.ascii || runProps.rFonts?.eastAsia;
      if (fontFamily) {
        styles.fontFamily = this.mapChineseFontName(fontFamily);
      }
    }
    
    // 字号
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

  /**
   * 提取标题级别
   */
  private extractHeaderLevel(element: any): number {
    // 从样式名称中提取级别
    if (element.styleName) {
      const match = element.styleName.match(/heading\s*(\d+)/i) || element.styleName.match(/标题\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    // 从段落属性中提取
    if (element.paragraphProperties?.outlineLevel) {
      return element.paragraphProperties.outlineLevel + 1;
    }
    
    // 默认为1级标题
    return 1;
  }

  /**
   * 提取表格数据
   */
  private extractTableData(element: any): any {
    const content: string[][] = [];
    let withHeadings = false;
    
    if (element.rows && Array.isArray(element.rows)) {
      element.rows.forEach((row: any, rowIndex: number) => {
        const rowData: string[] = [];
        
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell: any) => {
            const cellText = this.extractTextFromElement(cell);
            rowData.push(cellText);
          });
        }
        
        content.push(rowData);
        
        // 第一行作为表头
        if (rowIndex === 0 && rowData.some(cell => cell.trim())) {
          withHeadings = true;
        }
      });
    }
    
    return { content, withHeadings };
  }

  /**
   * 提取列表数据
   */
  private extractListData(element: any): any {
    const items: string[] = [];
    let style = 'unordered';
    
    // 判断列表类型
    if (element.numberingProperties || element.listType === 'ordered') {
      style = 'ordered';
    }
    
    // 提取列表项
    if (element.items && Array.isArray(element.items)) {
      element.items.forEach((item: any) => {
        const itemText = this.extractTextFromElement(item);
        if (itemText.trim()) {
          items.push(itemText);
        }
      });
    } else {
      // 如果没有items属性，尝试从当前元素提取文本
      const text = this.extractTextFromElement(element);
      if (text.trim()) {
        items.push(text);
      }
    }
    
    return { style, items };
  }

  /**
   * 提取图片数据
   */
  private extractImageData(element: any): any {
    return {
      file: {
        url: element.src || element.imageData || ''
      },
      caption: element.caption || '',
      withBorder: false,
      withBackground: false,
      stretched: false
    };
  }

  /**
   * 导入Word文件
   * 将.docx文件转换为编辑器数据格式
   */
  async import(file: File): Promise<EditorData> {
    console.log('WordHandler.import 开始处理文件:', file.name, '大小:', file.size);
    
    if (!file.name.toLowerCase().endsWith('.docx')) {
      throw new Error('仅支持.docx格式的Word文件');
    }

    try {
      // 使用docx-preview将docx转换为HTML
      const arrayBuffer = await file.arrayBuffer();
      console.log('文件读取完成，ArrayBuffer大小:', arrayBuffer.byteLength, 'bytes');
      
      // 创建一个临时容器来渲染文档
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      
      try {
        // 先解析文档获取批注数据
        const document = await parseAsync(arrayBuffer, {
          renderComments: true, // 解析时需要启用批注解析
          experimental: false,
          trimXmlDeclaration: true
        });
        
        console.log('文档解析完成，批注数量:', document.commentsPart?.comments?.length || 0);
        console.log('批注结构:', document.commentsPart);
        console.log('文档JSON结构:', document.documentPart.body);
        
        
        // 遍历document.documentPart.body.children来创建编辑器块
        const editorBlocks = this.parseDocumentStructure(document);
        console.log('从文档结构解析的块数量:', editorBlocks.length);
        
        // 如果成功解析出块，直接使用结构化数据
        if (editorBlocks.length > 0) {
          const editorData: EditorData = {
            time: Date.now(),
            blocks: editorBlocks,
            version: '2.28.2'
          };
          
          // 解析批注信息并关联到相应的块
          const comments = extractCommentsFromDocument(document);
          console.log('提取到的批注数量:', comments.length);
          
          // 将批注关联到对应的文本块
          this.associateCommentsWithBlocks(editorData, comments);
          
          console.log('使用文档结构解析的编辑器数据:', editorData);
          return editorData;
        } else {
          // 如果解析失败，返回空的编辑器数据
          console.warn('文档结构解析失败，返回空的编辑器数据');
          return {
            time: Date.now(),
            blocks: [],
            version: '2.28.2'
          };
        }
        
      } finally {
        // 清理临时容器
        document.body.removeChild(container);
      }
      
    } catch (error) {
      console.error('Word文件导入失败:', error);
      throw new Error('Word文件导入失败，请检查文件格式');
    }
  }

  /**
   * 导出为Word文件
   * 将编辑器数据转换为.docx文件
   */
  async export(data: EditorData): Promise<File> {
    try {
      // 检查数据有效性
      if (!data || !data.blocks || data.blocks.length === 0) {
        throw new Error('没有可导出的内容');
      }

      console.log('开始导出Word文档，数据块数量:', data.blocks.length);

      // 将编辑器数据转换为HTML
      const html = this.editorDataToHtml(data);
      console.log('转换后的HTML:', html);
      
      // 创建简化的Word文档内容
      const wordContent = this.createSimpleWordDocument(html);
      
      // 创建File对象
      const blob = new Blob([wordContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const fileName = `document_${Date.now()}.docx`;
      console.log('Word文档创建成功:', fileName);
      return new File([blob], fileName, { type: blob.type });
      
    } catch (error) {
      console.error('Word文件导出失败:', error);
      throw new Error(`Word文件导出失败: ${error.message}`);
    }
  }

  /**
   * 预览编辑器数据
   * 生成HTML预览
   */
  preview(data: EditorData): HTMLElement {
    const container = document.createElement('div');
    container.className = 'docly-preview';
    container.innerHTML = this.editorDataToHtml(data);
    return container;
  }

  /**
   * 将HTML转换为编辑器数据格式
   * 保留Word文档中的样式信息
   */
  private htmlToEditorData(html: string): EditorData {
    console.log('htmlToEditorData 开始处理HTML:', html.substring(0, 200) + '...');
    console.log('HTML总长度:', html.length);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: any[] = [];

    // 遍历所有子节点，保持原有顺序
    const bodyChildren = Array.from(doc.body.children);
    console.log('找到的HTML元素数量:', bodyChildren.length);
    console.log('子元素标签名:', bodyChildren.map(el => el.tagName.toLowerCase()));
    
    bodyChildren.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent?.trim() || '';
      
      console.log(`处理元素 ${index}: ${tagName}, 文本内容: "${textContent.substring(0, 100)}..."`);
      
      // 处理标题
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const level = parseInt(element.tagName.charAt(1));
        const block = {
          id: `heading_${Date.now()}_${index}`,
          type: 'header',
          data: {
            text: this.extractStyledText(element),
            level: level,
            styles: this.extractElementStyles(element)
          }
        };
        console.log('创建标题块:', block);
        blocks.push(block);
      }
      // 处理段落
      else if (tagName === 'p') {
        if (textContent) {
          console.log(`调用 splitElementIntoParagraphs 处理 p 元素`);
          // 检查段落内是否包含多个段落（通过换行符分割）
          const paragraphBlocks = this.splitElementIntoParagraphs(element, index);
          console.log(`splitElementIntoParagraphs 返回了 ${paragraphBlocks.length} 个段落块`);
          blocks.push(...paragraphBlocks);
        }
      }
      // 处理div元素（docx-preview可能生成div）
      else if (tagName === 'div') {
        if (textContent) {
          console.log(`调用 splitElementIntoParagraphs 处理 div 元素`);
          // 检查div内是否包含多个段落
          const paragraphBlocks = this.splitElementIntoParagraphs(element, index);
          console.log(`splitElementIntoParagraphs 返回了 ${paragraphBlocks.length} 个段落块`);
          blocks.push(...paragraphBlocks);
        }
      }
      // 处理列表
      else if (['ul', 'ol'].includes(tagName)) {
        const items = Array.from(element.querySelectorAll('li')).map(li => ({
          text: this.extractStyledText(li),
          styles: this.extractElementStyles(li)
        }));
        const block = {
          id: `list_${Date.now()}_${index}`,
          type: 'list',
          data: {
            style: tagName === 'ul' ? 'unordered' : 'ordered',
            items: items,
            styles: this.extractElementStyles(element)
          }
        };
        console.log('创建列表块:', block);
        blocks.push(block);
      }
      // 处理其他包含文本的元素
      else if (textContent) {
        console.log(`调用 splitElementIntoParagraphs 处理其他元素: ${tagName}`);
        // 对于其他元素，也尝试分割段落
        const paragraphBlocks = this.splitElementIntoParagraphs(element, index);
        console.log(`splitElementIntoParagraphs 返回了 ${paragraphBlocks.length} 个段落块`);
        blocks.push(...paragraphBlocks);
      }
    });

    console.log('处理完所有子元素，当前块数量:', blocks.length);
    
    // 如果没有生成任何块，尝试从整个body提取文本并分割段落
    if (blocks.length === 0 && doc.body.textContent?.trim()) {
      console.log('没有找到结构化内容，从body提取纯文本并分割段落');
      const bodyText = doc.body.textContent.trim();
      console.log('从body提取的文本:', bodyText.substring(0, 200));
      const paragraphs = this.splitTextIntoParagraphs(bodyText);
      console.log(`splitTextIntoParagraphs 返回了 ${paragraphs.length} 个段落`);
      
      paragraphs.forEach((paragraph, idx) => {
        if (paragraph.trim()) {
          const block = {
            id: `fallback_paragraph_${Date.now()}_${idx}`,
            type: 'paragraph',
            data: {
              text: paragraph.trim(),
              styles: {}
            }
          };
          console.log('创建回退段落块:', block);
          blocks.push(block);
        }
      });
    }

    console.log('最终生成的块数量:', blocks.length);
    console.log('最终生成的块:', blocks.map(b => ({ type: b.type, id: b.id, textPreview: b.data.text?.substring(0, 50) })));
    
    return {
      time: Date.now(),
      blocks: blocks,
      version: '2.28.2'
    };
  }

  /**
   * 提取元素的样式信息
   * 基于元素结构和属性进行智能样式推断，而非依赖具体内容匹配
   */
  private extractElementStyles(element: Element): any {
    const styles: any = {};
    
    // 检查元素是否包含仿宋字体相关的属性或样式
    const elementHtml = element.outerHTML;
    if (elementHtml.includes('仿宋') || elementHtml.includes('FangSong') || elementHtml.includes('fangsong')) {
      console.log('检测到可能包含仿宋字体的元素:', elementHtml.substring(0, 200));
    }

    // 1. 基于元素标签的样式推断
    this.applyTagBasedStyles(element, styles);

    // 2. 基于类名的样式推断
    this.applyClassBasedStyles(element, styles);

    // 3. 提取内联样式
    this.extractInlineStyles(element, styles);

    // 4. 基于元素层级和上下文的样式推断
    this.applyContextBasedStyles(element, styles);

    // 5. 提取子元素的样式信息
    this.extractChildElementStyles(element, styles);

    // 只保留仿宋字体相关的样式调试信息
    if (this.isFangSongFont(JSON.stringify(styles))) {
      console.log('仿宋字体调试 - 最终提取的样式:', styles);
    }
    return Object.keys(styles).length > 0 ? styles : null;
  }

  /**
   * 基于HTML标签类型应用默认样式
   */
  private applyTagBasedStyles(element: Element, styles: any): void {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'h1':
        styles.fontSize = '24px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '16px';
        break;
      case 'h2':
        styles.fontSize = '20px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '14px';
        break;
      case 'h3':
        styles.fontSize = '18px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '12px';
        break;
      case 'h4':
      case 'h5':
      case 'h6':
        styles.fontSize = '16px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '10px';
        break;
      case 'p':
        styles.lineHeight = '1.6';
        styles.marginBottom = '12px';
        break;
      case 'strong':
      case 'b':
        styles.fontWeight = 'bold';
        break;
      case 'em':
      case 'i':
        styles.fontStyle = 'italic';
        break;
      case 'u':
        styles.textDecoration = 'underline';
        break;
    }
    
    // 移除通用标签样式日志
  }

  /**
   * 基于CSS类名应用样式
   */
  private applyClassBasedStyles(element: Element, styles: any): void {
    const classList = Array.from(element.classList);
    
    classList.forEach(className => {
      switch (className) {
        case 'heading-1':
        case 'title':
          styles.fontSize = '28px';
          styles.fontWeight = 'bold';
          styles.marginBottom = '20px';
          break;
        case 'heading-2':
        case 'subtitle':
          styles.fontSize = '22px';
          styles.fontWeight = 'bold';
          styles.marginBottom = '16px';
          break;
        case 'heading-3':
          styles.fontSize = '18px';
          styles.fontWeight = 'bold';
          styles.marginBottom = '14px';
          break;
        case 'paragraph':
          styles.lineHeight = '1.8';
          break;
        case 'bold':
        case 'strong-style':
          styles.fontWeight = 'bold';
          break;
        case 'italic':
        case 'emphasis-style':
          styles.fontStyle = 'italic';
          break;
        case 'underline':
        case 'underline-style':
          styles.textDecoration = 'underline';
          break;
      }
    });
    
    if (classList.length > 0) {
      // 移除通用类名样式日志
    }
  }

  /**
   * 提取元素的内联样式
   */
  private extractInlineStyles(element: Element, styles: any): void {
    const inlineStyle = element.getAttribute('style');
    if (inlineStyle) {
      // 解析内联样式
      const styleDeclarations = inlineStyle.split(';');
      styleDeclarations.forEach(declaration => {
        const [property, value] = declaration.split(':').map(s => s.trim());
        if (property && value) {
          // 转换CSS属性名为驼峰命名
          const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
          // 跳过textAlign，由统一对齐处理逻辑处理
          if (property === 'text-align') {
            return;
          }
          // 处理text-align-last属性
          if (property === 'text-align-last') {
            styles.textAlignLast = value;
            console.log('从内联样式提取text-align-last:', value);
            return;
          }
          if (property === 'font-family') {
            // 对字体族进行中文字体映射处理
            const originalFont = value;
            const mappedFont = this.mapChineseFontName(value);
            styles[camelCaseProperty] = mappedFont;
            
            // 特别处理楷体字体
            if (this.isKaiTiFont(originalFont)) {
              // 添加楷体字体标记类
              if (element.classList) {
                element.classList.add('kaiti-font');
              }
              // 强制设置楷体字体
              styles[camelCaseProperty] = '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif';
            }
            
            // 特别处理仿宋字体或映射为仿宋的字体
            if (this.isFangSongFont(originalFont) || mappedFont.includes('仿宋')) {
              console.log(`仿宋字体调试 - 检测到仿宋字体: 原始=${originalFont}, 映射=${mappedFont}`);
              console.log(`仿宋字体调试 - 元素标签: ${element.tagName}, 文本内容: ${element.textContent?.substring(0, 50)}`);
              // 添加仿宋字体标记类
              if (element.classList) {
                element.classList.add('fangsong-font');
              }
              // 强制设置仿宋字体 - 使用统一的字体族定义
              styles[camelCaseProperty] = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
              console.log(`仿宋字体调试 - 应用字体族: ${styles[camelCaseProperty]}`);
              
              // 传播仿宋字体到子元素
              this.propagateFangSongToChildren(element);
            }
            
            // 对于段落元素，只有当段落本身没有明确的中文字体设置时，才传播仿宋字体
            if (element.tagName.toLowerCase() === 'p' && mappedFont.includes('仿宋')) {
              // 检查段落是否有明确的中文字体设置（排除英文字体组合）
              const hasExplicitChineseFont = /[\u4e00-\u9fff]/.test(originalFont) && 
                                           !this.isFangSongFont(originalFont) &&
                                           !originalFont.includes('Times New Roman') &&
                                           !originalFont.includes('Arial') &&
                                           !originalFont.includes('Calibri');
              
              if (!hasExplicitChineseFont) {
                console.log(`段落级别仿宋字体传播: ${element.tagName}, 映射字体: ${mappedFont}`);
                this.propagateFangSongToChildren(element);
              } else {
                console.log(`段落有明确中文字体设置，跳过传播: ${originalFont}`);
              }
            }
          } else {
            styles[camelCaseProperty] = value;
          }
        }
      });
    }

    // 检查HTMLElement的style属性
    if (element instanceof HTMLElement && element.style) {
      const allStyles = [
        'fontWeight', 'fontSize', 'fontFamily', 'fontStyle', 
        'color', 'backgroundColor', 'textDecoration', 'textAlign', 'textAlignLast',
        'lineHeight', 'textIndent', 'letterSpacing', 'wordSpacing',
        // 添加缩进相关样式
        'paddingLeft', 'paddingRight', 'marginLeft', 'marginRight',
        'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'
      ];
      
      allStyles.forEach(prop => {
        const value = (element.style as any)[prop];
        if (value && value !== '' && value !== 'normal' && value !== 'auto' && value !== '0px') {
          if (prop === 'fontFamily') {
            // 对字体族进行中文字体映射处理
            styles[prop] = this.mapChineseFontName(value);
            console.log(`内联样式字体族映射: ${value} -> ${styles[prop]}`);
          } else {
            styles[prop] = value;
            console.log(`提取样式 ${prop}:`, value);
          }
        }
      });
    }

    // 从计算样式中提取字体信息（如果可用）
    if (typeof window !== 'undefined' && element instanceof HTMLElement) {
      try {
        const computed = window.getComputedStyle(element);
        const computedFontStyles = [
          { prop: 'fontFamily', defaultValue: 'serif' },
          { prop: 'fontSize', defaultValue: '16px' },
          { prop: 'fontWeight', defaultValue: '400' },
          { prop: 'fontStyle', defaultValue: 'normal' },
          { prop: 'color', defaultValue: 'rgb(0, 0, 0)' },
          { prop: 'textDecoration', defaultValue: 'none' }
        ];

        computedFontStyles.forEach(({ prop, defaultValue }) => {
          if (!styles[prop]) {
            const computedValue = computed[prop as keyof CSSStyleDeclaration] as string;
            if (computedValue && computedValue !== defaultValue && computedValue !== 'normal') {
              if (prop === 'fontFamily') {
                // 对字体族进行中文字体映射处理
                styles[prop] = this.mapChineseFontName(computedValue);
                console.log(`从计算样式提取并映射fontFamily: ${computedValue} -> ${styles[prop]}`);
              } else {
                styles[prop] = computedValue;
                console.log(`从计算样式提取 ${prop}:`, computedValue);
              }
            }
          }
        });
      } catch (e) {
        console.warn('获取计算样式失败:', e);
      }
    }
  }

  /**
   * 基于元素上下文应用样式
   */
  private applyContextBasedStyles(element: Element, styles: any): void {
    // 检查父元素上下文
    const parent = element.parentElement;
    if (parent) {
      // 如果在表格中
      if (parent.tagName === 'TD' || parent.tagName === 'TH') {
        styles.padding = '8px';
        styles.border = '1px solid #ddd';
      }
      
      // 如果在列表中
      if (parent.tagName === 'LI') {
        styles.marginBottom = '4px';
      }
    }

    // 检测缩进级别
    this.detectAndApplyIndentStyles(element, styles);

    // 统一处理文本对齐
    this.detectAndApplyTextAlignment(element, styles, element.textContent || '');

    // 基于Word文档原始样式的智能推断
    this.applyWordStyleInference(element, styles);
  }

  /**
   * 统一检测和应用文本对齐样式
   * 避免多处设置textAlign导致的冲突
   */
  private detectAndApplyTextAlignment(element: Element, styles: any, textContent: string): void {
    // 如果已经有明确的对齐设置，优先保留
    if (styles.textAlign) {
      console.log('保留已有对齐设置:', styles.textAlign);
      return;
    }

    // 从内联样式中检测对齐
    const inlineAlign = this.extractAlignmentFromInlineStyle(element);
    if (inlineAlign) {
      styles.textAlign = inlineAlign;
      console.log('从内联样式检测到对齐:', inlineAlign);
      return;
    }

    // 从类名中检测对齐
    const classAlign = this.extractAlignmentFromClass(element);
    if (classAlign) {
      styles.textAlign = classAlign;
      console.log('从类名检测到对齐:', classAlign);
      return;
    }

    // 根据元素类型和内容应用默认对齐
    this.applyDefaultAlignment(element, styles, textContent);
  }

  /**
   * 从内联样式中提取对齐信息
   */
  private extractAlignmentFromInlineStyle(element: Element): string | null {
    const style = element.getAttribute('style');
    if (!style) return null;

    const alignMatch = style.match(/text-align\s*:\s*([^;]+)/i);
    if (alignMatch) {
      const align = alignMatch[1].trim();
      console.log('内联样式对齐检测:', align);
      return align;
    }

    return null;
  }

  /**
   * 从类名中提取对齐信息
   */
  private extractAlignmentFromClass(element: Element): string | null {
    const className = element.className;
    if (!className) return null;

    // 检测常见的对齐类名
    const alignmentClasses = {
      'text-center': 'center',
      'text-left': 'left',
      'text-right': 'right',
      'text-justify': 'justify',
      'center': 'center',
      'left': 'left',
      'right': 'right',
      'justify': 'justify'
    };

    for (const [cls, align] of Object.entries(alignmentClasses)) {
      if (className.includes(cls)) {
        console.log('类名对齐检测:', cls, '->', align);
        return align;
      }
    }

    return null;
  }

  /**
   * 应用默认对齐规则
   */
  private applyDefaultAlignment(element: Element, styles: any, textContent: string): void {
    const tagName = element.tagName.toLowerCase();
    
    // 标题默认居中对齐
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      // 检查是否是真正的标题（长度较短且可能包含标题特征）
      if (textContent.length < 50 && TextAnalyzer.isLikelyTitle(element, textContent)) {
        styles.textAlign = 'center';
        console.log('标题默认居中对齐');
        return;
      }
    }

    // 段落根据语言特征设置对齐
    if (tagName === 'p') {
      if (TextAnalyzer.isChineseParagraph(textContent)) {
        styles.textAlign = 'justify';
        styles.textAlignLast = 'justify';
        console.log('中文段落默认两端对齐，包括最后一行');
      } else if (TextAnalyzer.isEnglishParagraph(textContent)) {
        styles.textAlign = 'left';
        console.log('英文段落默认左对齐');
      } else {
        styles.textAlign = 'left';
        console.log('普通段落默认左对齐');
      }
      return;
    }

    // 列表项默认左对齐
    if (['li', 'ul', 'ol'].includes(tagName)) {
      styles.textAlign = 'left';
      console.log('列表项默认左对齐');
      return;
    }

    // 其他元素默认左对齐
    styles.textAlign = 'left';
    console.log('其他元素默认左对齐');
  }

  /**
   * 检测并应用缩进样式
   */
  private detectAndApplyIndentStyles(element: Element, styles: any): void {
    const textContent = element.textContent?.trim() || '';
    
    // 检查元素的缩进属性
    const indentLevel = this.detectIndentLevel(element);
    
    if (indentLevel > 0) {
      // 根据缩进级别应用样式
      const indentValue = indentLevel * 20; // 每级缩进20px
      
      // 检查是否为列表项
      if (this.isLikelyListItem(textContent) || element.tagName.toLowerCase() === 'li') {
        styles.paddingLeft = `${indentValue}px`;
        console.log(`应用列表项缩进: ${indentValue}px (级别: ${indentLevel})`);
      } else {
        // 普通段落使用textIndent
        styles.textIndent = `${indentValue}px`;
        console.log(`应用段落缩进: ${indentValue}px (级别: ${indentLevel})`);
      }
    }
    
    // 检查Word特有的缩进标记
    this.detectWordIndentMarkers(element, styles, textContent);
  }

  /**
   * 检测元素的缩进级别
   */
  private detectIndentLevel(element: Element): number {
    let indentLevel = 0;
    
    // 检查类名中的缩进信息
    const className = element.className || '';
    const indentMatch = className.match(/indent-?(\d+)/i);
    if (indentMatch) {
      indentLevel = parseInt(indentMatch[1]);
      console.log(`从类名检测到缩进级别: ${indentLevel}`);
      return indentLevel;
    }
    
    // 检查样式中的缩进信息
    if (element instanceof HTMLElement) {
      const paddingLeft = element.style.paddingLeft;
      const marginLeft = element.style.marginLeft;
      const textIndent = element.style.textIndent;
      
      // 从padding-left推断缩进级别
      if (paddingLeft && paddingLeft !== '0px') {
        const paddingValue = parseInt(paddingLeft);
        if (paddingValue > 0) {
          indentLevel = Math.max(indentLevel, Math.ceil(paddingValue / 20));
          console.log(`从paddingLeft推断缩进级别: ${indentLevel} (${paddingLeft})`);
        }
      }
      
      // 从margin-left推断缩进级别
      if (marginLeft && marginLeft !== '0px') {
        const marginValue = parseInt(marginLeft);
        if (marginValue > 0) {
          indentLevel = Math.max(indentLevel, Math.ceil(marginValue / 20));
          console.log(`从marginLeft推断缩进级别: ${indentLevel} (${marginLeft})`);
        }
      }
      
      // 从text-indent推断缩进级别
      if (textIndent && textIndent !== '0px') {
        const indentValue = parseInt(textIndent);
        if (indentValue > 0) {
          indentLevel = Math.max(indentLevel, Math.ceil(indentValue / 20));
          console.log(`从textIndent推断缩进级别: ${indentLevel} (${textIndent})`);
        }
      }
    }
    
    // 检查父元素的嵌套级别
    const nestingLevel = this.calculateNestingLevel(element);
    if (nestingLevel > 1) {
      indentLevel = Math.max(indentLevel, nestingLevel - 1);
      console.log(`从嵌套级别推断缩进: ${indentLevel} (嵌套: ${nestingLevel})`);
    }
    
    return indentLevel;
  }

  /**
   * 计算元素的嵌套级别
   */
  private calculateNestingLevel(element: Element): number {
    let level = 0;
    let current = element.parentElement;
    
    while (current && level < 10) { // 限制最大检查深度
      const tagName = current.tagName.toLowerCase();
      if (['ul', 'ol', 'li', 'blockquote', 'div'].includes(tagName)) {
        level++;
      }
      current = current.parentElement;
    }
    
    return level;
  }

  /**
   * 检测Word特有的缩进标记
   */
  private detectWordIndentMarkers(element: Element, styles: any, textContent: string): void {
    // 检查文本开头的空格或制表符
    const leadingSpaces = textContent.match(/^(\s+)/);
    if (leadingSpaces) {
      const spaceCount = leadingSpaces[1].length;
      if (spaceCount >= 2) {
        const indentLevel = Math.ceil(spaceCount / 2);
        const indentValue = indentLevel * 20;
        
        if (!styles.textIndent && !styles.paddingLeft) {
          styles.textIndent = `${indentValue}px`;
          console.log(`从前导空格检测缩进: ${indentValue}px (空格数: ${spaceCount})`);
        }
      }
    }
    
    // 检查是否包含缩进标记符号
    const indentMarkers = ['　', '\u3000', '\t']; // 全角空格、制表符等
    for (const marker of indentMarkers) {
      if (textContent.startsWith(marker)) {
        const markerCount = textContent.match(new RegExp(`^(\\${marker}+)`))?.[1]?.length || 0;
        if (markerCount > 0) {
          const indentValue = markerCount * 20;
          if (!styles.textIndent && !styles.paddingLeft) {
            styles.textIndent = `${indentValue}px`;
            console.log(`从缩进标记检测缩进: ${indentValue}px (标记数: ${markerCount})`);
          }
        }
        break;
      }
    }
  }

  /**
   * 基于Word文档原始样式的智能推断机制
   * 通过分析元素的结构特征和上下文来推断原始Word样式
   */
  private applyWordStyleInference(element: Element, styles: any): void {
    const textContent = element.textContent || '';
    const textLength = textContent.length;
    
    console.log('Word样式推断 - 文本内容:', textContent.substring(0, 50));
    console.log('Word样式推断 - 文本长度:', textLength);
    
    // 1. 标题样式推断（基于结构特征而非具体内容）
    if (TextAnalyzer.isLikelyTitle(element, textContent)) {
      this.applyTitleStyles(element, styles, textContent);
    }
    
    // 2. 段落样式推断
    else if (element.tagName === 'P') {
      this.applyParagraphStyles(element, styles, textContent);
    }
    
    // 3. 列表项样式推断
    if (TextAnalyzer.isLikelyListItem(textContent)) {
      this.applyListItemStyles(styles, textContent);
    }
    
    // 4. 特殊格式推断（引用、注释等）
    if (TextAnalyzer.isLikelyQuote(textContent)) {
      this.applyQuoteStyles(styles);
    }

    // 5. Word文档字体样式特殊处理
    this.applyWordFontInference(element, styles);
  }

  /**
   * 应用Word文档字体样式推断
   * 由于docx-preview转换后通常包含更好的字体信息，优先使用原始字体
   */
  private applyWordFontInference(element: Element, styles: any): void {
    const text = element.textContent || '';
    
    // 检查是否已有字体族信息
    if (styles.fontFamily) {
      // 如果是仿宋字体，记录调试信息
      if (this.isFangSongFont(styles.fontFamily)) {
        console.log('仿宋字体调试 - 已有仿宋字体族:', styles.fontFamily, '元素:', element.tagName, '文本:', text.substring(0, 30));
      }
      return;
    }
    
    // 检查是否包含特殊字体标记（Word转换后可能保留的属性）
    const classList = element.className || '';
    
    // 检查Word样式类名
    if (classList.includes('MsoNormal')) {
      // 静默处理
    }
    
    if (classList.includes('MsoTitle')) {
      styles.fontWeight = 'bold';
      styles.fontSize = '18px';
    }
    
    if (classList.includes('MsoSubtitle')) {
      styles.fontWeight = '600';
      styles.fontSize = '14px';
    }

    // 由于docx-preview转换后通常包含更好的字体信息，优先使用原始字体
    if (text && TextAnalyzer.isChineseParagraph(text)) {
      styles.fontFamily = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif';
    } else if (text) {
      styles.fontFamily = '"Times New Roman", "Helvetica", "Arial", sans-serif';
    }
  }

  /**
   * 映射中文字体名称到Web安全字体
   */
  private mapChineseFontName(fontName: string): string {
    // 清理字体名称，移除引号和多余空格
    const cleanFontName = fontName.replace(/['"]/g, '').trim();
    
    console.log('开始字体映射处理:', cleanFontName);
    
    // 处理复合字体（如 "Times New Roman", 黑体）
    if (cleanFontName.includes(',')) {
      const fontParts = cleanFontName.split(',').map(part => part.trim().replace(/['"]/g, ''));
      console.log('检测到复合字体:', fontParts);
      
      // 优先处理中文字体
      const chineseFontPart = fontParts.find(part => 
        this.isFangSongFont(part) || 
        this.isKaiTiFont(part) || 
        /[\u4e00-\u9fff]/.test(part)
      );
      
      if (chineseFontPart) {
        console.log(`复合字体中发现中文字体: ${chineseFontPart}`);
        // 递归处理中文字体部分
        const mappedChineseFont = this.mapChineseFontName(chineseFontPart);
        console.log(`复合字体映射结果: ${mappedChineseFont}`);
        return mappedChineseFont;
      }
      
      // 如果没有中文字体，检查是否应该应用默认中文字体
      // 对于纯英文字体的复合字体，返回仿宋作为默认中文字体
      console.log('复合字体中未发现中文字体，应用默认仿宋字体');
      return '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
    }
    
    // 中文字体映射表
    const result = this.processSingleFont(cleanFontName);
    console.log(`单一字体映射结果: ${cleanFontName} -> ${result}`);
    return result;
  }

  /**
   * 中文字体映射表
   */
  private get chineseFontMap(): { [key: string]: string } {
    return {
      // 方正字体系列
      '方正小标宋简体': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      '方正小标宋_GBK': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      '方正小标宋': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      'FZXiaoBiaoSong-B05S': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      
      // 楷体系列 - 增强支持
      '楷体_GB2312': '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif',
      'KaiTi_GB2312': '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif',
      '楷体': '"KaiTi", "楷体", "KaiTi_GB2312", "STKaiti", "DFKai-SB", serif',
      'KaiTi': '"KaiTi", "楷体", "KaiTi_GB2312", "STKaiti", "DFKai-SB", serif',
      'STKaiti': '"STKaiti", "楷体", "KaiTi", "KaiTi_GB2312", "DFKai-SB", serif',
      'DFKai-SB': '"DFKai-SB", "KaiTi", "楷体", "KaiTi_GB2312", "STKaiti", serif',
      
      // 宋体系列
      '宋体': '"SimSun", "宋体", serif',
      'SimSun': '"SimSun", "宋体", serif',
      '新宋体': '"NSimSun", "新宋体", "SimSun", "宋体", serif',
      'NSimSun': '"NSimSun", "新宋体", "SimSun", "宋体", serif',
      
      // 黑体系列
      '黑体': '"SimHei", "黑体", sans-serif',
      'SimHei': '"SimHei", "黑体", sans-serif',
      '微软雅黑': '"Microsoft YaHei", "微软雅黑", "SimHei", "黑体", sans-serif',
      'Microsoft YaHei': '"Microsoft YaHei", "微软雅黑", "SimHei", "黑体", sans-serif',
      
      // 仿宋系列 - 优化映射顺序，确保仿宋_GB2312优先
      '仿宋_GB2312': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'FangSong_GB2312': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      '仿宋': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'FangSong': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'STFangsong': '"仿宋_GB2312", "FangSong_GB2312", "STFangsong", "FangSong", "仿宋", serif',
      
      // 隶书系列
      '隶书': '"LiSu", "隶书", serif',
      'LiSu': '"LiSu", "隶书", serif',
      
      // 幼圆系列
      '幼圆': '"YouYuan", "幼圆", sans-serif',
      'YouYuan': '"YouYuan", "幼圆", sans-serif'
    };
  }

  /**
   * 处理单一字体映射
   */
  private processSingleFont(cleanFontName: string): string {
    // 检查是否有直接映射
    if (this.chineseFontMap[cleanFontName]) {
      console.log(`中文字体直接映射: ${cleanFontName} -> ${this.chineseFontMap[cleanFontName]}`);
      return this.chineseFontMap[cleanFontName];
    }
    
    // 特殊处理仿宋相关字体的模糊匹配
    if (this.isFangSongFont(cleanFontName)) {
      const fangsongFont = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
      console.log(`仿宋字体特殊处理: ${cleanFontName} -> ${fangsongFont}`);
      return fangsongFont;
    }
    
    // 特殊处理楷体相关字体的模糊匹配
    if (this.isKaiTiFont(cleanFontName)) {
      const kaitiFont = '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif';
      console.log(`楷体字体特殊处理: ${cleanFontName} -> ${kaitiFont}`);
      return kaitiFont;
    }
    
    // 模糊匹配
    for (const [key, value] of Object.entries(this.chineseFontMap)) {
      if (cleanFontName.includes(key) || key.includes(cleanFontName)) {
        return value;
      }
    }
    
    // 如果包含中文字符，添加通用中文字体fallback
    if (/[\u4e00-\u9fff]/.test(cleanFontName)) {
      const fallbackFont = `"${cleanFontName}", "SimSun", "宋体", "Microsoft YaHei", "微软雅黑", serif`;
      return fallbackFont;
    }
    
    // 返回原字体名称，添加引号保护
    const quotedFont = `"${cleanFontName}"`;
    return quotedFont;
  }

  /**
   * 检测是否为楷体相关字体
   */
  private isKaiTiFont(fontName: string): boolean {
    const kaitiKeywords = ['楷体', 'KaiTi', 'Kai', '楷', 'kaiti', 'KAITI'];
    return kaitiKeywords.some(keyword => 
      fontName.toLowerCase().includes(keyword.toLowerCase()) ||
      fontName.includes(keyword)
    );
  }

  /**
   * 检测是否为仿宋相关字体
   */
  private isFangSongFont(fontName: string): boolean {
    // 清理字体名称，移除引号和多余空格
    const cleanFontName = fontName.replace(/['"]/g, '').trim();
    
    // 仿宋字体关键词，按优先级排序
    const fangsongKeywords = [
      '仿宋_GB2312',     // 最高优先级
      'FangSong_GB2312', 
      '仿宋',
      'FangSong',
      'fangsong',
      'FANGSONG',
      'STFangsong'
    ];
    
    // 精确匹配优先
    if (fangsongKeywords.includes(cleanFontName)) {
      console.log(`仿宋字体精确匹配: ${cleanFontName}`);
      return true;
    }
    
    // 模糊匹配
    const isMatch = fangsongKeywords.some(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      const lowerFontName = cleanFontName.toLowerCase();
      return lowerFontName.includes(lowerKeyword) || 
             lowerKeyword.includes(lowerFontName) ||
             cleanFontName.includes(keyword);
    });
    
    if (isMatch) {
      // console.log(`仿宋字体模糊匹配: ${cleanFontName}`);
    }
    
    return isMatch;
  }

  /**
   * 将仿宋字体传播到子元素，处理复合字体和字体继承
   */
  /**
   * 将仿宋字体传播到子元素
   * 处理复合字体和英文字体的映射
   */
  private propagateFangSongToChildren(element: Element): void {
    const children = element.querySelectorAll('*');
    console.log(`开始传播仿宋字体到 ${children.length} 个子元素`);
    
    children.forEach((child, index) => {
      // 检查子元素是否已有字体设置
      const childStyle = child.getAttribute('style') || '';
      const hasOwnFont = childStyle.includes('font-family');
      
      console.log(`处理子元素 ${index + 1}: ${child.tagName}, 有字体设置: ${hasOwnFont}`);
      
      if (hasOwnFont) {
        // 如果子元素有字体设置，检查是否需要映射为仿宋
        const fontFamilyMatch = childStyle.match(/font-family:\s*([^;]+)/);
        if (fontFamilyMatch) {
          const currentFont = fontFamilyMatch[1].trim();
          console.log(`子元素当前字体: ${currentFont}`);
          
          // 检查是否为明确的中文字体（黑体、宋体等），如果是则保留
          const isExplicitChineseFont = /[\u4e00-\u9fff]/.test(currentFont) && 
                                       !this.isFangSongFont(currentFont) &&
                                       !currentFont.includes('Times New Roman') &&
                                       !currentFont.includes('Arial') &&
                                       !currentFont.includes('Calibri');
          
          if (isExplicitChineseFont) {
            console.log(`保留明确的中文字体设置: ${currentFont}`);
            return; // 跳过这个子元素，保留其原有字体
          }
          
          // 处理复合字体，如 "Times New Roman", 黑体
          if (currentFont.includes(',')) {
            const mappedFont = this.mapChineseFontName(currentFont);
            if (mappedFont !== currentFont && mappedFont.includes('仿宋')) {
              // 替换字体
              const newStyle = childStyle.replace(/font-family:\s*[^;]+/, `font-family: ${mappedFont}`);
              child.setAttribute('style', newStyle);
              child.classList.add('fangsong-mapped');
              console.log(`映射复合字体到仿宋: ${currentFont} -> ${mappedFont}`);
            }
          }
          // 处理单一的英文字体，如 "Times New Roman"
          else if (currentFont.includes('Times New Roman') || 
                   currentFont.includes('Arial') || 
                   currentFont.includes('Calibri') ||
                   currentFont.includes('sans-serif') ||
                   currentFont.includes('serif')) {
            const fangsongFont = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
            const newStyle = childStyle.replace(/font-family:\s*[^;]+/, `font-family: ${fangsongFont}`);
            child.setAttribute('style', newStyle);
            child.classList.add('fangsong-mapped');
            console.log(`映射英文字体到仿宋: ${currentFont} -> ${fangsongFont}`);
          }
          // 处理已经是中文字体但不是仿宋的情况 - 只处理非明确中文字体
          else if (/[\u4e00-\u9fff]/.test(currentFont) && 
                   !this.isFangSongFont(currentFont) &&
                   (currentFont.includes('Times New Roman') || 
                    currentFont.includes('Arial') || 
                    currentFont.includes('Calibri'))) {
            const fangsongFont = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
            const newStyle = childStyle.replace(/font-family:\s*[^;]+/, `font-family: ${fangsongFont}`);
            child.setAttribute('style', newStyle);
            child.classList.add('fangsong-mapped');
            console.log(`映射中文字体到仿宋: ${currentFont} -> ${fangsongFont}`);
          }
        }
      } else {
        // 如果子元素没有自己的字体设置，继承仿宋字体
        const currentStyle = childStyle ? childStyle + '; ' : '';
        const fangsongFont = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
        child.setAttribute('style', `${currentStyle}font-family: ${fangsongFont}`);
        child.classList.add('fangsong-inherited');
        console.log(`传播仿宋字体到子元素: ${child.tagName}`);
      }
    });
  }

  /**
   * 解析data-style属性
   */
  private parseDataStyleAttribute(dataStyle: string, styles: any): void {
    const styleRules = dataStyle.split(';');
    styleRules.forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (property && value) {
        const camelCaseProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        if (!styles[camelCaseProp]) {
          styles[camelCaseProp] = value;
        }
      }
    });
  }

  /**
   * 转换Word字体大小到CSS
   */
  private convertWordSizeToCSS(wordSize: string): string | null {
    // Word字体大小映射表
    const sizeMap: { [key: string]: string } = {
      '1': '8px',
      '2': '10px', 
      '3': '12px',
      '4': '14px',
      '5': '18px',
      '6': '24px',
      '7': '36px'
    };
    
    // 如果是数字，使用映射表
    if (sizeMap[wordSize]) {
      return sizeMap[wordSize];
    }
    
    // 如果已经是CSS格式，直接返回
    if (wordSize.includes('px') || wordSize.includes('pt') || wordSize.includes('em')) {
      return wordSize;
    }
    
    // 尝试转换pt到px
    const ptMatch = wordSize.match(/(\d+(?:\.\d+)?)pt/);
    if (ptMatch) {
      const pt = parseFloat(ptMatch[1]);
      return `${Math.round(pt * 1.33)}px`;
    }
    
    return null;
  }

  /**
   * 判断元素是否可能是标题
   */
  /**
   * 应用标题样式
   */
  private applyTitleStyles(element: Element, styles: any, textContent: string): void {
    // 根据标题级别应用不同样式
    const level = this.inferTitleLevel(textContent);
    
    switch (level) {
      case 1: // 主标题
        styles.fontSize = '24px';
        styles.fontWeight = 'bold';
        styles.marginTop = '20px';
        styles.marginBottom = '16px';
        break;
      case 2: // 二级标题
        styles.fontSize = '20px';
        styles.fontWeight = 'bold';
        styles.marginTop = '16px';
        styles.marginBottom = '12px';
        break;
      case 3: // 三级标题
        styles.fontSize = '18px';
        styles.fontWeight = 'bold';
        styles.marginTop = '14px';
        styles.marginBottom = '10px';
        break;
      default: // 其他标题
        styles.fontSize = '16px';
        styles.fontWeight = 'bold';
        styles.marginTop = '12px';
        styles.marginBottom = '8px';
        break;
    }
    
    styles.lineHeight = '1.4';
    console.log(`应用${level}级标题样式`);
  }

  /**
   * 推断标题级别
   */
  private inferTitleLevel(textContent: string): number {
    return TextAnalyzer.inferTitleLevel(textContent);
  }

  /**
   * 应用段落样式
   */
  private applyParagraphStyles(element: Element, styles: any, textContent: string): void {
    // 基本段落样式
    styles.lineHeight = '1.8';
    styles.marginBottom = '12px';
    
    // 段落缩进处理（不设置对齐，由统一对齐处理逻辑决定）
    if (TextAnalyzer.isChineseParagraph(textContent)) {
      styles.textIndent = '2em';
      console.log('应用中文段落缩进样式');
    }
    
    console.log('应用段落基础样式');
  }

  /**
    * 判断是否为中文段落
    */
   private isChineseParagraph(textContent: string): boolean {
     return TextAnalyzer.isChineseParagraph(textContent);
   }

   /**
    * 判断是否为英文段落
    */
   private isEnglishParagraph(textContent: string): boolean {
     return TextAnalyzer.isEnglishParagraph(textContent);
   }

  /**
   * 判断是否可能是列表项
   */
  private isLikelyListItem(textContent: string): boolean {
    return TextAnalyzer.isLikelyListItem(textContent);
  }

  /**
   * 应用列表项样式
   */
  private applyListItemStyles(styles: any, textContent: string): void {
    styles.marginLeft = '20px';
    styles.marginBottom = '6px';
    styles.lineHeight = '1.6';
    
    // 检测列表项的缩进级别
    const indentLevel = TextAnalyzer.detectListIndentLevel(textContent);
    if (indentLevel > 0) {
      const indentValue = indentLevel * 24; // 列表项缩进稍大一些
      styles.paddingLeft = `${indentValue}px`;
      console.log(`应用列表项缩进: ${indentValue}px (级别: ${indentLevel})`);
    }
    
    // 检测列表类型并应用相应样式
    if (textContent.match(/^\d+[\.\)]/)) {
      styles.listStyleType = 'decimal';
      console.log('应用有序列表样式');
    } else if (textContent.match(/^[•·▪▫◦‣⁃]/)) {
      styles.listStyleType = 'disc';
      console.log('应用无序列表样式');
    } else if (textContent.match(/^[a-zA-Z][\.\)]/)) {
      styles.listStyleType = 'lower-alpha';
      console.log('应用字母列表样式');
    }
    
    console.log('应用列表项样式');
  }

  /**
   * 检测列表项的缩进级别
   */
  private detectListIndentLevel(textContent: string): number {
    return TextAnalyzer.detectListIndentLevel(textContent);
  }

  /**
   * 判断是否可能是引用
   */
  private isLikelyQuote(textContent: string): boolean {
    return TextAnalyzer.isLikelyQuote(textContent);
  }

  /**
   * 应用引用样式
   */
  private applyQuoteStyles(styles: any): void {
    styles.fontStyle = 'italic';
    styles.marginLeft = '20px';
    styles.marginRight = '20px';
    styles.color = '#666';
    console.log('应用引用样式');
  }

  /**
   * 提取子元素样式信息
   */
  private extractChildElementStyles(element: Element, styles: any): void {
    // 检查子元素中的格式化标签
    const childElements = element.querySelectorAll('strong, b, em, i, u, span');
    
    if (childElements.length > 0) {
      // 移除通用子元素样式检查日志
      
      // 检查粗体样式
      const boldElements = element.querySelectorAll('strong, b');
      const totalText = element.textContent?.length || 0;
      const boldText = Array.from(boldElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
      
      if (boldText > totalText * 0.7) {
        styles.fontWeight = 'bold';
        // 移除通用粗体样式日志
      }
      
      // 检查斜体样式
      const italicElements = element.querySelectorAll('em, i');
      const italicText = Array.from(italicElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
      
      if (italicText > totalText * 0.7) {
        styles.fontStyle = 'italic';
        // 移除通用斜体样式日志
      }

      // 检查下划线样式
      const underlineElements = element.querySelectorAll('u');
      const underlineText = Array.from(underlineElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
      
      if (underlineText > totalText * 0.7) {
        styles.textDecoration = 'underline';
        // 移除通用下划线样式日志
      }

      // 从子元素中提取字体样式
           childElements.forEach((child, index) => {
             if (child instanceof HTMLElement) {
               const childStyle = child.getAttribute('style');
               if (childStyle) {
                 // 只记录包含仿宋字体的子元素样式
                 if (this.isFangSongFont(childStyle)) {
                  //  console.log(`🎯 仿宋字体子元素${index}内联样式:`, childStyle);
                 }
                 
                 // 提取字体相关样式
                 const fontProperties = ['font-family', 'font-size', 'color', 'background-color'];
                 fontProperties.forEach(prop => {
                   const match = childStyle.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`));
                   if (match && match[1]) {
                     const camelCaseProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                     if (!styles[camelCaseProp]) {
                       const value = match[1].trim();
                       if (prop === 'font-family') {
                         // 对字体族进行中文字体映射处理
                         styles[camelCaseProp] = this.mapChineseFontName(value);
                         // 只记录仿宋字体的映射
                         if (this.isFangSongFont(value)) {
                           console.log(`🎯 从子元素提取并映射仿宋字体样式 ${camelCaseProp}: ${value} -> ${styles[camelCaseProp]}`);
                         }
                       } else {
                         styles[camelCaseProp] = value;
                         // 只记录仿宋字体相关的其他样式
                         if (this.isFangSongFont(childStyle)) {
                           console.log(`🎯 从仿宋字体子元素提取样式 ${camelCaseProp}:`, value);
                         }
                       }
                     }
                   }
                 });
               }

               // 检查子元素的计算样式
               if (typeof window !== 'undefined') {
                 try {
                   const childComputed = window.getComputedStyle(child);
                   
                   // 提取字体族
                   if (!styles.fontFamily && childComputed.fontFamily && childComputed.fontFamily !== 'serif') {
                     const originalFont = childComputed.fontFamily;
                     styles.fontFamily = this.mapChineseFontName(childComputed.fontFamily);
                     
                     // 只记录仿宋字体的映射
                     if (this.isFangSongFont(originalFont)) {
                       console.log('🎯 从子元素计算样式提取并映射仿宋字体fontFamily:', childComputed.fontFamily, '->', styles.fontFamily);
                     }
                     
                     // 特别处理楷体字体
                     if (this.isKaiTiFont(originalFont)) {
                       // 移除楷体字体日志
                       // 添加楷体字体标记类
                       if (element.classList) {
                         element.classList.add('kaiti-font');
                       }
                     }
                   }
                   
                   // 提取字体大小
                   if (!styles.fontSize && childComputed.fontSize && childComputed.fontSize !== '16px') {
                     styles.fontSize = childComputed.fontSize;
                     // 只记录仿宋字体相关的字体大小
                     if (this.isFangSongFont(childComputed.fontFamily)) {
                       console.log('🎯 从仿宋字体子元素计算样式提取fontSize:', childComputed.fontSize);
                     }
                   }
                 } catch (e) {
                   console.warn(`获取子元素${index}计算样式失败:`, e);
                 }
               }
             }
           });
    }
  }

  /**
   * 提取带样式的文本内容
   */
  /**
   * 提取带样式的文本内容，用于EditorJS
   * 返回HTML内容以保持样式信息
   */
  private extractStyledText(element: Element): string {
    // 获取HTML内容而不是纯文本，以保持样式
    const htmlContent = element.innerHTML || '';
    console.log('提取HTML内容:', htmlContent.substring(0, 200) + '...');
    
    // 如果没有HTML内容，回退到纯文本
    if (!htmlContent.trim()) {
      const textContent = element.textContent || '';
      console.log('回退到纯文本内容:', textContent.substring(0, 200) + '...');
      return textContent.trim();
    }
    
    return htmlContent.trim();
  }

  /**
   * 将编辑器数据转换为HTML
   */
  private editorDataToHtml(data: EditorData): string {
    let html = '';

    data.blocks.forEach(block => {
      switch (block.type) {
        case 'header':
          const level = block.data.level || 2;
          html += `<h${level}>${this.escapeHtml(block.data.text || '')}</h${level}>`;
          break;
        case 'paragraph':
          html += `<p>${this.escapeHtml(block.data.text || '')}</p>`;
          break;
        case 'list':
          const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
          const items = (block.data.items || []).map((item: string) => 
            `<li>${this.escapeHtml(item)}</li>`
          ).join('');
          html += `<${tag}>${items}</${tag}>`;
          break;
        case 'quote':
          html += `<blockquote><p>${this.escapeHtml(block.data.text || '')}</p>`;
          if (block.data.caption) {
            html += `<cite>${this.escapeHtml(block.data.caption)}</cite>`;
          }
          html += `</blockquote>`;
          break;
        case 'code':
          html += `<pre><code>${this.escapeHtml(block.data.code || '')}</code></pre>`;
          break;
        case 'table':
          if (block.data.content && Array.isArray(block.data.content)) {
            html += '<table border="1" style="border-collapse: collapse; width: 100%;">';
            block.data.content.forEach((row: string[]) => {
              html += '<tr>';
              row.forEach(cell => {
                html += `<td style="padding: 8px; border: 1px solid #ccc;">${this.escapeHtml(cell || '')}</td>`;
              });
              html += '</tr>';
            });
            html += '</table>';
          }
          break;
        default:
          // 处理未知类型的块
          if (block.data && block.data.text) {
            html += `<p>${this.escapeHtml(block.data.text)}</p>`;
          }
      }
    });

    return html || '<p>空文档</p>';
  }

  /**
   * HTML转义函数
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 创建简化的Word文档内容
   */
  private createSimpleWordDocument(html: string): string {
    // 移除HTML标签，保留文本内容
    const textContent = html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
    
    // 创建基础的Word文档XML结构
    const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${this.escapeXml(textContent || '这是一个新文档')}</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    return wordXml;
  }

  /**
   * XML转义函数
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 创建Word文档模板
   */
  private createDocxTemplate(html: string): any {
    // 这里需要实现HTML到Word模板的转换
    // 由于docxtemplater主要用于模板填充，这里简化处理
    // 实际项目中可能需要使用其他库如html-docx-js
    
    // 创建基础的Word文档结构
    const content = `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>${html.replace(/<[^>]*>/g, ' ')}</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>
    `;

    // 这里返回一个模拟的docx对象
    // 实际实现需要完整的Word文档结构
    return {
      getZip: () => ({
        generate: (options: any) => new ArrayBuffer(0)
      })
    };
  }


  /**
   * 提取Word文档中的批注信息
   * @param container - 包含渲染后HTML的容器元素
   * @returns 批注数组
   */
  private extractComments(container: HTMLElement): Comment[] {
    const comments: Comment[] = [];
    
    console.log('开始提取批注，容器HTML长度:', container.innerHTML.length);
    
    // 由于禁用了renderComments，需要直接从docx文档中解析批注
    // 这里我们需要访问docx-preview的内部数据结构
    // 但由于API限制，我们先返回空数组，批注功能通过编辑器自身的批注系统实现
    
    console.log('批注提取完成，总数量:', comments.length);
    return comments;
  }

  /**
   * 将批注关联到对应的文本块
   * @param editorData - 编辑器数据
   * @param comments - 批注数组
   */
  private associateCommentsWithBlocks(editorData: EditorData, comments: Comment[]): void {
    if (comments.length === 0) return;
    
    // 记录已关联的批注ID，避免重复关联
    const associatedCommentIds = new Set<string>();
    
    // 定义匹配结果的类型接口
    interface MatchResult {
      blockIndex: number;
      matchScore: number;
    }
    
    let bestMatch: MatchResult | null = null;
    
    // 为每个批注找到最佳匹配的文本块
    comments.forEach(comment => {
      const commentText = comment.range.text.trim();
      
      // 遍历所有块，找到最佳匹配
      editorData.blocks.forEach((block, blockIndex) => {
        const blockText = (block.data.text || '').trim();
        
        if (!blockText) return;
        
        // 计算匹配分数
        let matchScore = 0;
        
        // 1. 精确匹配（最高分）
        if (blockText.includes(commentText)) {
          matchScore = 100;
        }
        // 2. 反向匹配
        else if (commentText.includes(blockText)) {
          matchScore = 90;
        }
        // 3. 模糊匹配（去除标点符号和空格）
        else {
          const normalizeText = (text: string) => text.replace(/[\s\p{P}]/gu, '').toLowerCase();
          const normalizedBlock = normalizeText(blockText);
          const normalizedComment = normalizeText(commentText);
          
          if (normalizedBlock && normalizedComment) {
            if (normalizedBlock.includes(normalizedComment)) {
              matchScore = 80;
            } else if (normalizedComment.includes(normalizedBlock)) {
              matchScore = 70;
            }
          }
        }
        
        // 更新最佳匹配
        if (matchScore > 0 && (bestMatch === null || matchScore > bestMatch.matchScore)) {
          bestMatch = { blockIndex, matchScore };
        }
      });
      
      // 如果找到最佳匹配，将批注关联到该块
      if (bestMatch !== null && !associatedCommentIds.has(comment.id)) {
        const block = editorData.blocks[bestMatch.blockIndex];
        const blockText = (block.data.text || '').trim();
        
        // 创建块级别的批注引用（保持原始ID）
        const blockComment: Comment = {
          ...comment,
          range: {
            startOffset: Math.max(0, blockText.indexOf(commentText)),
            endOffset: Math.min(blockText.length, 
              blockText.indexOf(commentText) + commentText.length),
            text: commentText
          }
        };
        
        // 初始化块的批注数组
        if (!block.comments) {
          block.comments = [];
        }
        
        block.comments.push(blockComment);
        associatedCommentIds.add(comment.id);
      }
    });
    
    // 将所有原始批注保存到 EditorData 的 comments 属性中（避免重复）
    if (!editorData.comments) {
      editorData.comments = [];
    }
    editorData.comments.push(...comments);
    
    const associatedCount = associatedCommentIds.size;
    const unassociatedCount = comments.length - associatedCount;
    
    console.log(`批注处理完成: 总计 ${comments.length} 个批注，其中 ${associatedCount} 个已关联到文本块，${unassociatedCount} 个未关联`);
  }
}