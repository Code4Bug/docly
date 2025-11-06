import { type TiptapDocument, WordToTiptapConverter } from '../converters/WordToTiptapConverter';

/**
 * Word XML 生成器
 * 专门负责将结构化数据转换为Word XML
 */
export class WordXmlGenerator {

  /**
   * 从TiptapDocument生成Word XML (推荐方法)
   */
  generateFromTiptap(tiptapDoc: TiptapDocument): string {
    // 直接使用WordToTiptapConverter的逆向转换，得到的是 body 内容
    const converter = new WordToTiptapConverter();
    const bodyXml = converter.convertTiptapJsonToWordXml(tiptapDoc);
    // 需要包装为完整的 document.xml 结构，否则Word会显示为空白
    return this.wrapInDocumentXml(bodyXml);
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