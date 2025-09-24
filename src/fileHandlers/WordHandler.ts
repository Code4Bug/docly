import JSZip from 'jszip';
import type { EditorData, Comment } from '../types';

/**
 * Word文档处理器
 * 基于JSZip实现完整的DOCX文件生成
 */
export class WordHandler {
  /**
   * 导入Word文档并转换为Editor.js数据
   * @param file - 要导入的Word文档文件
   * @returns Promise<EditorData> - 转换后的Editor.js数据
   */
  async import(file: File): Promise<EditorData> {
    try {
      console.log('开始导入Word文档:', file.name);
      
      // 读取DOCX文件
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // 提取document.xml文件
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (!documentXml) {
        throw new Error('无法找到Word文档内容');
      }
  
      // 解析XML并转换为Editor.js数据
      const editorData = this.parseWordXmlToEditorData(documentXml);

      const commentXml = await zip.file('word/comments.xml')?.async('text');
      if (commentXml) {
        editorData.comments = this.parseWordXmlToComments(commentXml, documentXml);
      }
      
      console.log('Word文档导入成功:', editorData);
      return editorData;
    } catch (error) {
      console.error('导入Word文档时发生错误:', error);
      throw new Error(`导入失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从主文档XML中提取批注范围对应的原文
   * @param documentXml - 主文档XML内容
   * @param commentRangeTextMap - 批注ID到原文的映射
   */
  private extractCommentRangeText(documentXml: string, commentRangeTextMap: Map<string, string>): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(documentXml, 'text/xml');
    
    // 查找所有批注范围标记
    const commentRangeStarts = doc.querySelectorAll('w\\:commentRangeStart, commentRangeStart');
    const commentRangeEnds = doc.querySelectorAll('w\\:commentRangeEnd, commentRangeEnd');
    
    console.log(`找到 ${commentRangeStarts.length} 个批注范围开始标记，${commentRangeEnds.length} 个结束标记`);
    
    // 为每个批注范围提取文本
    commentRangeStarts.forEach(start => {
      const commentId = start.getAttribute('w:id') || start.getAttribute('id');
      if (!commentId) return;
      
      // 查找对应的结束标记
      const endMarker = Array.from(commentRangeEnds).find(end => 
        (end.getAttribute('w:id') || end.getAttribute('id')) === commentId
      );
      
      if (endMarker) {
        // 提取范围内的文本
        const rangeText = this.extractTextBetweenNodes(start, endMarker);
        if (rangeText.trim()) {
          commentRangeTextMap.set(commentId, rangeText.trim());
          console.log(`批注 ${commentId} 的原文: "${rangeText.trim()}"`);
        } else {
          console.warn(`批注 ${commentId} 未找到原文内容`);
        }
      } else {
        console.warn(`批注 ${commentId} 未找到对应的结束标记`);
      }
    });
    
    console.log(`成功提取 ${commentRangeTextMap.size} 个批注的原文`);
  }

  /**
   * 提取两个节点之间的文本内容
   * @param startNode - 开始节点
   * @param endNode - 结束节点
   * @returns 提取的文本内容
   */
  private extractTextBetweenNodes(startNode: Element, endNode: Element): string {
    let text = '';
    let currentNode: Node | null = startNode.nextSibling;
    
    // 如果开始和结束节点在同一个父节点下，直接遍历兄弟节点
    while (currentNode && currentNode !== endNode) {
      text += this.extractTextFromNode(currentNode);
      currentNode = currentNode.nextSibling;
    }
    
    // 如果没有找到文本，尝试在更大的范围内查找
    if (!text.trim() && startNode.parentNode && endNode.parentNode) {
      const parent = startNode.parentNode;
      
      // 手动遍历DOM树来查找文本
      let foundStart = false;
      const traverseNodes = (node: Node): void => {
        if (node === startNode) {
          foundStart = true;
          return;
        }
        
        if (node === endNode) {
          foundStart = false;
          return;
        }
        
        if (foundStart) {
          text += this.extractTextFromNode(node);
        }
        
        // 递归遍历子节点
        for (let child = node.firstChild; child; child = child.nextSibling) {
          traverseNodes(child);
        }
      };
      
      traverseNodes(parent);
    }
    
    return text;
  }

  /**
   * 从单个节点中提取文本内容
   * @param node - 要提取文本的节点
   * @returns 提取的文本内容
   */
  private extractTextFromNode(node: Node): string {
    let text = '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // 查找Word文档中的文本元素
      const textElements = element.querySelectorAll('w\\:t, t');
      if (textElements.length > 0) {
        textElements.forEach(textEl => {
          text += textEl.textContent || '';
        });
      } else {
        // 如果没有找到特定的文本元素，递归处理子节点
        for (let child = element.firstChild; child; child = child.nextSibling) {
          text += this.extractTextFromNode(child);
        }
      }
    }
    
    return text;
  }

  /**
   * 解析Word XML中的注释并转换为Editor.js格式
   * @param xmlContent - Word文档的XML内容
   * @param documentXml - 主文档XML内容，用于提取批注对应的原文
   * @returns Editor.js注释数据
   */
  private parseWordXmlToComments(xmlContent: string, documentXml?: string): EditorData['comments'] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    const comments: EditorData['comments'] = [];
    
    // 如果有主文档XML，解析批注范围映射
    const commentRangeTextMap = new Map<string, string>();
    if (documentXml) {
      this.extractCommentRangeText(documentXml, commentRangeTextMap);
    }
    
    // 获取所有注释元素
    const commentElements = doc.querySelectorAll('w\\:comment, comment');
    
    commentElements.forEach((comment) => {
      const commentId = comment.getAttribute('w:id') || comment.getAttribute('id');
      const commentAuthor = comment.getAttribute('w:author') || comment.getAttribute('author');
      const commentDate = comment.getAttribute('w:date') || comment.getAttribute('date');
      const commentInitials = comment.getAttribute('w:initials') || comment.getAttribute('initials');
      
      // 提取批注的文本内容
      let commentContent = '';
      const textElements = comment.querySelectorAll('w\\:t, t');
      textElements.forEach(textEl => {
        commentContent += textEl.textContent || '';
      });
      
      // 如果没有找到w:t元素，使用整个注释的文本内容
      if (!commentContent.trim()) {
        commentContent = comment.textContent || '';
      }
      
      // 获取批注对应的原文
      const originalText = commentRangeTextMap.get(commentId || '') || '';
      console.log(`批注 ${commentId} 对应的原文: "${originalText}"`);
      
      // 解析时间戳
      let timestamp = Date.now();
      if (commentDate) {
        const parsedDate = new Date(commentDate);
        if (!isNaN(parsedDate.getTime())) {
          timestamp = parsedDate.getTime();
        }
      }
      
      // 创建批注对象
      const commentObj: Comment = {
        id: commentId || `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: commentContent.trim(),
        user: commentAuthor || '未知作者',
        timestamp: timestamp,
        range: {
          startOffset: 0,
          endOffset: originalText.length || commentContent.trim().length,
          text: originalText || commentContent.trim()
        },
        // Word文档特有字段
        author: commentAuthor || '未知作者',
        date: commentDate || new Date(timestamp).toISOString(),
        initials: commentInitials || (commentAuthor ? commentAuthor.substring(0, 2).toUpperCase() : 'UN'),
        resolved: false
      };
      
      // 检查是否有回复批注（嵌套的批注）
      const replyElements = comment.querySelectorAll('w\\:comment, comment');
      if (replyElements.length > 1) {
        commentObj.replies = [];
        // 跳过第一个元素（它是父批注本身）
        for (let i = 1; i < replyElements.length; i++) {
          const reply = replyElements[i];
          const replyId = reply.getAttribute('w:id') || reply.getAttribute('id');
          const replyAuthor = reply.getAttribute('w:author') || reply.getAttribute('author');
          const replyDate = reply.getAttribute('w:date') || reply.getAttribute('date');
          
          let replyContent = '';
          const replyTextElements = reply.querySelectorAll('w\\:t, t');
          replyTextElements.forEach(textEl => {
            replyContent += textEl.textContent || '';
          });
          
          if (!replyContent.trim()) {
            replyContent = reply.textContent || '';
          }
          
          let replyTimestamp = Date.now();
          if (replyDate) {
            const parsedReplyDate = new Date(replyDate);
            if (!isNaN(parsedReplyDate.getTime())) {
              replyTimestamp = parsedReplyDate.getTime();
            }
          }
          
          commentObj.replies.push({
            id: replyId || `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: replyContent.trim(),
            user: replyAuthor || '未知作者',
            timestamp: replyTimestamp,
            range: {
              startOffset: 0,
              endOffset: replyContent.trim().length,
              text: replyContent.trim()
            },
            author: replyAuthor || '未知作者',
            date: replyDate || new Date(replyTimestamp).toISOString(),
            parentId: commentObj.id,
            resolved: false
          });
        }
      }
      
      comments.push(commentObj);
    });
    
    console.log(`从Word文档中提取了 ${comments.length} 个批注`);
    return comments;
  }

  /**
   * 导出Editor.js数据为Word文档
   * @param editorData - Editor.js的数据
   * @param filename - 导出的文件名
   */
  async export(editorData: EditorData, filename: string = 'document'): Promise<{ blob: Blob; name: string }> {
    try {
      console.log('开始导出Word文档:', editorData);
      
      // 将Editor.js数据转换为HTML
      const htmlContent = this.convertEditorDataToHtml(editorData);
      console.log('转换后的HTML:', htmlContent);
      
      // 将HTML转换为Word XML
      const wordXml = this.htmlToWordXml(htmlContent);
      
      // 生成完整的DOCX文件
      const docxBlob = await this.generateDocxFile(wordXml);
      
      // 返回文件对象
      const finalFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
      
      console.log('Word文档导出成功:', finalFilename);
      return { blob: docxBlob, name: finalFilename };
    } catch (error) {
      console.error('导出Word文档时发生错误:', error);
      throw error;
    }
  }

  /**
   * 解析Word XML并转换为Editor.js数据
   * @param xmlContent - Word文档的XML内容
   * @param commentsXml - Word文档的批注XML内容（可选）
   * @returns Editor.js数据
   */
  private parseWordXmlToEditorData(xmlContent: string, commentsXml?: string): EditorData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    console.log('解析后的XML文档:', doc);
    const blocks: any[] = []
    
    // 获取所有段落元素
    const paragraphs = doc.querySelectorAll('w\\:p, p');
    
    paragraphs.forEach((p, index) => {
      const blockId = `block-${Date.now()}-${index}`;
      
      // 解析段落属性
      const pPrElement = p.querySelector('w\\:pPr, pPr');
      const paragraphStyles = this.parseParagraphProperties(pPrElement);
      
      // 检查是否是标题
      const styleElement = pPrElement?.querySelector('w\\:pStyle, pStyle');
      const styleVal = styleElement?.getAttribute('w:val') || styleElement?.getAttribute('val'); 
      
      // 解析格式化的文本运行
      const formattedRuns = this.parseFormattedTextRuns(p);
      
      // 提取批注信息
      const blockCommentIds: string[] = [];
      const commentRefs = p.querySelectorAll('w\\:commentReference, commentReference');
      commentRefs.forEach(ref => {
        const commentId = ref.getAttribute('w:id') || ref.getAttribute('id');
        if (commentId) {
          blockCommentIds.push(commentId);
        }
      });
      
      // 合并所有文本运行的文本内容
      let combinedText = '';
      if (formattedRuns.length > 0) {
        combinedText = formattedRuns.map(run => run.text).join('');
      } else {
        // 如果没有格式化运行，使用传统方法提取文本
        const textElements = p.querySelectorAll('w\\:t, t');
        textElements.forEach(t => {
          combinedText += t.textContent || '';
        });
      }
      
      // 跳过空段落
      if (!combinedText.trim()) {
        return;
      }
      
      // 创建基础块数据
      let blockData: any = {
        id: blockId,
        data: {
          text: combinedText.trim(),
          // 保存段落样式
          paragraphStyles: paragraphStyles,
          // 保存格式化的文本运行信息
          formattedRuns: formattedRuns.length > 0 ? formattedRuns : undefined
        }
      };
      
      // 如果有关联的批注，添加批注ID信息
      if (blockCommentIds.length > 0) {
        blockData.data.commentIds = blockCommentIds;
      }
      
      // 根据样式确定块类型
      if (styleVal && styleVal.startsWith('Heading')) {
        const level = parseInt(styleVal.replace('Heading', '')) || 1;
        blockData.type = 'header';
        blockData.data.level = Math.min(level, 6);
      } else if (styleVal === 'Quote') {
        blockData.type = 'quote';
        blockData.data.caption = '';
        blockData.data.alignment = 'left';
      } else {
        // 默认为段落
        blockData.type = 'paragraph';
      }
      
      blocks.push(blockData);
    });
    
    // 处理表格
    const tables = doc.querySelectorAll('w\\:tbl, tbl');
    tables.forEach((table, index) => {
      const blockId = `table-${Date.now()}-${index}`;
      const rows = table.querySelectorAll('w\\:tr, tr');
      const content: string[][] = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('w\\:tc, tc');
        const rowData: string[] = [];
        
        cells.forEach(cell => {
          const cellTexts = cell.querySelectorAll('w\\:t, t');
          let cellText = '';
          cellTexts.forEach(t => {
            cellText += t.textContent || '';
          });
          rowData.push(cellText.trim());
        });
        
        if (rowData.length > 0) {
          content.push(rowData);
        }
      });
      
      if (content.length > 0) {
        blocks.push({
          id: blockId,
          type: 'table',
          data: {
            withHeadings: true,
            content
          }
        });
      }
    });
    
    // 解析批注信息（如果提供了批注XML）
    let comments: Comment[] = [];
    if (commentsXml) {
      const parsedComments = this.parseWordXmlToComments(commentsXml, xmlContent);
      comments = parsedComments || [];
    }
    
    return {
      time: Date.now(),
      blocks,
      version: '2.28.2',
      comments
    };
  }
  
  /**
   * 将Editor.js数据转换为HTML字符串
   * @param editorData - Editor.js数据
   * @returns HTML字符串
   */
  private convertEditorDataToHtml(editorData: EditorData): string {
    /**
     * 将Editor.js数据块转换为HTML
     * @param blocks - Editor.js数据块数组
     * @returns 转换后的HTML字符串
     */
    const blocksToHtml = (blocks: any[]) => {
      return blocks.map(block => {
        // 优先使用保存的htmlContent（包含完整样式）
        if (block.data && block.data.htmlContent) {
          console.log('使用保存的htmlContent:', block.data.htmlContent);
          
          // 检查htmlContent是否已经有合适的标签包装
          const htmlContent = block.data.htmlContent.trim();
          
          // 根据块类型处理HTML内容
          switch (block.type) {
            case "header":
              const level = block.data.level || 1;
              // 如果htmlContent已经是div，替换为对应的header标签
              if (htmlContent.startsWith('<div>') && htmlContent.endsWith('</div>')) {
                const innerContent = htmlContent.slice(5, -6); // 移除<div>和</div>
                return `<h${level}>${innerContent}</h${level}>`;
              }
              return `<h${level}>${htmlContent}</h${level}>`;
            case "paragraph":
              // 如果htmlContent已经是div，替换为p标签
              if (htmlContent.startsWith('<div>') && htmlContent.endsWith('</div>')) {
                const innerContent = htmlContent.slice(5, -6); // 移除<div>和</div>
                return `<p>${innerContent}</p>`;
              }
              // 如果已经是p标签，直接返回
              if (htmlContent.startsWith('<p>') && htmlContent.endsWith('</p>')) {
                return htmlContent;
              }
              return `<p>${htmlContent}</p>`;
            case "list":
              // 对于列表，htmlContent可能已经包含了完整的列表结构
              if (htmlContent.includes('<li>')) {
                const tag = block.data.style === "ordered" ? "ol" : "ul";
                return `<${tag}>${htmlContent}</${tag}>`;
              }
              return htmlContent.startsWith('<div>') ? htmlContent : `<div>${htmlContent}</div>`;
            case "quote":
              if (htmlContent.startsWith('<div>') && htmlContent.endsWith('</div>')) {
                const innerContent = htmlContent.slice(5, -6);
                return `<blockquote>${innerContent}</blockquote>`;
              }
              return `<blockquote>${htmlContent}</blockquote>`;
            case "code":
              if (htmlContent.startsWith('<div>') && htmlContent.endsWith('</div>')) {
                const innerContent = htmlContent.slice(5, -6);
                return `<pre><code>${innerContent}</code></pre>`;
              }
              return `<pre><code>${htmlContent}</code></pre>`;
            default:
              return htmlContent.startsWith('<div>') ? htmlContent : `<div>${htmlContent}</div>`;
          }
        }
        
        // 回退到原来的处理方式
        const blockStyles = this.extractBlockStyles(block);
        
        switch (block.type) {
          case "header":
            const level = block.data.level || 1;
            const headerStyle = `font-weight:bold; margin:12px 0;${blockStyles ? ` ${blockStyles}` : ''}`;
            return `<h${level} style="${headerStyle}">${this.escapeHtml(block.data.text || '')}</h${level}>`;
          case "paragraph":
            const paragraphStyle = `line-height:1.6; margin:8px 0;${blockStyles ? ` ${blockStyles}` : ''}`;
            return `<p style="${paragraphStyle}">${this.processInlineFormatting(block.data.text || '')}</p>`;
          case "list":
            const tag = block.data.style === "ordered" ? "ol" : "ul";
            const listStyle = `padding-left:20px;${blockStyles ? ` ${blockStyles}` : ''}`;
            const listItems = (block.data.items || []).map((item: string) => `<li>${this.processInlineFormatting(item)}</li>`).join("");
            return `<${tag} style="${listStyle}">${listItems}</${tag}>`;
          case "image":
            const figureStyle = `text-align:center;${blockStyles ? ` ${blockStyles}` : ''}`;
            return `<figure style="${figureStyle}">
                      <img src="${block.data.url}" alt="${block.data.caption || ""}" style="max-width:100%;"/>
                      ${block.data.caption ? `<figcaption>${this.escapeHtml(block.data.caption)}</figcaption>` : ""}
                    </figure>`;
          case "quote":
            const quoteStyle = `border-left:4px solid #ccc; padding-left:16px; margin:16px 0; font-style:italic;${blockStyles ? ` ${blockStyles}` : ''}`;
            return `<blockquote style="${quoteStyle}">${this.processInlineFormatting(block.data.text || '')}</blockquote>`;
          case "code":
            const codeStyle = `background-color:#f5f5f5; padding:12px; border-radius:4px; font-family:monospace;${blockStyles ? ` ${blockStyles}` : ''}`;
            return `<pre style="${codeStyle}"><code>${this.escapeHtml(block.data.code || '')}</code></pre>`;
          case "table":
            if (block.data.content && Array.isArray(block.data.content)) {
              const tableStyle = `border-collapse:collapse; width:100%;${blockStyles ? ` ${blockStyles}` : ''}`;
              const tableRows = block.data.content.map((row: string[]) => {
                const cells = row.map(cell => `<td style="border:1px solid #ddd; padding:8px;">${this.processInlineFormatting(cell)}</td>`).join('');
                return `<tr>${cells}</tr>`;
              }).join('');
              return `<table style="${tableStyle}"><tbody>${tableRows}</tbody></table>`;
            }
            break;
          default:
            // 处理未知类型的块
            if (block.data && block.data.text) {
              const defaultStyle = `margin:8px 0;${blockStyles ? ` ${blockStyles}` : ''}`;
              return `<div style="${defaultStyle}">${this.processInlineFormatting(block.data.text)}</div>`;
            }
            return "";
        }
      }).join("\n");
    };
    
    return blocksToHtml(editorData.blocks);
  }

  /**
   * 提取块级样式
   * @param block - Editor.js块数据
   * @returns CSS样式字符串
   */
  private extractBlockStyles(block: any): string {
    const styles: string[] = [];
    
    // 检查块的tunes或其他样式配置
    if (block.tunes) {
      // 文本对齐
      if (block.tunes.textAlign) {
        styles.push(`text-align: ${block.tunes.textAlign}`);
      }
      
      // 字体样式
      if (block.tunes.fontSize) {
        styles.push(`font-size: ${block.tunes.fontSize}px`);
      }
      
      // 颜色
      if (block.tunes.color) {
        styles.push(`color: ${block.tunes.color}`);
      }
      
      // 背景色
      if (block.tunes.backgroundColor) {
        styles.push(`background-color: ${block.tunes.backgroundColor}`);
      }
      
      // 字体粗细
      if (block.tunes.fontWeight) {
        styles.push(`font-weight: ${block.tunes.fontWeight}`);
      }
      
      // 字体样式
      if (block.tunes.fontStyle) {
        styles.push(`font-style: ${block.tunes.fontStyle}`);
      }
      
      // 字体家族
      if (block.tunes.fontFamily) {
        styles.push(`font-family: ${block.tunes.fontFamily}`);
      }
    }
    
    // 检查data中的样式信息
    if (block.data) {
      if (block.data.alignment) {
        styles.push(`text-align: ${block.data.alignment}`);
      }
      
      if (block.data.fontSize) {
        styles.push(`font-size: ${block.data.fontSize}px`);
      }
      
      if (block.data.color) {
        styles.push(`color: ${block.data.color}`);
      }
      
      if (block.data.backgroundColor) {
        styles.push(`background-color: ${block.data.backgroundColor}`);
      }
      
      if (block.data.fontWeight) {
        styles.push(`font-weight: ${block.data.fontWeight}`);
      }
      
      if (block.data.fontStyle) {
        styles.push(`font-style: ${block.data.fontStyle}`);
      }
      
      if (block.data.fontFamily) {
        styles.push(`font-family: ${block.data.fontFamily}`);
      }
    }
    
    return styles.join('; ');
  }
  
  /**
   * 处理内联格式化标记
   * @param text - 包含内联格式的文本
   * @returns 处理后的HTML文本
   */
  /**
   * 处理内联格式化，保留所有内联样式
   * @param text - 包含HTML标记的文本
   * @returns 处理后的HTML文本
   */
  private processInlineFormatting(text: string): string {
    if (!text) return '';
    
    // 直接返回原始HTML，保留所有内联样式和标记
    // Editor.js会生成包含样式的HTML，我们需要完整保留这些信息
    let processedText = text;
    
    // 只进行必要的标签标准化，保留所有样式属性
    processedText = processedText.replace(/<b([^>]*)>/g, '<strong$1>');
    processedText = processedText.replace(/<\/b>/g, '</strong>');
    processedText = processedText.replace(/<i([^>]*)>/g, '<em$1>');
    processedText = processedText.replace(/<\/i>/g, '</em>');
    
    // 保留所有span标签和style属性
    // 不对span标签进行任何修改，确保内联样式完整保留
    
    return processedText;
  }

  /**
   * HTML转义
   * @param text - 需要转义的文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 解析内联样式
   * @param styleString - CSS样式字符串
   * @returns 样式对象
   */
  private parseInlineStyles(styleString: string): Record<string, string> {
    const styles: Record<string, string> = {};
    if (!styleString) return styles;
    
    styleString.split(';').forEach(style => {
      const [property, value] = style.split(':').map(s => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    });
    
    return styles;
  }

  /**
   * 转换颜色格式（从CSS到Word）
   * @param cssColor - CSS颜色值
   * @returns Word颜色值
   */
  private convertColor(cssColor: string): string | null {
    if (!cssColor) return null;
    
    // 如果是hex颜色
    if (cssColor.startsWith('#')) {
      return cssColor.substring(1).toUpperCase();
    }
    
    // 如果是rgb颜色
    const rgbMatch = cssColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1).toUpperCase();
    }
    
    // 预定义颜色映射
    const colorMap: Record<string, string> = {
      'red': 'FF0000',
      'blue': '0000FF',
      'green': '008000',
      'black': '000000',
      'white': 'FFFFFF'
    };
    
    return colorMap[cssColor.toLowerCase()] || null;
  }

  /**
   * 转换字体大小（从CSS到Word半点）
   * @param cssSize - CSS字体大小
   * @returns Word字体大小（半点）
   */
  private convertFontSize(cssSize: string): number | null {
    if (!cssSize) return null;
    
    const pxMatch = cssSize.match(/(\d+)px/);
    if (pxMatch) {
      // 标准转换：1px = 0.75pt，Word使用半点单位，所以需要 * 0.75 * 2 = 1.5
      return Math.round(parseInt(pxMatch[1]) * 0.75 * 2); // px to pt * 2 (半点)
    }
    
    const ptMatch = cssSize.match(/(\d+)pt/);
    if (ptMatch) {
      return parseInt(ptMatch[1]) * 2; // pt * 2 (半点)
    }
    
    return null;
  }

  /**
   * HTML元素到Word XML的转换
   * @param htmlString - HTML字符串
   * @returns Word XML字符串
   */
  private htmlToWordXml(htmlString: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${htmlString}</div>`, 'text/html');
    let wordXml = '';
    
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          return `<w:t xml:space="preserve">${this.escapeXml(text)}</w:t>`;
        }
        return '';
      }
      
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }
      
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const styles = this.parseInlineStyles(element.getAttribute('style') || '');
      
      // 处理不同的HTML标签
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const headingLevel = parseInt(tagName.charAt(1));
          const headingSize = Math.max(28 - (headingLevel - 1) * 4, 16) * 2; // 半点
          return `<w:p>
            <w:pPr>
              <w:pStyle w:val="Heading${headingLevel}"/>
              <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="${headingSize}"/>
                <w:szCs w:val="${headingSize}"/>
                ${styles.color ? `<w:color w:val="${this.convertColor(styles.color)}"/>` : ''}
              </w:rPr>
              ${this.processChildNodes(element)}
            </w:r>
          </w:p>`;
        
        case 'p':
          // 为段落添加默认样式
          const defaultParagraphStyles = {
            'font-size': '11pt',
            'font-family': 'Calibri',
            ...styles
          };
          return `<w:p>
            <w:pPr>
              ${styles['text-align'] === 'center' ? '<w:jc w:val="center"/>' : ''}
              ${styles['text-align'] === 'right' ? '<w:jc w:val="right"/>' : ''}
              ${styles['text-align'] === 'justify' ? '<w:jc w:val="both"/>' : ''}
              <w:spacing w:after="120"/>
            </w:pPr>
            ${this.processRunContent(element, defaultParagraphStyles)}
          </w:p>`;
        
        case 'div':
          // 将div当作段落处理，无论是否有子元素
          const defaultDivStyles = {
            'font-size': '11pt',
            'font-family': 'Calibri',
            ...styles
          };
          return `<w:p>
            <w:pPr>
              ${styles['text-align'] === 'center' ? '<w:jc w:val="center"/>' : ''}
              ${styles['text-align'] === 'right' ? '<w:jc w:val="right"/>' : ''}
              ${styles['text-align'] === 'justify' ? '<w:jc w:val="both"/>' : ''}
            </w:pPr>
            ${this.processRunContent(element, defaultDivStyles)}
          </w:p>`
        
        case 'ul':
        case 'ol':
          let listContent = '';
          Array.from(element.children).forEach((li) => {
            if (li.tagName.toLowerCase() === 'li') {
              listContent += `<w:p>
                <w:pPr>
                  <w:pStyle w:val="ListParagraph"/>
                  <w:numPr>
                    <w:ilvl w:val="0"/>
                    <w:numId w:val="${tagName === 'ul' ? '1' : '2'}"/>
                  </w:numPr>
                </w:pPr>
                <w:r>
                  <w:t xml:space="preserve">${this.escapeXml(li.textContent || '')}</w:t>
                </w:r>
              </w:p>`;
            }
          });
          return listContent;
        
        case 'blockquote':
          return `<w:p>
            <w:pPr>
              <w:pStyle w:val="Quote"/>
              <w:ind w:left="720"/>
              <w:spacing w:after="120"/>
            </w:pPr>
            ${this.processRunContent(element, styles)}
          </w:p>`;
        
        case 'pre':
        case 'code':
          return `<w:p>
            <w:pPr>
              <w:spacing w:after="120"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>
                <w:shading w:fill="F5F5F5"/>
              </w:rPr>
              <w:t xml:space="preserve">${this.escapeXml(element.textContent || '')}</w:t>
            </w:r>
          </w:p>`;
        
        case 'table':
          let tableContent = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>';
          Array.from(element.children).forEach(row => {
            if (row.tagName.toLowerCase() === 'tr') {
              tableContent += '<w:tr>';
              Array.from(row.children).forEach(cell => {
                if (cell.tagName.toLowerCase() === 'td') {
                  tableContent += `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r><w:t>${this.escapeXml(cell.textContent || '')}</w:t></w:r></w:p></w:tc>`;
                }
              });
              tableContent += '</w:tr>';
            }
          });
          tableContent += '</w:tbl>';
          return tableContent;
        
        case 'br':
          return '<w:br/>';
        
        default:
          return this.processRunContent(element, styles);
      }
    };
    
    // 处理根节点
    const rootDiv = doc.querySelector('div');
    if (rootDiv) {
      Array.from(rootDiv.childNodes).forEach(child => {
        wordXml += processNode(child);
      });
    }
    
    return wordXml;
  }

  /**
   * 处理运行内容
   * @param node - DOM节点
   * @param parentStyles - 父级样式
   * @returns Word XML字符串
   */
  private processRunContent(node: Element, parentStyles: Record<string, string> = {}): string {
    let runs = '';
    
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (text?.trim()) {
          runs += this.createRun(text, parentStyles);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const tagName = element.tagName.toLowerCase();
        const childStyles = Object.assign({}, parentStyles, this.parseInlineStyles(element.getAttribute('style') || ''));
        
        switch (tagName) {
          case 'strong':
          case 'b':
            childStyles.fontWeight = 'bold';
            break;
          case 'em':
          case 'i':
            childStyles.fontStyle = 'italic';
            break;
          case 'u':
            childStyles.textDecoration = 'underline';
            break;
          case 'mark':
            childStyles.backgroundColor = '#FFFF00';
            break;
          case 'code':
            childStyles.fontFamily = 'Courier New';
            childStyles.backgroundColor = '#F5F5F5';
            break;
          case 'span':
            // span标签直接继承样式
            break;
        }
        
        runs += this.processRunContent(element, childStyles);
      }
    });
    
    return runs;
  }

  /**
   * 创建Word运行元素
   * @param text - 文本内容
   * @param styles - 样式对象
   * @returns Word XML字符串
   */
  private createRun(text: string, styles: Record<string, string>): string {
    const fontSize = this.convertFontSize(styles['font-size']);
    const color = this.convertColor(styles.color);
    const backgroundColor = this.convertColor(styles['background-color']);
    
    // 处理背景色的高亮效果
    let highlightXml = '';
    if (backgroundColor) {
      // 根据背景色选择合适的高亮颜色
      const bgColorLower = backgroundColor.toLowerCase();
      if (bgColorLower === 'ffff00' || bgColorLower === 'yellow') {
        highlightXml = '<w:highlight w:val="yellow"/>';
      } else if (bgColorLower === '00ff00' || bgColorLower === 'lime' || bgColorLower === 'green') {
        highlightXml = '<w:highlight w:val="green"/>';
      } else if (bgColorLower === '00ffff' || bgColorLower === 'cyan' || bgColorLower === 'aqua') {
        highlightXml = '<w:highlight w:val="cyan"/>';
      } else if (bgColorLower === 'ff00ff' || bgColorLower === 'magenta' || bgColorLower === 'fuchsia') {
        highlightXml = '<w:highlight w:val="magenta"/>';
      } else if (bgColorLower === 'ffa500' || bgColorLower === 'orange') {
        highlightXml = '<w:highlight w:val="yellow"/>';
      } else if (bgColorLower === 'f5f5f5' || bgColorLower === 'lightgray' || bgColorLower === 'lightgrey') {
        highlightXml = '<w:highlight w:val="lightGray"/>';
      } else {
        // 默认使用黄色高亮
        highlightXml = '<w:highlight w:val="yellow"/>';
      }
    }
    
    return `<w:r>
      <w:rPr>
        ${styles.fontWeight === 'bold' ? '<w:b/>' : ''}
        ${styles.fontStyle === 'italic' ? '<w:i/>' : ''}
        ${styles.textDecoration === 'underline' ? '<w:u w:val="single"/>' : ''}
        ${fontSize ? `<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>` : ''}
        ${color ? `<w:color w:val="${color}"/>` : ''}
        ${highlightXml}
        ${styles['font-family'] ? `<w:rFonts w:ascii="${styles['font-family']}" w:hAnsi="${styles['font-family']}"/>` : ''}
      </w:rPr>
      <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
    </w:r>`;
  }

  /**
   * 处理子节点文本内容
   * @param node - DOM节点
   * @returns 转义后的文本
   */
  private processChildNodes(node: Element): string {
    let result = '';
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        result += this.escapeXml(child.textContent || '');
      }
    });
    return result;
  }

  /**
   * XML转义
   * @param text - 需要转义的文本
   * @returns 转义后的文本
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
   * 生成完整的DOCX文件
   * @param wordContent - Word XML内容
   * @returns DOCX文件的Blob对象
   */
  private async generateDocxFile(wordContent: string): Promise<Blob> {
    const zip = new JSZip();
    
    // _rels/.rels
    zip.folder('_rels')!.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    
    // [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
    <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`);
    
    // word/_rels/document.xml.rels
    zip.folder('word')!.folder('_rels')!.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`);
    
    // word/document.xml (主文档)
    zip.folder('word')!.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        ${wordContent}
        <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
            <w:cols w:space="708"/>
        </w:sectPr>
    </w:body>
</w:document>`);
    
    // word/styles.xml
    zip.folder('word')!.file('styles.xml', this.getStylesXml());
    
    // word/settings.xml
    zip.folder('word')!.file('settings.xml', this.getSettingsXml());
    
    // word/fontTable.xml
    zip.folder('word')!.file('fontTable.xml', this.getFontTableXml());
    
    // 生成ZIP文件
    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  /**
   * 获取样式XML内容
   * @returns 样式XML字符串
   */
  private getStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
        <w:rPrDefault>
            <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:cs="Times New Roman"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
                <w:lang w:val="zh-CN" w:eastAsia="zh-CN" w:bidi="ar-SA"/>
            </w:rPr>
        </w:rPrDefault>
    </w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
        <w:pPr>
            <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
        </w:pPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:basedOn w:val="Normal"/>
        <w:next w:val="Normal"/>
        <w:link w:val="Heading1Char"/>
        <w:uiPriority w:val="9"/>
        <w:qFormat/>
        <w:pPr>
            <w:keepNext/>
            <w:keepLines/>
            <w:spacing w:before="480" w:after="0"/>
            <w:outlineLvl w:val="0"/>
        </w:pPr>
        <w:rPr>
            <w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
            <w:b/>
            <w:bCs/>
            <w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/>
            <w:sz w:val="32"/>
            <w:szCs w:val="32"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading2">
        <w:name w:val="heading 2"/>
        <w:basedOn w:val="Normal"/>
        <w:next w:val="Normal"/>
        <w:link w:val="Heading2Char"/>
        <w:uiPriority w:val="9"/>
        <w:unhideWhenUsed/>
        <w:qFormat/>
        <w:pPr>
            <w:keepNext/>
            <w:keepLines/>
            <w:spacing w:before="200" w:after="0"/>
            <w:outlineLvl w:val="1"/>
        </w:pPr>
        <w:rPr>
            <w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
            <w:b/>
            <w:bCs/>
            <w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/>
            <w:sz w:val="26"/>
            <w:szCs w:val="26"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading3">
        <w:name w:val="heading 3"/>
        <w:basedOn w:val="Normal"/>
        <w:next w:val="Normal"/>
        <w:link w:val="Heading3Char"/>
        <w:uiPriority w:val="9"/>
        <w:unhideWhenUsed/>
        <w:qFormat/>
        <w:pPr>
            <w:keepNext/>
            <w:keepLines/>
            <w:spacing w:before="200" w:after="0"/>
            <w:outlineLvl w:val="2"/>
        </w:pPr>
        <w:rPr>
            <w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
            <w:b/>
            <w:bCs/>
            <w:color w:val="1F4E79" w:themeColor="accent1" w:themeShade="BF"/>
            <w:sz w:val="24"/>
            <w:szCs w:val="24"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Quote">
        <w:name w:val="Quote"/>
        <w:basedOn w:val="Normal"/>
        <w:next w:val="Normal"/>
        <w:link w:val="QuoteChar"/>
        <w:uiPriority w:val="29"/>
        <w:unhideWhenUsed/>
        <w:qFormat/>
        <w:pPr>
            <w:spacing w:after="200"/>
            <w:ind w:left="720" w:right="720"/>
        </w:pPr>
        <w:rPr>
            <w:i/>
            <w:iCs/>
            <w:color w:val="404040" w:themeColor="text1" w:themeTint="BF"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="ListParagraph">
        <w:name w:val="List Paragraph"/>
        <w:basedOn w:val="Normal"/>
        <w:uiPriority w:val="34"/>
        <w:qFormat/>
        <w:pPr>
            <w:ind w:left="720"/>
            <w:contextualSpacing/>
        </w:pPr>
    </w:style>
</w:styles>`;
  }

  /**
   * 获取设置XML内容
   * @returns 设置XML字符串
   */
  private getSettingsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:zoom w:percent="100"/>
    <w:proofState w:spelling="clean" w:grammar="clean"/>
    <w:defaultTabStop w:val="708"/>
    <w:characterSpacingControl w:val="doNotCompress"/>
    <w:compat>
        <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
        <w:compatSetting w:name="overrideTableStyleFontSizeAndJustification" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
        <w:compatSetting w:name="enableOpenTypeFeatures" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
        <w:compatSetting w:name="doNotFlipMirrorIndents" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
        <w:compatSetting w:name="differentiateMultirowTableHeaders" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
    </w:compat>
</w:settings>`;
  }

  /**
   * 获取字体表XML内容
   * @returns 字体表XML字符串
   */
  private getFontTableXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:font w:name="Calibri">
        <w:panose1 w:val="020F0502020204030204"/>
        <w:charset w:val="00"/>
        <w:family w:val="swiss"/>
        <w:pitch w:val="variable"/>
        <w:sig w:usb0="E00002FF" w:usb1="4000ACFF" w:usb2="00000001" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/>
    </w:font>
    <w:font w:name="宋体">
        <w:charset w:val="86"/>
        <w:family w:val="auto"/>
        <w:pitch w:val="variable"/>
        <w:sig w:usb0="00000003" w:usb1="288F0000" w:usb2="00000016" w:usb3="00000000" w:csb0="00040001" w:csb1="00000000"/>
    </w:font>
    <w:font w:name="Microsoft YaHei">
        <w:panose1 w:val="020B0503020204020204"/>
        <w:charset w:val="86"/>
        <w:family w:val="swiss"/>
        <w:pitch w:val="variable"/>
        <w:sig w:usb0="800002BF" w:usb1="38CF7CFA" w:usb2="00000016" w:usb3="00000000" w:csb0="0004001F" w:csb1="00000000"/>
    </w:font>
</w:fonts>`;
  }

  /**
   * 解析段落属性 (w:pPr) 中的样式信息
   * @param pPrElement - 段落属性元素
   * @returns 解析后的段落样式对象
   */
  private parseParagraphProperties(pPrElement: Element | null): any {
    if (!pPrElement) return {};

    const styles: any = {};

    // 解析对齐方式
    const jcElement = pPrElement.querySelector('w\\:jc, jc');
    if (jcElement) {
      const alignment = jcElement.getAttribute('w:val') || jcElement.getAttribute('val');
      switch (alignment) {
        case 'center':
          styles.textAlign = 'center';
          break;
        case 'right':
          styles.textAlign = 'right';
          break;
        case 'justify':
          styles.textAlign = 'justify';
          break;
        case 'left':
        default:
          styles.textAlign = 'left';
          break;
      }
    }

    // 解析行间距
    const spacingElement = pPrElement.querySelector('w\\:spacing, spacing');
    if (spacingElement) {
      const line = spacingElement.getAttribute('w:line') || spacingElement.getAttribute('line');
      const lineRule = spacingElement.getAttribute('w:lineRule') || spacingElement.getAttribute('lineRule');
      
      if (line && lineRule) {
        if (lineRule === 'exact') {
          // 精确行距，单位为 twips (1/20 point)
          styles.lineHeight = `${Math.round(parseInt(line) / 20)}pt`;
        } else if (lineRule === 'atLeast') {
          // 最小行距
          styles.lineHeight = `${Math.round(parseInt(line) / 20)}pt`;
        } else if (lineRule === 'auto') {
          // 自动行距，通常是倍数
          styles.lineHeight = (parseInt(line) / 240).toString();
        }
      }
    }

    // 解析缩进
    const indElement = pPrElement.querySelector('w\\:ind, ind');
    if (indElement) {
      const left = indElement.getAttribute('w:left') || indElement.getAttribute('left');
      const right = indElement.getAttribute('w:right') || indElement.getAttribute('right');
      const firstLine = indElement.getAttribute('w:firstLine') || indElement.getAttribute('firstLine');
      const hanging = indElement.getAttribute('w:hanging') || indElement.getAttribute('hanging');

      if (left) {
        styles.marginLeft = `${Math.round(parseInt(left) / 20)}pt`;
      }
      if (right) {
        styles.marginRight = `${Math.round(parseInt(right) / 20)}pt`;
      }
      if (firstLine) {
        styles.textIndent = `${Math.round(parseInt(firstLine) / 20)}pt`;
      } else if (hanging) {
        styles.textIndent = `-${Math.round(parseInt(hanging) / 20)}pt`;
      }
    }

    // 解析段前段后间距
    const spacingBefore = spacingElement?.getAttribute('w:before') || spacingElement?.getAttribute('before');
    const spacingAfter = spacingElement?.getAttribute('w:after') || spacingElement?.getAttribute('after');
    
    if (spacingBefore) {
      styles.marginTop = `${Math.round(parseInt(spacingBefore) / 20)}pt`;
    }
    if (spacingAfter) {
      styles.marginBottom = `${Math.round(parseInt(spacingAfter) / 20)}pt`;
    }

    return styles;
  }

  /**
   * 解析文本运行属性 (w:rPr) 中的格式信息
   * @param rPrElement - 文本运行属性元素
   * @returns 解析后的文本样式对象
   */
  private parseRunProperties(rPrElement: Element | null): any {
    if (!rPrElement) return {};

    const styles: any = {};

    // 解析字体信息
    const rFontsElement = rPrElement.querySelector('w\\:rFonts, rFonts');
    if (rFontsElement) {
      const fontInfo = this.extractFontDefinitions(rFontsElement);
      if (fontInfo.fontFamily) {
        styles.fontFamily = fontInfo.fontFamily;
      }
    }

    // 解析字体大小
    const szElement = rPrElement.querySelector('w\\:sz, sz');
    if (szElement) {
      const size = szElement.getAttribute('w:val') || szElement.getAttribute('val');
      if (size) {
        // Word中字体大小单位是半点 (half-points)
        styles.fontSize = `${parseInt(size) / 2}pt`;
      }
    }

    // 解析字体颜色
    const colorElement = rPrElement.querySelector('w\\:color, color');
    if (colorElement) {
      const color = colorElement.getAttribute('w:val') || colorElement.getAttribute('val');
      if (color && color !== 'auto') {
        styles.color = `#${color}`;
      }
    }

    // 解析粗体
    const boldElement = rPrElement.querySelector('w\\:b, b');
    if (boldElement) {
      const val = boldElement.getAttribute('w:val') || boldElement.getAttribute('val');
      if (val !== '0' && val !== 'false') {
        styles.fontWeight = 'bold';
      }
    }

    // 解析斜体
    const italicElement = rPrElement.querySelector('w\\:i, i');
    if (italicElement) {
      const val = italicElement.getAttribute('w:val') || italicElement.getAttribute('val');
      if (val !== '0' && val !== 'false') {
        styles.fontStyle = 'italic';
      }
    }

    // 解析下划线
    const underlineElement = rPrElement.querySelector('w\\:u, u');
    if (underlineElement) {
      const val = underlineElement.getAttribute('w:val') || underlineElement.getAttribute('val');
      if (val && val !== 'none') {
        styles.textDecoration = 'underline';
      }
    }

    // 解析删除线
    const strikeElement = rPrElement.querySelector('w\\:strike, strike');
    if (strikeElement) {
      const val = strikeElement.getAttribute('w:val') || strikeElement.getAttribute('val');
      if (val !== '0' && val !== 'false') {
        styles.textDecoration = styles.textDecoration ? 
          `${styles.textDecoration} line-through` : 'line-through';
      }
    }

    // 解析背景色/高亮
    const shdElement = rPrElement.querySelector('w\\:shd, shd');
    if (shdElement) {
      const fill = shdElement.getAttribute('w:fill') || shdElement.getAttribute('fill');
      if (fill && fill !== 'auto' && fill !== 'FFFFFF') {
        styles.backgroundColor = `#${fill}`;
      }
    }

    // 解析上标/下标
    const vertAlignElement = rPrElement.querySelector('w\\:vertAlign, vertAlign');
    if (vertAlignElement) {
      const val = vertAlignElement.getAttribute('w:val') || vertAlignElement.getAttribute('val');
      if (val === 'superscript') {
        styles.verticalAlign = 'super';
      } else if (val === 'subscript') {
        styles.verticalAlign = 'sub';
      }
    }

    return styles;
  }

  /**
   * 从 w:rFonts 元素中提取字体定义信息
   * @param rFontsElement - 字体定义元素
   * @returns 字体信息对象
   */
  private extractFontDefinitions(rFontsElement: Element): any {
    const fontInfo: any = {};

    // 获取各种字体定义
    const ascii = rFontsElement.getAttribute('w:ascii') || rFontsElement.getAttribute('ascii');
    const hAnsi = rFontsElement.getAttribute('w:hAnsi') || rFontsElement.getAttribute('hAnsi');
    const eastAsia = rFontsElement.getAttribute('w:eastAsia') || rFontsElement.getAttribute('eastAsia');
    const cs = rFontsElement.getAttribute('w:cs') || rFontsElement.getAttribute('cs');
    const hint = rFontsElement.getAttribute('w:hint') || rFontsElement.getAttribute('hint');

    // 根据提示选择合适的字体
    if (hint === 'eastAsia' && eastAsia) {
      fontInfo.fontFamily = eastAsia;
      fontInfo.fontType = 'eastAsia';
    } else if (ascii) {
      fontInfo.fontFamily = ascii;
      fontInfo.fontType = 'ascii';
    } else if (hAnsi) {
      fontInfo.fontFamily = hAnsi;
      fontInfo.fontType = 'hAnsi';
    } else if (cs) {
      fontInfo.fontFamily = cs;
      fontInfo.fontType = 'cs';
    }

    // 保存所有字体定义以备后用
    fontInfo.fonts = {
      ascii,
      hAnsi,
      eastAsia,
      cs
    };

    return fontInfo;
  }

  /**
   * 处理同一段落中不同文本运行的混合格式
   * @param paragraph - 段落元素
   * @returns 包含格式化文本片段的数组
   */
  private parseFormattedTextRuns(paragraph: Element): any[] {
    const runs: any[] = [];
    const textRuns = paragraph.querySelectorAll('w\\:r, r');

    textRuns.forEach((run, index) => {
      const rPrElement = run.querySelector('w\\:rPr, rPr');
      const textElements = run.querySelectorAll('w\\:t, t');
      
      let text = '';
      textElements.forEach(t => {
        text += t.textContent || '';
      });

      if (text.trim()) {
        const runStyles = this.parseRunProperties(rPrElement);
        runs.push({
          text: text,
          styles: runStyles,
          index: index
        });
      }
    });

    return runs;
   }
}