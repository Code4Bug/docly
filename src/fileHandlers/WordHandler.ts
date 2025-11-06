import { type TiptapDocument, type Comment as TiptapComment } from '../converters/WordToTiptapConverter';
import { WordXmlParser } from './WordXmlParser';
import { WordXmlGenerator } from './WordXmlGenerator';
import { DocxFileHandler } from './DocxFileHandler';

/**
 * Word文档处理器 - 重构版
 * 
 * 按照Linus的哲学重构：
 * 1. 单一职责 - 只负责协调三个专门的类
 * 2. 消除复杂性 - 每个方法只做一件事
 * 3. 好品味 - 没有特殊情况，统一的数据流
 */
export class WordHandler {
  private parser: WordXmlParser;
  private generator: WordXmlGenerator;
  private fileHandler: DocxFileHandler;

  constructor() {
    this.parser = new WordXmlParser();
    this.generator = new WordXmlGenerator();
    this.fileHandler = new DocxFileHandler();
  }

  // === 导入方法 ===

  /**
   * 导入Word文档为TiptapDocument (推荐格式)
   */
  async importToTiptap(file: File): Promise<TiptapDocument> {
    try {
      const { documentXml, numberingXml } = await this.fileHandler.readDocxFile(file);
      return this.parser.parseToTiptap(documentXml, numberingXml);
    } catch (error) {
      console.error('导入Word文档失败:', error);
      throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 导入Word文档为HTML
   */
  async importToHtml(file: File): Promise<string> {
    try {
      const tiptapDoc = await this.importToTiptap(file);
      return this.convertTiptapToHtml(tiptapDoc);
    } catch (error) {
      console.error('导入为HTML失败:', error);
      throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // === 导出方法 ===

  /**
   * 从TiptapDocument导出Word文档 (推荐)
   */
  async exportFromTiptapJson(tiptapDoc: TiptapDocument, filename: string = 'document'): Promise<{ blob: Blob; name: string }> {
    try {
      const wordXml = this.generator.generateFromTiptap(tiptapDoc);
      const blob = await this.fileHandler.generateDocxFile(wordXml);
      return { blob, name: `${filename}.docx` };
    } catch (error) {
      console.error('从Tiptap导出失败:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从HTML导出Word文档
   */
  async exportFromHtml(html: string, filename: string = 'document'): Promise<{ blob: Blob; name: string }> {
    try {
      const wordXml = this.generator.generateFromHtml(html);
      const blob = await this.fileHandler.generateDocxFile(wordXml);
      return { blob, name: `${filename}.docx` };
    } catch (error) {
      console.error('从HTML导出失败:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // === 批注处理 ===

  /**
   * 解析Word文档中的批注
   */
  async parseComments(file: File): Promise<TiptapComment[]> {
    try {
      const { documentXml, commentsXml } = await this.fileHandler.readDocxFile(file);
      if (!commentsXml) return [];
      return this.parser.parseComments(commentsXml, documentXml);
    } catch (error) {
      console.error('解析批注失败:', error);
      return [];
    }
  }

  // === 私有辅助方法 ===

  private convertTiptapToHtml(tiptapDoc: TiptapDocument): string {
    if (!tiptapDoc.content || tiptapDoc.content.length === 0) {
      return '<p></p>';
    }

    return tiptapDoc.content.map(node => {
      switch (node.type) {
        case 'paragraph':
          let content = '';
          if (node.content) {
            content = node.content.map(textNode => {
              if (textNode.type === 'text') {
                return this.escapeHtml(textNode.text || '');
              }
              return '';
            }).join('');
          }
          return `<p>${content}</p>`;
        case 'heading':
          const level = node.attrs?.level || 1;
          let headingContent = '';
          if (node.content) {
            headingContent = node.content.map(textNode => {
              if (textNode.type === 'text') {
                return this.escapeHtml(textNode.text || '');
              }
              return '';
            }).join('');
          }
          return `<h${level}>${headingContent}</h${level}>`;
        default:
          return '<p></p>';
      }
    }).join('\n');
  }

  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
  }
}