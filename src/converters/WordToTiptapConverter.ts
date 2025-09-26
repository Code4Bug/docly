import { Console } from '../utils/Console';

/**
 * Tiptap 文档格式定义
 */
export interface TiptapDocument {
  type: 'doc';
  content: TiptapNode[];
  comments?: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  user: string;
  timestamp: number;
  range?: {
    startOffset: number;
    endOffset: number;
    text: string;
  };
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

/**
 * Word XML 到 Tiptap JSON 直接转换器
 * 消除中间适配层，实现单向数据流：Word XML → Tiptap JSON
 */
export class WordToTiptapConverter {
  constructor() {
    // TextStyleHandler 暂时保留，未来可能用于处理复杂的文本样式
    // this.textStyleHandler = new TextStyleHandler();
  }

  /**
   * 将 Word XML 直接转换为 Tiptap JSON 格式
   * @param xmlContent - Word 文档的 XML 内容
   * @returns Tiptap 文档格式
   */
  convertWordXmlToTiptapJson(xmlContent: string): TiptapDocument {
    try {
      Console.debug('开始将 Word XML 转换为 Tiptap JSON');
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      
      // 获取所有段落
      const paragraphs = doc.querySelectorAll('w\\:p, p');
      const content: TiptapNode[] = [];
      
      paragraphs.forEach((paragraph) => {
        const node = this.convertParagraphToTiptapNode(paragraph);
        if (node) {
          content.push(node);
        }
      });
      
      // 如果没有内容，添加一个空段落
      if (content.length === 0) {
        content.push({
          type: 'paragraph',
          content: []
        });
      }
      
      const tiptapDoc: TiptapDocument = {
        type: 'doc',
        content
      };
      
      Console.debug('Word XML 转换为 Tiptap JSON 完成，生成了', content.length, '个节点');
      return tiptapDoc;
      
    } catch (error) {
      Console.error('Word XML 转换为 Tiptap JSON 时发生错误:', error);
      // 返回空文档而不是抛出错误
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: []
        }]
      };
    }
  }

  /**
   * 将 Word 段落转换为 Tiptap 节点
   * @param paragraph - Word 段落元素
   * @param index - 段落索引
   * @returns Tiptap 节点
   */
  private convertParagraphToTiptapNode(paragraph: Element): TiptapNode | null {
    // 检查段落样式，判断是否为标题
    const paragraphProps = paragraph.querySelector('w\\:pPr, pPr');
    const paragraphStyle = paragraphProps?.querySelector('w\\:pStyle, pStyle');
    const styleVal = paragraphStyle?.getAttribute('w:val') || paragraphStyle?.getAttribute('val');
    
    // 提取段落中的所有文本运行
    const runs = paragraph.querySelectorAll('w\\:r, r');
    const content: TiptapNode[] = [];
    
    runs.forEach(run => {
      const textNodes = this.convertRunToTiptapNodes(run);
      content.push(...textNodes);
    });
    
    // 如果段落为空，不添加任何内容（Tiptap 会自动处理空段落）
    // Tiptap 不允许空的文本节点
    
    // 根据样式确定节点类型
    if (styleVal && styleVal.match(/heading|title|Heading|Title/i)) {
      // 提取标题级别
      const levelMatch = styleVal.match(/(\d+)/);
      const level = levelMatch ? Math.min(parseInt(levelMatch[1]), 6) : 1;
      
      return {
        type: 'heading',
        attrs: { level },
        content: content.length > 0 ? content : [{ type: 'text', text: ' ' }]
      };
    }
    
    // 检查是否为列表项
    const numPr = paragraphProps?.querySelector('w\\:numPr, numPr');
    if (numPr) {
      return {
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: content.length > 0 ? content : [{ type: 'text', text: ' ' }]
        }]
      };
    }
    
    // 默认为段落 - 如果没有内容，返回null让上层处理
    if (content.length === 0) {
      return null;
    }
    
    return {
      type: 'paragraph',
      content
    };
  }

  /**
   * 将 Word 文本运行转换为 Tiptap 文本节点
   * @param run - Word 文本运行元素
   * @returns Tiptap 文本节点数组
   */
  private convertRunToTiptapNodes(run: Element): TiptapNode[] {
    const textElements = run.querySelectorAll('w\\:t, t');
    const runProps = run.querySelector('w\\:rPr, rPr');
    
    // 提取文本样式
    const marks = this.extractMarksFromRunProps(runProps);
    
    const nodes: TiptapNode[] = [];
    
    textElements.forEach(textEl => {
      const text = textEl.textContent || '';
      if (text) {
        const textNode: TiptapNode = {
          type: 'text',
          text
        };
        
        if (marks.length > 0) {
          textNode.marks = marks;
        }
        
        nodes.push(textNode);
      }
    });
    
    return nodes;
  }

  /**
   * 从 Word 运行属性中提取 Tiptap 标记
   * @param runProps - Word 运行属性元素
   * @returns Tiptap 标记数组
   */
  private extractMarksFromRunProps(runProps: Element | null): TiptapMark[] {
    if (!runProps) return [];
    
    const marks: TiptapMark[] = [];
    
    // 粗体
    if (runProps.querySelector('w\\:b, b')) {
      marks.push({ type: 'bold' });
    }
    
    // 斜体
    if (runProps.querySelector('w\\:i, i')) {
      marks.push({ type: 'italic' });
    }
    
    // 下划线
    if (runProps.querySelector('w\\:u, u')) {
      marks.push({ type: 'underline' });
    }
    
    // 删除线
    if (runProps.querySelector('w\\:strike, strike')) {
      marks.push({ type: 'strike' });
    }
    
    // 字体颜色
    const colorEl = runProps.querySelector('w\\:color, color');
    if (colorEl) {
      const color = colorEl.getAttribute('w:val') || colorEl.getAttribute('val');
      if (color && color !== 'auto') {
        marks.push({
          type: 'textStyle',
          attrs: { color: `#${color}` }
        });
      }
    }
    
    // 字体大小
    const sizeEl = runProps.querySelector('w\\:sz, sz');
    if (sizeEl) {
      const size = sizeEl.getAttribute('w:val') || sizeEl.getAttribute('val');
      if (size) {
        // Word 中的字体大小是半点单位，需要除以2
        const fontSize = `${parseInt(size) / 2}pt`;
        marks.push({
          type: 'textStyle',
          attrs: { fontSize }
        });
      }
    }
    
    // 字体族
    const fontEl = runProps.querySelector('w\\:rFonts, rFonts');
    if (fontEl) {
      const fontFamily = fontEl.getAttribute('w:ascii') || fontEl.getAttribute('ascii');
      if (fontFamily) {
        marks.push({
          type: 'textStyle',
          attrs: { fontFamily }
        });
      }
    }
    
    return marks;
  }

  /**
   * 将 Tiptap JSON 转换为 Word XML
   * @param tiptapDoc - Tiptap 文档
   * @returns Word XML 字符串
   */
  convertTiptapJsonToWordXml(tiptapDoc: TiptapDocument): string {
    try {
      Console.debug('开始将 Tiptap JSON 转换为 Word XML');
      
      const paragraphs = tiptapDoc.content.map(node => 
        this.convertTiptapNodeToWordXml(node)
      ).filter(Boolean);
      
      const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n    ')}
  </w:body>
</w:document>`;
      
      Console.debug('Tiptap JSON 转换为 Word XML 完成');
      return wordXml;
      
    } catch (error) {
      Console.error('Tiptap JSON 转换为 Word XML 时发生错误:', error);
      throw error;
    }
  }

  /**
   * 将 Tiptap 节点转换为 Word XML
   * @param node - Tiptap 节点
   * @returns Word XML 字符串
   */
  private convertTiptapNodeToWordXml(node: TiptapNode): string {
    switch (node.type) {
      case 'paragraph':
        return this.convertParagraphNodeToWordXml(node);
      case 'heading':
        return this.convertHeadingNodeToWordXml(node);
      case 'listItem':
        return this.convertListItemNodeToWordXml(node);
      default:
        // 未知节点类型，转换为段落
        return this.convertParagraphNodeToWordXml(node);
    }
  }

  /**
   * 将段落节点转换为 Word XML
   */
  private convertParagraphNodeToWordXml(node: TiptapNode): string {
    const runs = (node.content || []).map(child => 
      this.convertTextNodeToWordRun(child)
    ).filter(Boolean);
    
    return `<w:p>
      <w:pPr></w:pPr>
      ${runs.join('\n      ')}
    </w:p>`;
  }

  /**
   * 将标题节点转换为 Word XML
   */
  private convertHeadingNodeToWordXml(node: TiptapNode): string {
    const level = node.attrs?.level || 1;
    const runs = (node.content || []).map(child => 
      this.convertTextNodeToWordRun(child)
    ).filter(Boolean);
    
    return `<w:p>
      <w:pPr>
        <w:pStyle w:val="Heading${level}"/>
      </w:pPr>
      ${runs.join('\n      ')}
    </w:p>`;
  }

  /**
   * 将列表项节点转换为 Word XML
   */
  private convertListItemNodeToWordXml(node: TiptapNode): string {
    // 简化处理，将列表项转换为段落
    const paragraphContent = node.content?.[0];
    if (paragraphContent && paragraphContent.type === 'paragraph') {
      const runs = (paragraphContent.content || []).map(child => 
        this.convertTextNodeToWordRun(child)
      ).filter(Boolean);
      
      return `<w:p>
        <w:pPr>
          <w:numPr>
            <w:ilvl w:val="0"/>
            <w:numId w:val="1"/>
          </w:numPr>
        </w:pPr>
        ${runs.join('\n        ')}
      </w:p>`;
    }
    
    return '';
  }

  /**
   * 将文本节点转换为 Word 运行
   */
  private convertTextNodeToWordRun(node: TiptapNode): string {
    if (node.type !== 'text' || !node.text) {
      return '';
    }
    
    const runProps = this.convertMarksToWordRunProps(node.marks || []);
    const escapedText = this.escapeXmlText(node.text);
    
    return `<w:r>
      ${runProps}
      <w:t>${escapedText}</w:t>
    </w:r>`;
  }

  /**
   * 将 Tiptap 标记转换为 Word 运行属性
   */
  private convertMarksToWordRunProps(marks: TiptapMark[]): string {
    if (marks.length === 0) {
      return '<w:rPr></w:rPr>';
    }
    
    const props: string[] = [];
    
    marks.forEach(mark => {
      switch (mark.type) {
        case 'bold':
          props.push('<w:b/>');
          break;
        case 'italic':
          props.push('<w:i/>');
          break;
        case 'underline':
          props.push('<w:u w:val="single"/>');
          break;
        case 'strike':
          props.push('<w:strike/>');
          break;
        case 'textStyle':
          if (mark.attrs?.color) {
            const color = mark.attrs.color.replace('#', '');
            props.push(`<w:color w:val="${color}"/>`);
          }
          if (mark.attrs?.fontSize) {
            const size = parseInt(mark.attrs.fontSize) * 2; // 转换为半点单位
            props.push(`<w:sz w:val="${size}"/>`);
          }
          if (mark.attrs?.fontFamily) {
            props.push(`<w:rFonts w:ascii="${mark.attrs.fontFamily}"/>`);
          }
          break;
      }
    });
    
    return `<w:rPr>${props.join('')}</w:rPr>`;
  }

  /**
   * 转义 XML 文本
   */
  private escapeXmlText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}