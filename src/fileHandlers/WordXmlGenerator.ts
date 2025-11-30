import { type TiptapDocument, WordToTiptapConverter, type Comment } from '../converters/WordToTiptapConverter';

/**
 * Word XML 生成器
 * 专门负责将结构化数据转换为Word XML
 */
export class WordXmlGenerator {

  /**
   * 从TiptapDocument生成Word XML (推荐方法)
   * 现在支持批注数据导出
   */
  generateFromTiptap(tiptapDoc: TiptapDocument): string {
    // 直接使用WordToTiptapConverter的逆向转换，得到的是 body 内容
    const converter = new WordToTiptapConverter();
    let bodyXml = converter.convertTiptapJsonToWordXml(tiptapDoc);
    
    // 如果有批注数据，需要在文档内容中添加批注范围标记
    if (tiptapDoc.comments && tiptapDoc.comments.length > 0) {
      console.log('处理批注数据，批注数量:', tiptapDoc.comments.length);
      bodyXml = this.insertCommentRangeMarkers(bodyXml, tiptapDoc.comments);
    }
    
    // 需要包装为完整的 document.xml 结构，否则Word会显示为空白
    const documentXml = this.wrapInDocumentXml(bodyXml);
    
    return documentXml;
  }

  /**
   * 在文档内容中插入批注范围标记
   */
  private insertCommentRangeMarkers(bodyXml: string, comments: Comment[]): string {
    console.log('开始在文档内容中插入批注范围标记...');
    
    let modifiedXml = bodyXml;
    let successfulMatches = 0;
    
    // 按批注ID排序，确保处理顺序一致
    const sortedComments = [...comments].sort((a, b) => a.id.localeCompare(b.id));
    
    // 为每个批注添加范围标记
    sortedComments.forEach((comment) => {
      const commentId = comment.id;
      const rangeText = comment.range?.text;
      
      if (rangeText && rangeText.trim() && rangeText.length > 2) {
        console.log(`处理批注 ${commentId}，范围文本: "${rangeText}"`);
        
        // 使用更精确的批注定位方法
        const insertResult = this.insertCommentAtPreciseLocation(modifiedXml, commentId, rangeText.trim());
        
        if (insertResult.success) {
          modifiedXml = insertResult.xml;
          successfulMatches++;
          console.log(`批注 ${commentId} 成功定位并插入`);
        } else {
          console.warn(`批注 ${commentId} 定位失败: ${insertResult.reason}`);
        }
      } else {
        console.warn(`批注 ${commentId} 缺少有效范围文本，跳过插入`);
      }
    });
    
    console.log(`批注范围标记插入完成，成功: ${successfulMatches}/${comments.length}`);
    return modifiedXml;
  }

  /**
   * 在精确位置插入批注标记
   */
  private insertCommentAtPreciseLocation(xml: string, commentId: string, rangeText: string): { success: boolean; xml: string; reason?: string } {
    try {
      // 1. 清理和标准化范围文本
      const cleanRangeText = this.normalizeText(rangeText);
      
      if (cleanRangeText.length < 3) {
        return { success: false, xml, reason: '范围文本太短' };
      }
      
      // 2. 查找所有可能的文本匹配位置
      const candidates = this.findTextCandidates(xml, cleanRangeText);
      
      if (candidates.length === 0) {
        return { success: false, xml, reason: '未找到匹配的文本' };
      }
      
      // 3. 选择最佳匹配位置（优先选择不在表格中的位置）
      const bestCandidate = this.selectBestCandidate(xml, candidates);
      
      if (!bestCandidate) {
        return { success: false, xml, reason: '未找到合适的插入位置' };
      }
      
      // 4. 在最佳位置插入批注标记
      const modifiedXml = this.insertCommentMarkersAtPosition(xml, commentId, bestCandidate);
      
      return { success: true, xml: modifiedXml };
      
    } catch (error) {
      console.error(`插入批注 ${commentId} 时发生错误:`, error);
      return { success: false, xml, reason: `插入错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  /**
   * 标准化文本，移除多余空格和特殊字符
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')  // 合并多个空格
      .replace(/[\r\n\t]/g, ' ')  // 替换换行和制表符
      .trim();
  }

  /**
   * 查找文本候选位置
   */
  private findTextCandidates(xml: string, searchText: string): Array<{ start: number; end: number; context: string }> {
    const candidates: Array<{ start: number; end: number; context: string }> = [];
    
    // 提取所有文本内容及其位置
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    
    while ((match = textPattern.exec(xml)) !== null) {
      const textContent = match[1];
      const textStart = match.index!;
      const textEnd = textStart + match[0].length;
      
      // 检查是否包含搜索文本
      if (textContent && textContent.includes(searchText)) {
        candidates.push({
          start: textStart,
          end: textEnd,
          context: textContent
        });
      }
    }
    
    // 如果精确匹配失败，尝试部分匹配
    if (candidates.length === 0 && searchText.length > 5) {
      const partialText = searchText.substring(0, Math.min(searchText.length, 10));
      textPattern.lastIndex = 0; // 重置正则表达式
      
      while ((match = textPattern.exec(xml)) !== null) {
        const textContent = match[1];
        const textStart = match.index!;
        const textEnd = textStart + match[0].length;
        
        if (textContent && textContent.includes(partialText)) {
          candidates.push({
            start: textStart,
            end: textEnd,
            context: textContent
          });
        }
      }
    }
    
    return candidates;
  }

  /**
   * 选择最佳候选位置
   */
  private selectBestCandidate(xml: string, candidates: Array<{ start: number; end: number; context: string }>): { start: number; end: number; context: string } | null {
    if (candidates.length === 0) return null;
    
    // 优先选择不在表格中的候选位置
    for (const candidate of candidates) {
      const beforeCandidate = xml.substring(0, candidate.start);
      const lastTableStart = beforeCandidate.lastIndexOf('<w:tbl>');
      const lastTableEnd = beforeCandidate.lastIndexOf('</w:tbl>');
      
      // 如果不在表格中，优先选择
      if (lastTableStart === -1 || lastTableEnd > lastTableStart) {
        return candidate;
      }
    }
    
    // 如果所有候选位置都在表格中，选择第一个
    return candidates[0];
  }

  /**
   * 在指定位置插入批注标记
   */
  private insertCommentMarkersAtPosition(xml: string, commentId: string, position: { start: number; end: number; context: string }): string {
    // 找到包含该文本的完整运行元素
    const runStart = xml.lastIndexOf('<w:r>', position.start);
    const runEnd = xml.indexOf('</w:r>', position.end) + 6;
    
    if (runStart === -1 || runEnd === -1) {
      // 如果找不到运行元素，直接在文本位置插入
      const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
      const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/>`;
      const commentRef = `<w:r><w:commentReference w:id="${commentId}"/></w:r>`;
      
      return xml.substring(0, position.start) + 
             commentStart + 
             xml.substring(position.start, position.end) + 
             commentEnd + commentRef +
             xml.substring(position.end);
    }
    
    // 在运行元素前后插入批注标记
    const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
    const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/>`;
    const commentRef = `<w:r><w:commentReference w:id="${commentId}"/></w:r>`;
    
    return xml.substring(0, runStart) + 
           commentStart + 
           xml.substring(runStart, runEnd) + 
           commentEnd + commentRef +
           xml.substring(runEnd);
  }



  /**
   * 生成批注XML内容
   */
  generateCommentsXml(comments: Comment[]): string {
    console.log('开始生成批注XML...');
    
    const commentsElements = comments.map(comment => {
      const date = new Date(comment.timestamp).toISOString();
      const escapedContent = this.escapeXml(comment.content);
      const escapedAuthor = this.escapeXml(comment.author);
      
      return `<w:comment w:id="${comment.id}" w:author="${escapedAuthor}" w:date="${date}">
        <w:p>
          <w:r>
            <w:t>${escapedContent}</w:t>
          </w:r>
        </w:p>
      </w:comment>`;
    }).join('\n');
    
    const commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${commentsElements}
</w:comments>`;
    
    console.log('批注XML生成完成，内容长度:', commentsXml.length);
    return commentsXml;
  }

  /**
   * 从HTML生成Word XML
   */
  generateFromHtml(html: string): string {
    return this.htmlToWordXml(html);
  }

  // === 私有方法 ===

  private htmlToWordXml(htmlString: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${htmlString}</div>`, 'text/html');
    const container = doc.querySelector('div');
    
    if (!container) return this.wrapInDocumentXml('');

    let wordContent = '';
    
    for (const child of Array.from(container.children)) {
      wordContent += this.processHtmlElement(child as Element);
    }

    return this.wrapInDocumentXml(wordContent);
  }

  private processHtmlElement(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'p':
        return this.createParagraph(element.textContent || '');
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return this.createHeading(element.textContent || '', tagName);
      case 'table':
        return this.createTable(element);
      case 'ul':
      case 'ol':
        return this.createList(element, tagName === 'ol');
      default:
        return this.createParagraph(element.textContent || '');
    }
  }

  private createParagraph(text: string): string {
    return `<w:p><w:r><w:t>${this.escapeXml(text)}</w:t></w:r></w:p>`;
  }

  private createHeading(text: string, level: string): string {
    const headingLevel = level.charAt(1); // h1 -> 1, h2 -> 2, etc.
    return `<w:p>
      <w:pPr>
        <w:pStyle w:val="Heading${headingLevel}"/>
      </w:pPr>
      <w:r><w:t>${this.escapeXml(text)}</w:t></w:r>
    </w:p>`;
  }

  private createTable(tableElement: Element): string {
    let tableXml = '<w:tbl>';
    
    const rows = tableElement.querySelectorAll('tr');
    rows.forEach(row => {
      tableXml += '<w:tr>';
      const cells = row.querySelectorAll('td, th');
      cells.forEach(cell => {
        tableXml += `<w:tc>
          <w:p><w:r><w:t>${this.escapeXml(cell.textContent || '')}</w:t></w:r></w:p>
        </w:tc>`;
      });
      tableXml += '</w:tr>';
    });
    
    tableXml += '</w:tbl>';
    return tableXml;
  }

  private createList(listElement: Element, isOrdered: boolean): string {
    let listXml = '';
    const items = listElement.querySelectorAll('li');
    
    items.forEach(item => {
      listXml += `<w:p>
        <w:pPr>
          <w:numPr>
            <w:ilvl w:val="0"/>
            <w:numId w:val="${isOrdered ? '1' : '2'}"/>
          </w:numPr>
        </w:pPr>
        <w:r><w:t>${this.escapeXml(item.textContent || '')}</w:t></w:r>
      </w:p>`;
    });
    
    return listXml;
  }

  private wrapInDocumentXml(content: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${content}
  </w:body>
</w:document>`;
  }

  private escapeXml(text: string): string {
    const xmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };
    return text.replace(/[&<>"']/g, (match) => xmlEscapes[match]);
  }
}