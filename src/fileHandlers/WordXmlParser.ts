import { WordToTiptapConverter, type TiptapDocument, type Comment as TiptapComment } from '../converters/WordToTiptapConverter';

/**
 * Word XML 解析器
 * 专门负责解析Word XML内容为结构化数据
 */
export class WordXmlParser {
  private wordToTiptapConverter: WordToTiptapConverter;

  constructor() {
    this.wordToTiptapConverter = new WordToTiptapConverter();
  }

  /**
   * 解析Word XML为TiptapDocument
   */
  parseToTiptap(xmlContent: string, numberingXml?: string): TiptapDocument {
    // 如果提供了 numbering.xml，则先构建列表类型映射供转换器使用
    if (numberingXml) {
      const map = this.buildNumberingTypeMap(numberingXml);
      this.wordToTiptapConverter.setNumberingTypeMap(map);
    } else {
      this.wordToTiptapConverter.setNumberingTypeMap({});
    }

    return this.wordToTiptapConverter.convertWordXmlToTiptapJson(xmlContent);
  }

  /**
   * 解析批注
   */
  parseComments(xmlContent: string, documentXml?: string): TiptapComment[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const comments = xmlDoc.querySelectorAll('w\\:comment, comment');
    
    const commentRangeTextMap = new Map<string, string>();
    if (documentXml) {
      this.extractCommentRangeText(documentXml, commentRangeTextMap);
    }

    return Array.from(comments).map(comment => {
      const id = comment.getAttribute('w:id') || comment.getAttribute('id') || '';
      const author = comment.getAttribute('w:author') || comment.getAttribute('author') || '未知作者';
      const date = comment.getAttribute('w:date') || comment.getAttribute('date') || new Date().toISOString();
      
      let text = '';
      const paragraphs = comment.querySelectorAll('w\\:p, p');
      paragraphs.forEach(p => {
        const textElements = p.querySelectorAll('w\\:t, t');
        textElements.forEach(t => {
          text += t.textContent || '';
        });
      });

      const rangeText = commentRangeTextMap.get(id) || '';
      
      return {
        id,
        author,
        date,
        content: text || '空批注',
        user: author,
        timestamp: new Date(date).getTime(),
        range: {
          startOffset: 0,
          endOffset: 0,
          text: rangeText
        }
      };
    });
  }

  // === 私有方法 ===

  /**
   * 从 numbering.xml 构建 numId → 列表类型 映射
   * - bullet → 无序列表
   * - 其他（decimal、lowerRoman 等）→ 有序列表
   */
  private buildNumberingTypeMap(numberingXml: string): Record<number, 'bulletList' | 'orderedList'> {
    const map: Record<number, 'bulletList' | 'orderedList'> = {};

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(numberingXml, 'text/xml');

      // 收集 abstractNumId → numFmt（仅取 ilvl=0 的作为列表类型的代表）
      const abstractNumFmt: Record<number, string> = {};
      const abstractNums = Array.from(doc.querySelectorAll('w\\:abstractNum, abstractNum'));
      abstractNums.forEach(an => {
        const idStr = an.getAttribute('w:abstractNumId') || an.getAttribute('abstractNumId');
        const id = idStr ? parseInt(idStr, 10) : NaN;
        if (Number.isNaN(id)) return;

        const firstLvl = an.querySelector('w\\:lvl[w\\:ilvl="0"], lvl[ilvl="0"], w\\:lvl, lvl');
        const numFmt = firstLvl?.querySelector('w\\:numFmt, numFmt')?.getAttribute('w:val')
          || firstLvl?.querySelector('w\\:numFmt, numFmt')?.getAttribute('val')
          || '';
        if (numFmt) {
          abstractNumFmt[id] = numFmt;
        }
      });

      // 建立 numId → 列表类型 映射
      const nums = Array.from(doc.querySelectorAll('w\\:num, num'));
      nums.forEach(n => {
        const numIdStr = n.getAttribute('w:numId') || n.getAttribute('numId');
        const numId = numIdStr ? parseInt(numIdStr, 10) : NaN;
        if (Number.isNaN(numId)) return;

        const absIdStr = n.querySelector('w\\:abstractNumId, abstractNumId')?.getAttribute('w:val')
          || n.querySelector('w\\:abstractNumId, abstractNumId')?.getAttribute('val')
          || '';
        const absId = absIdStr ? parseInt(absIdStr, 10) : NaN;
        const fmt = abstractNumFmt[absId];
        if (!fmt) return;

        map[numId] = fmt === 'bullet' ? 'bulletList' : 'orderedList';
      });
    } catch (e) {
      // 解析失败时返回空映射并记录日志
      console.warn('解析 numbering.xml 失败，将使用默认列表映射:', e);
    }

    return map;
  }

  private extractCommentRangeText(documentXml: string, commentRangeTextMap: Map<string, string>): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(documentXml, 'text/xml');
    
    const commentRangeStarts = doc.querySelectorAll('w\\:commentRangeStart, commentRangeStart');
    
    commentRangeStarts.forEach(start => {
      const commentId = start.getAttribute('w:id') || start.getAttribute('id');
      if (!commentId) return;
      
      const endSelector = `w\\:commentRangeEnd[w\\:id="${commentId}"], commentRangeEnd[id="${commentId}"]`;
      const end = doc.querySelector(endSelector);
      
      if (end) {
        const text = this.extractTextBetweenNodes(start as Element, end as Element);
        if (text.trim()) {
          commentRangeTextMap.set(commentId, text.trim());
        }
      }
    });
  }

  private extractTextBetweenNodes(startNode: Element, endNode: Element): string {
    let text = '';
    let currentNode: Node | null = startNode.nextSibling;
    
    while (currentNode && currentNode !== endNode) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as Element;
        if (element.tagName === 'w:r' || element.tagName === 'r') {
          text += this.extractTextFromNode(element);
        } else if (element.tagName === 'w:p' || element.tagName === 'p') {
          text += this.extractTextFromNode(element) + '\n';
        } else {
          text += this.extractTextFromNode(element);
        }
      } else if (currentNode.nodeType === Node.TEXT_NODE) {
        text += currentNode.textContent || '';
      }
      currentNode = currentNode.nextSibling;
    }
    
    return text;
  }

  private extractTextFromNode(node: Node): string {
    let text = '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      if (element.tagName === 'w:t' || element.tagName === 't') {
        return element.textContent || '';
      }
      
      for (const child of Array.from(element.childNodes)) {
        text += this.extractTextFromNode(child);
      }
    }
    
    return text;
  }


}