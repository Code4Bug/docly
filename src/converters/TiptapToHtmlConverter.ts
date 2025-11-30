import { TiptapDocument, TiptapNode } from './WordToTiptapConverter';
import { ImageProcessor } from '../utils/ImageProcessor';

/**
 * Tiptap 到 HTML 转换器
 * 专门负责将 Tiptap JSON 格式转换为 HTML
 */
export class TiptapToHtmlConverter {

  /**
   * 将 Tiptap 文档转换为 HTML
   * @param tiptapDoc - Tiptap 文档
   * @returns HTML 字符串
   */
  convertToHtml(tiptapDoc: TiptapDocument): string {
    if (!tiptapDoc.content || tiptapDoc.content.length === 0) {
      return '<p></p>';
    }

    const htmlContent = tiptapDoc.content
      .map(node => this.convertNodeToHtml(node))
      .filter(Boolean)
      .join('\n');

    return htmlContent || '<p></p>';
  }

  /**
   * 将 Tiptap 节点转换为 HTML
   * @param node - Tiptap 节点
   * @returns HTML 字符串
   */
  private convertNodeToHtml(node: TiptapNode): string {
    switch (node.type) {
      case 'paragraph':
        return this.convertParagraphToHtml(node);
      case 'heading':
        return this.convertHeadingToHtml(node);
      case 'bulletList':
        return this.convertBulletListToHtml(node);
      case 'orderedList':
        return this.convertOrderedListToHtml(node);
      case 'listItem':
        return this.convertListItemToHtml(node);
      case 'table':
        return this.convertTableToHtml(node);
      case 'tableRow':
        return this.convertTableRowToHtml(node);
      case 'tableCell':
        return this.convertTableCellToHtml(node);
      case 'image':
        return ImageProcessor.generateImageHtml(node);
      case 'text':
        return this.convertTextToHtml(node);
      default:
        console.warn(`未知节点类型: ${node.type}`);
        return '';
    }
  }

  /**
   * 转换段落节点
   */
  private convertParagraphToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    const styles = this.convertAttrsToStyles(node.attrs || {});
    const styleAttr = styles ? ` style="${styles}"` : '';
    
    return `<p${styleAttr}>${content || '&nbsp;'}</p>`;
  }

  /**
   * 转换标题节点
   */
  private convertHeadingToHtml(node: TiptapNode): string {
    const level = node.attrs?.level || 1;
    const content = this.convertContentToHtml(node.content || []);
    const styles = this.convertAttrsToStyles(node.attrs || {});
    const styleAttr = styles ? ` style="${styles}"` : '';
    
    return `<h${level}${styleAttr}>${content}</h${level}>`;
  }

  /**
   * 转换无序列表节点
   */
  private convertBulletListToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    return `<ul>${content}</ul>`;
  }

  /**
   * 转换有序列表节点
   */
  private convertOrderedListToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    return `<ol>${content}</ol>`;
  }

  /**
   * 转换列表项节点
   */
  private convertListItemToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    return `<li>${content}</li>`;
  }

  /**
   * 转换表格节点
   */
  private convertTableToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    return `<table border="1" style="border-collapse: collapse; width: 100%;">${content}</table>`;
  }

  /**
   * 转换表格行节点
   */
  private convertTableRowToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    return `<tr>${content}</tr>`;
  }

  /**
   * 转换表格单元格节点
   */
  private convertTableCellToHtml(node: TiptapNode): string {
    const content = this.convertContentToHtml(node.content || []);
    return `<td style="padding: 8px; border: 1px solid #ccc;">${content}</td>`;
  }

  /**
   * 转换文本节点
   */
  private convertTextToHtml(node: TiptapNode): string {
    let text = this.escapeHtml(node.text || '');
    
    // 应用文本标记
    if (node.marks && node.marks.length > 0) {
      for (const mark of node.marks) {
        text = this.applyMarkToText(text, mark);
      }
    }
    
    return text;
  }

  /**
   * 转换内容数组
   */
  private convertContentToHtml(content: TiptapNode[]): string {
    return content
      .map(node => this.convertNodeToHtml(node))
      .join('');
  }

  /**
   * 应用文本标记
   */
  private applyMarkToText(text: string, mark: any): string {
    switch (mark.type) {
      case 'bold':
        return `<strong>${text}</strong>`;
      case 'italic':
        return `<em>${text}</em>`;
      case 'underline':
        return `<u>${text}</u>`;
      case 'strike':
        return `<s>${text}</s>`;
      case 'textStyle':
        const styles = this.convertMarkAttrsToStyles(mark.attrs || {});
        return styles ? `<span style="${styles}">${text}</span>` : text;
      default:
        return text;
    }
  }

  /**
   * 转换属性为CSS样式
   */
  private convertAttrsToStyles(attrs: Record<string, any>): string {
    const styles: string[] = [];
    
    if (attrs.textAlign) {
      styles.push(`text-align: ${attrs.textAlign}`);
    }
    
    if (attrs.fontSize) {
      styles.push(`font-size: ${attrs.fontSize}`);
    }
    
    if (attrs.fontFamily) {
      styles.push(`font-family: ${attrs.fontFamily}`);
    }
    
    if (attrs.color) {
      styles.push(`color: ${attrs.color}`);
    }
    
    if (attrs.backgroundColor) {
      styles.push(`background-color: ${attrs.backgroundColor}`);
    }
    
    if (attrs.lineHeight) {
      styles.push(`line-height: ${attrs.lineHeight}`);
    }
    
    if (attrs.marginTop) {
      styles.push(`margin-top: ${attrs.marginTop}`);
    }
    
    if (attrs.marginBottom) {
      styles.push(`margin-bottom: ${attrs.marginBottom}`);
    }
    
    if (attrs.marginLeft) {
      styles.push(`margin-left: ${attrs.marginLeft}`);
    }
    
    if (attrs.marginRight) {
      styles.push(`margin-right: ${attrs.marginRight}`);
    }
    
    if (attrs.textIndent) {
      styles.push(`text-indent: ${attrs.textIndent}`);
    }
    
    return styles.join('; ');
  }

  /**
   * 转换标记属性为CSS样式
   */
  private convertMarkAttrsToStyles(attrs: Record<string, any>): string {
    const styles: string[] = [];
    
    if (attrs.color) {
      styles.push(`color: ${attrs.color}`);
    }
    
    if (attrs.fontSize) {
      styles.push(`font-size: ${attrs.fontSize}`);
    }
    
    if (attrs.fontFamily) {
      styles.push(`font-family: ${attrs.fontFamily}`);
    }
    
    if (attrs.backgroundColor) {
      styles.push(`background-color: ${attrs.backgroundColor}`);
    }
    
    return styles.join('; ');
  }

  /**
   * 转义HTML字符
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}