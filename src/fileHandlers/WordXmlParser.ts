import { WordToTiptapConverter, type TiptapDocument, type Comment as TiptapComment } from '../converters/WordToTiptapConverter';
import { ErrorHandler, ErrorType, ErrorSeverity, type CommentParsingResult } from '../utils/ErrorHandler';

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
  parseToTiptap(xmlContent: string, numberingXml?: string, images?: any[]): TiptapDocument {
    // 如果提供了 numbering.xml，则先构建列表类型映射供转换器使用
    if (numberingXml) {
      const map = this.buildNumberingTypeMap(numberingXml);
      this.wordToTiptapConverter.setNumberingTypeMap(map);
    } else {
      this.wordToTiptapConverter.setNumberingTypeMap({});
    }

    return this.wordToTiptapConverter.convertWordXmlToTiptapJson(xmlContent, images);
  }

  /**
   * 解析批注
   * 增强版本：支持更多XML格式变体，改进错误处理和范围文本提取
   */
  parseComments(xmlContent: string, documentXml?: string): TiptapComment[] {
    const parseResult = {
      totalFound: 0,
      successfullyParsed: 0,
      errors: [] as Array<{ index: number; error: string; severity: 'warning' | 'error' }>,
      warnings: [] as string[]
    };

    try {
      console.log('开始解析批注XML内容，内容长度:', xmlContent.length);
      
      // 增强的输入验证
      const validationResult = this.validateCommentXmlInput(xmlContent);
      if (!validationResult.isValid) {
        parseResult.errors.push({
          index: -1,
          error: `输入验证失败: ${validationResult.error}`,
          severity: 'error'
        });
        this.reportParsingResults(parseResult);
        return [];
      }

      // 预处理XML内容，移除可能的BOM和无效字符
      const cleanedXmlContent = this.preprocessXmlContent(xmlContent);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(cleanedXmlContent, 'text/xml');
      
      // 增强的XML解析错误检查
      const xmlValidationResult = this.validateXmlParsing(xmlDoc, xmlContent);
      if (!xmlValidationResult.isValid) {
        parseResult.errors.push({
          index: -1,
          error: `XML解析失败: ${xmlValidationResult.error}`,
          severity: 'error'
        });
        this.reportParsingResults(parseResult);
        throw new Error(`批注XML格式无效: ${xmlValidationResult.error}`);
      }
      
      // 支持多种XML格式变体的批注元素查询
      const comments = this.findCommentElements(xmlDoc);
      parseResult.totalFound = comments.length;
      console.log('找到批注元素数量:', comments.length);
      
      if (comments.length === 0) {
        parseResult.warnings.push('未找到任何批注元素，可能是空的批注文件');
        console.info('未找到任何批注元素，可能是空的批注文件');
        this.reportParsingResults(parseResult);
        return [];
      }
      
      // 提取批注范围文本映射
      const commentRangeTextMap = new Map<string, string>();
      if (documentXml) {
        try {
          console.log('开始提取批注范围文本...');
          const rangeExtractionResult = this.extractCommentRangeTextWithValidation(documentXml, commentRangeTextMap);
          if (rangeExtractionResult.warnings.length > 0) {
            parseResult.warnings.push(...rangeExtractionResult.warnings);
          }
          console.log('批注范围文本提取完成，共提取', commentRangeTextMap.size, '个范围');
        } catch (rangeError) {
          const errorMsg = `提取批注范围文本失败: ${rangeError instanceof Error ? rangeError.message : '未知错误'}`;
          parseResult.errors.push({
            index: -1,
            error: errorMsg,
            severity: 'warning'
          });
          console.error('提取批注范围文本时发生错误:', rangeError);
          parseResult.warnings.push('将继续处理批注，但可能缺少范围文本信息');
        }
      }

      // 用于跟踪已使用的ID，确保唯一性
      const usedIds = new Set<string>();
      
      const parsedComments = Array.from(comments).map((comment, index) => {
        try {
          // 增强的批注数据验证
          const validationResult = this.validateCommentElement(comment, index);
          if (!validationResult.isValid) {
            parseResult.errors.push({
              index: index + 1,
              error: `批注数据验证失败: ${validationResult.error}`,
              severity: 'warning'
            });
          }

          // 增强的ID提取和验证
          const id = this.extractAndValidateCommentId(comment, index, usedIds);
          
          // 增强的作者信息提取
          const author = this.extractCommentAuthor(comment);
          
          // 增强的日期和时间戳处理
          const { timestamp } = this.extractCommentDateTime(comment, id);
          
          // 增强的批注内容提取
          const content = this.extractCommentContent(comment);
          
          // 验证批注内容完整性
          if (!content || content.trim().length === 0) {
            parseResult.warnings.push(`批注 ${index + 1} (ID: ${id}) 内容为空`);
          }
          
          // 获取批注范围文本
          const rangeText = commentRangeTextMap.get(id) || '';
          if (!rangeText && documentXml) {
            parseResult.warnings.push(`批注 ${index + 1} (ID: ${id}) 缺少关联的原文文本`);
          }
          
          // 计算批注范围的偏移量
          const rangeOffsets = this.calculateCommentRangeOffsets(documentXml, id, rangeText);
          
          const parsedComment: TiptapComment = {
            id,
            author,
            content: content || '空批注',
            user: author,
            timestamp,
            range: {
              startOffset: rangeOffsets.startOffset,
              endOffset: rangeOffsets.endOffset,
              text: rangeText
            }
          };
          
          parseResult.successfullyParsed++;
          console.log(`成功解析批注 ${index + 1}: ID=${id}, 作者=${author}, 内容="${content.substring(0, 50)}..."`);
          return parsedComment;
        } catch (commentError) {
          const errorMsg = `解析批注 ${index + 1} 失败: ${commentError instanceof Error ? commentError.message : '未知错误'}`;
          parseResult.errors.push({
            index: index + 1,
            error: errorMsg,
            severity: 'error'
          });
          console.error(`解析第 ${index + 1} 个批注时发生错误:`, commentError);
          console.error('批注元素内容:', comment.outerHTML?.substring(0, 200) || '无法获取');
          
          // 返回一个默认的批注对象，确保不会中断整个解析过程
          const fallbackId = this.generateFallbackId(index, usedIds);
          return {
            id: fallbackId,
            author: '解析错误',
            content: '批注解析失败',
            user: '解析错误',
            timestamp: Date.now(),
            range: {
              startOffset: 0,
              endOffset: 0,
              text: ''
            }
          };
        }
      });

      // 过滤掉可能的null值并验证结果
      const validComments = parsedComments.filter(comment => comment && comment.id);
      
      // 验证批注ID的唯一性
      const uniquenessResult = this.validateCommentUniqueness(validComments);
      if (uniquenessResult.duplicates.length > 0) {
        parseResult.warnings.push(`发现 ${uniquenessResult.duplicates.length} 个重复的批注ID`);
      }
      
      // 报告解析结果
      this.reportParsingResults(parseResult);
      
      console.log('批注解析完成，成功解析', validComments.length, '条批注');
      return validComments;
    } catch (error) {
      const errorMsg = `批注解析过程中发生严重错误: ${error instanceof Error ? error.message : '未知错误'}`;
      parseResult.errors.push({
        index: -1,
        error: errorMsg,
        severity: 'error'
      });
      console.error('解析批注时发生严重错误:', error);
      console.error('错误详情:', error instanceof Error ? error.stack : '未知错误类型');
      console.error('XML内容片段:', xmlContent?.substring(0, 500) || '无内容');
      
      // 报告解析结果
      this.reportParsingResults(parseResult);
      
      // 返回空数组而不是抛出错误，确保不影响主文档导入
      return [];
    }
  }

  // === 私有方法 ===

  /**
   * 验证批注XML输入
   */
  private validateCommentXmlInput(xmlContent: string): { isValid: boolean; error?: string } {
    if (!xmlContent) {
      return { isValid: false, error: '批注XML内容为空' };
    }
    
    if (typeof xmlContent !== 'string') {
      return { isValid: false, error: '批注XML内容必须是字符串类型' };
    }
    
    if (xmlContent.trim().length === 0) {
      return { isValid: false, error: '批注XML内容为空白字符' };
    }
    
    // 检查基本的XML结构
    if (!xmlContent.includes('<') || !xmlContent.includes('>')) {
      return { isValid: false, error: '批注XML内容不包含有效的XML标签' };
    }
    
    return { isValid: true };
  }

  /**
   * 验证XML解析结果
   */
  private validateXmlParsing(xmlDoc: Document, originalContent: string): { isValid: boolean; error?: string } {
    // 检查XML解析是否成功
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      const errorText = parseError.textContent || '未知解析错误';
      return { 
        isValid: false, 
        error: `XML解析错误: ${errorText}. 原始内容片段: ${originalContent.substring(0, 200)}...` 
      };
    }
    
    // 检查文档是否有根元素
    if (!xmlDoc.documentElement) {
      return { isValid: false, error: 'XML文档缺少根元素' };
    }
    
    return { isValid: true };
  }

  /**
   * 验证批注元素
   */
  private validateCommentElement(comment: Element, index: number): { isValid: boolean; error?: string } {
    if (!comment) {
      return { isValid: false, error: '批注元素为空' };
    }
    
    if (!comment.tagName) {
      return { isValid: false, error: '批注元素缺少标签名' };
    }
    
    // 检查是否有基本的批注属性
    const hasId = comment.hasAttribute('id') || 
                 comment.hasAttribute('w:id') || 
                 comment.hasAttribute('xml:id');
    const hasAuthor = comment.hasAttribute('author') || 
                     comment.hasAttribute('w:author');
    
    if (!hasId && !hasAuthor) {
      return { 
        isValid: false, 
        error: `批注元素 ${index + 1} 缺少必要的ID或作者属性` 
      };
    }
    
    return { isValid: true };
  }

  /**
   * 计算批注范围的偏移量
   */
  private calculateCommentRangeOffsets(documentXml: string | undefined, commentId: string, rangeText: string): { startOffset: number; endOffset: number } {
    if (!documentXml || !rangeText || rangeText.trim().length === 0) {
      return { startOffset: 0, endOffset: 0 };
    }
    
    try {
      console.debug(`计算批注 ${commentId} 的范围偏移量，范围文本: "${rangeText}"`);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(documentXml, 'text/xml');
      
      // 查找批注范围开始和结束标记
      const commentStart = this.findCommentRangeStarts(doc).find(start => 
        this.extractCommentRangeId(start, 0) === commentId
      );
      
      if (!commentStart) {
        console.warn(`未找到批注 ${commentId} 的开始标记`);
        return { startOffset: 0, endOffset: 0 };
      }
      
      const commentEnd = this.findCommentRangeEnd(doc, commentId);
      if (!commentEnd) {
        console.warn(`未找到批注 ${commentId} 的结束标记`);
        return { startOffset: 0, endOffset: 0 };
      }
      
      // 计算文档中到批注开始位置的文本偏移量
      const startOffset = this.calculateTextOffsetToNode(doc, commentStart);
      
      // 计算批注范围的长度
      const rangeLength = this.normalizeText(rangeText).length;
      const endOffset = startOffset + rangeLength;
      
      console.debug(`批注 ${commentId} 偏移量计算结果: start=${startOffset}, end=${endOffset}, length=${rangeLength}`);
      
      return { startOffset, endOffset };
    } catch (error) {
      console.error(`计算批注 ${commentId} 偏移量时发生错误:`, error);
      return { startOffset: 0, endOffset: 0 };
    }
  }
  
  /**
   * 计算到指定节点的文本偏移量
   */
  private calculateTextOffsetToNode(doc: Document, targetNode: Element): number {
    let offset = 0;
    
    try {
      // 创建一个树遍历器，只遍历文本节点
      const walker = document.createTreeWalker(
        doc.documentElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentNode = walker.nextNode();
      
      while (currentNode) {
        // 检查当前文本节点是否在目标节点之前
        if (this.isNodeBefore(currentNode, targetNode)) {
          const textContent = currentNode.textContent || '';
          offset += textContent.length;
        } else {
          break;
        }
        
        currentNode = walker.nextNode();
      }
      
      return offset;
    } catch (error) {
      console.error('计算文本偏移量时发生错误:', error);
      return 0;
    }
  }
  
  /**
   * 检查节点A是否在节点B之前
   */
  private isNodeBefore(nodeA: Node, nodeB: Node): boolean {
    try {
      const position = nodeA.compareDocumentPosition(nodeB);
      return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    } catch (error) {
      console.error('比较节点位置时发生错误:', error);
      return false;
    }
  }
  
  /**
   * 标准化文本（用于偏移量计算）
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\u00A0/g, ' ')
      .trim();
  }

  /**
   * 增强的批注范围文本提取（带验证）
   */
  private extractCommentRangeTextWithValidation(documentXml: string, commentRangeTextMap: Map<string, string>): { warnings: string[] } {
    const warnings: string[] = [];
    
    try {
      // 验证文档XML输入
      if (!documentXml || typeof documentXml !== 'string') {
        warnings.push('文档XML内容为空或无效，跳过范围文本提取');
        return { warnings };
      }

      // 预处理文档XML
      const cleanedDocumentXml = this.preprocessXmlContent(documentXml);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanedDocumentXml, 'text/xml');
      
      // 检查XML解析是否成功
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        warnings.push(`文档XML解析错误: ${parseError.textContent}`);
        throw new Error(`文档XML格式无效: ${parseError.textContent}`);
      }
      
      // 支持多种格式的批注范围标记
      const commentRangeStarts = this.findCommentRangeStarts(doc);
      
      if (commentRangeStarts.length === 0) {
        warnings.push('未找到批注范围标记，可能文档中没有批注或使用了不同的标记格式');
        return { warnings };
      }
      
      let successfulExtractions = 0;
      let failedExtractions = 0;
      
      // 处理每个批注范围
      commentRangeStarts.forEach((start, index) => {
        try {
          const commentId = this.extractCommentRangeId(start, index);
          if (!commentId) {
            warnings.push(`第 ${index + 1} 个批注范围开始标记缺少ID属性`);
            failedExtractions++;
            return;
          }
          
          const end = this.findCommentRangeEnd(doc, commentId);
          
          if (end) {
            try {
              const text = this.extractTextBetweenNodes(start as Element, end as Element);
              if (text && text.trim()) {
                const cleanedText = this.cleanExtractedText(text);
                commentRangeTextMap.set(commentId, cleanedText);
                successfulExtractions++;
                console.log(`成功提取批注 ${commentId} 的范围文本: "${cleanedText.substring(0, 50)}..."`);
              } else {
                warnings.push(`批注 ${commentId} 的范围文本为空`);
                // 即使为空也记录，避免重复处理
                commentRangeTextMap.set(commentId, '');
                successfulExtractions++;
              }
            } catch (textError) {
              warnings.push(`提取批注 ${commentId} 的范围文本时发生错误: ${textError instanceof Error ? textError.message : '未知错误'}`);
              // 记录错误但继续处理其他批注
              commentRangeTextMap.set(commentId, '');
              failedExtractions++;
            }
          } else {
            warnings.push(`未找到批注 ${commentId} 的结束标记`);
            // 尝试备用方法提取文本
            const fallbackText = this.extractCommentTextFallback(doc, commentId, start as Element);
            if (fallbackText) {
              commentRangeTextMap.set(commentId, fallbackText);
              successfulExtractions++;
              console.log(`使用备用方法提取批注 ${commentId} 的文本: "${fallbackText.substring(0, 50)}..."`);
            } else {
              failedExtractions++;
            }
          }
        } catch (rangeError) {
          warnings.push(`处理第 ${index + 1} 个批注范围时发生错误: ${rangeError instanceof Error ? rangeError.message : '未知错误'}`);
          failedExtractions++;
        }
      });
      
      console.log(`批注范围文本提取完成，成功: ${successfulExtractions}, 失败: ${failedExtractions}`);
      
      if (failedExtractions > 0) {
        warnings.push(`${failedExtractions} 个批注的范围文本提取失败`);
      }
      
    } catch (error) {
      warnings.push(`提取批注范围文本时发生严重错误: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error('提取批注范围文本时发生严重错误:', error);
    }
    
    return { warnings };
  }

  /**
   * 增强的批注唯一性验证
   */
  private validateCommentUniqueness(comments: TiptapComment[]): { duplicates: string[]; isValid: boolean } {
    const duplicates: string[] = [];
    
    try {
      const idCounts = new Map<string, number>();
      
      comments.forEach(comment => {
        const count = idCounts.get(comment.id) || 0;
        idCounts.set(comment.id, count + 1);
      });
      
      const duplicateEntries = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
      
      if (duplicateEntries.length > 0) {
        duplicateEntries.forEach(([id, count]) => {
          duplicates.push(`ID "${id}" 重复 ${count} 次`);
        });
        console.error('发现重复的批注ID:', duplicateEntries);
        console.warn('这可能导致批注显示异常，请检查XML文件');
      } else {
        console.debug('批注ID唯一性验证通过');
      }
    } catch (error) {
      console.error('验证批注唯一性时发生错误:', error);
      duplicates.push('唯一性验证过程中发生错误');
    }
    
    return { duplicates, isValid: duplicates.length === 0 };
  }

  /**
   * 报告解析结果
   */
  private reportParsingResults(result: { 
    totalFound: number; 
    successfullyParsed: number; 
    errors: Array<{ index: number; error: string; severity: 'warning' | 'error' }>; 
    warnings: string[] 
  }): void {
    console.log('=== 批注解析结果报告 ===');
    console.log(`总共找到批注: ${result.totalFound}`);
    console.log(`成功解析批注: ${result.successfullyParsed}`);
    console.log(`解析失败批注: ${result.totalFound - result.successfullyParsed}`);
    
    // 使用ErrorHandler记录错误和警告
    result.errors.forEach((error) => {
      const severity = error.severity === 'error' ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;
      const context = error.index > 0 ? `批注 ${error.index}` : '全局解析';
      
      ErrorHandler.logError(
        ErrorType.COMMENT_PARSING,
        severity,
        error.error,
        context,
        severity === ErrorSeverity.ERROR ? '检查文档格式或联系技术支持' : '可能影响批注显示效果'
      );
    });

    result.warnings.forEach((warning) => {
      ErrorHandler.logError(
        ErrorType.COMMENT_PARSING,
        ErrorSeverity.WARNING,
        warning,
        '批注解析过程',
        '通常不影响主要功能'
      );
    });
    
    // 创建批注解析结果并处理用户反馈
    const commentResult: CommentParsingResult = {
      totalFound: result.totalFound,
      successfullyParsed: result.successfullyParsed,
      failed: result.totalFound - result.successfullyParsed,
      warnings: result.warnings,
      errors: result.errors.map(e => ErrorHandler.logError(
        ErrorType.COMMENT_PARSING,
        e.severity === 'error' ? ErrorSeverity.ERROR : ErrorSeverity.WARNING,
        e.error,
        e.index > 0 ? `批注 ${e.index}` : '全局'
      )),
      partialLoss: result.totalFound > 0 && (result.successfullyParsed / result.totalFound) < 0.8
    };
    
    // 处理用户反馈
    ErrorHandler.handleCommentParsingResult(commentResult);
    
    console.log('=== 报告结束 ===');
  }

  /**
   * 预处理XML内容，移除BOM和无效字符
   */
  private preprocessXmlContent(xmlContent: string): string {
    try {
      // 移除BOM (Byte Order Mark)
      let cleaned = xmlContent.replace(/^\uFEFF/, '');
      
      // 移除控制字符（除了换行、回车、制表符）
      cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // 确保XML声明存在且正确
      if (!cleaned.trim().startsWith('<?xml')) {
        console.warn('XML内容缺少XML声明，添加默认声明');
        cleaned = '<?xml version="1.0" encoding="UTF-8"?>\n' + cleaned;
      }
      
      return cleaned;
    } catch (error) {
      console.error('预处理XML内容时发生错误:', error);
      return xmlContent; // 返回原始内容
    }
  }

  /**
   * 查找批注元素，支持多种XML格式变体
   */
  private findCommentElements(xmlDoc: Document): Element[] {
    try {
      // 支持多种命名空间和格式的批注元素查询
      const selectors = [
        'w\\:comment',           // 标准Word命名空间
        'comment',               // 无命名空间
        'w\\:annotation',        // 某些版本使用annotation
        'annotation',            // 无命名空间的annotation
        '*[*|id][*|author]',     // 通用选择器：任何有id和author属性的元素
      ];
      
      let comments: Element[] = [];
      
      for (const selector of selectors) {
        try {
          const elements = xmlDoc.querySelectorAll(selector);
          if (elements.length > 0) {
            comments = Array.from(elements);
            console.log(`使用选择器 "${selector}" 找到 ${comments.length} 个批注元素`);
            break;
          }
        } catch (selectorError) {
          console.warn(`选择器 "${selector}" 查询失败:`, selectorError);
          continue;
        }
      }
      
      // 如果标准选择器都失败，尝试手动遍历查找
      if (comments.length === 0) {
        console.warn('标准选择器未找到批注，尝试手动遍历');
        comments = this.findCommentElementsManually(xmlDoc);
      }
      
      return comments;
    } catch (error) {
      console.error('查找批注元素时发生错误:', error);
      return [];
    }
  }

  /**
   * 手动遍历查找批注元素
   */
  private findCommentElementsManually(xmlDoc: Document): Element[] {
    const comments: Element[] = [];
    
    try {
      const walker = xmlDoc.createTreeWalker(
        xmlDoc.documentElement,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node: Node) => {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();
            
            // 检查是否为批注相关的元素
            if (tagName.includes('comment') || tagName.includes('annotation')) {
              // 验证是否有必要的属性
              const hasId = element.hasAttribute('id') || 
                           element.hasAttribute('w:id') || 
                           element.hasAttribute('xml:id');
              const hasAuthor = element.hasAttribute('author') || 
                               element.hasAttribute('w:author');
              
              if (hasId || hasAuthor) {
                return NodeFilter.FILTER_ACCEPT;
              }
            }
            
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      
      let node: Node | null;
      while (node = walker.nextNode()) {
        comments.push(node as Element);
      }
      
      console.log(`手动遍历找到 ${comments.length} 个潜在批注元素`);
    } catch (error) {
      console.error('手动遍历查找批注元素时发生错误:', error);
    }
    
    return comments;
  }

  /**
   * 提取和验证批注ID
   */
  private extractAndValidateCommentId(comment: Element, index: number, usedIds: Set<string>): string {
    try {
      // 尝试多种ID属性名称
      const idAttributes = ['w:id', 'id', 'xml:id', 'commentId', 'w:commentId'];
      let id: string | null = null;
      
      for (const attr of idAttributes) {
        id = comment.getAttribute(attr);
        if (id) {
          console.debug(`批注 ${index} 使用属性 "${attr}" 获取ID: ${id}`);
          break;
        }
      }
      
      // 如果没有找到ID，生成一个基于索引的ID
      if (!id) {
        id = `comment_${index}`;
        console.warn(`批注 ${index} 缺少ID属性，生成默认ID: ${id}`);
      }
      
      // 确保ID的唯一性
      let uniqueId = id;
      let counter = 1;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${id}_${counter}`;
        counter++;
      }
      
      if (uniqueId !== id) {
        console.warn(`批注ID "${id}" 重复，使用唯一ID: ${uniqueId}`);
      }
      
      usedIds.add(uniqueId);
      return uniqueId;
    } catch (error) {
      console.error(`提取批注 ${index} 的ID时发生错误:`, error);
      const fallbackId = this.generateFallbackId(index, usedIds);
      usedIds.add(fallbackId);
      return fallbackId;
    }
  }

  /**
   * 提取批注作者信息
   */
  private extractCommentAuthor(comment: Element): string {
    try {
      // 尝试多种作者属性名称
      const authorAttributes = ['w:author', 'author', 'w:creator', 'creator', 'w:user', 'user'];
      
      for (const attr of authorAttributes) {
        const author = comment.getAttribute(attr);
        if (author && author.trim()) {
          return author.trim();
        }
      }
      
      // 尝试从子元素中提取作者信息
      const authorElements = comment.querySelectorAll('w\\:author, author, w\\:creator, creator');
      for (const element of authorElements) {
        const authorText = element.textContent?.trim();
        if (authorText) {
          return authorText;
        }
      }
      
      console.warn('未找到批注作者信息，使用默认值');
      return '未知作者';
    } catch (error) {
      console.error('提取批注作者时发生错误:', error);
      return '未知作者';
    }
  }

  /**
   * 提取批注日期和时间戳
   */
  private extractCommentDateTime(comment: Element, commentId: string): { date: string; timestamp: number } {
    try {
      // 尝试多种日期属性名称
      const dateAttributes = ['w:date', 'date', 'w:created', 'created', 'w:modified', 'modified', 'w:time', 'time'];
      let dateString: string | null = null;
      
      for (const attr of dateAttributes) {
        dateString = comment.getAttribute(attr);
        if (dateString && dateString.trim()) {
          break;
        }
      }
      
      // 如果没有找到日期属性，尝试从子元素中提取
      if (!dateString) {
        const dateElements = comment.querySelectorAll('w\\:date, date, w\\:created, created, w\\:modified, modified');
        for (const element of dateElements) {
          const dateText = element.textContent?.trim();
          if (dateText) {
            dateString = dateText;
            break;
          }
        }
      }
      
      // 如果仍然没有找到日期，使用当前时间
      if (!dateString) {
        console.warn(`批注 ${commentId} 缺少日期信息，使用当前时间`);
        const now = new Date();
        return {
          date: now.toISOString(),
          timestamp: now.getTime()
        };
      }
      
      // 解析日期字符串
      const timestamp = this.parseCommentDate(dateString, commentId);
      
      return {
        date: dateString,
        timestamp
      };
    } catch (error) {
      console.error(`提取批注 ${commentId} 的日期时发生错误:`, error);
      const now = new Date();
      return {
        date: now.toISOString(),
        timestamp: now.getTime()
      };
    }
  }

  /**
   * 解析批注日期字符串
   */
  private parseCommentDate(dateString: string, commentId: string): number {
    try {
      // 清理日期字符串
      const cleanedDate = dateString.trim();
      
      // 尝试直接解析
      let timestamp = new Date(cleanedDate).getTime();
      
      if (!isNaN(timestamp)) {
        return timestamp;
      }
      
      // 尝试处理常见的日期格式
      const dateFormats = [
        // ISO 8601 格式
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
        // Word常用格式
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
        // 简单日期格式
        /^\d{4}-\d{2}-\d{2}$/,
        // 美式日期格式
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        // 中文日期格式
        /^\d{4}年\d{1,2}月\d{1,2}日$/
      ];
      
      for (const format of dateFormats) {
        if (format.test(cleanedDate)) {
          // 对于特殊格式，进行转换
          if (cleanedDate.includes('年') && cleanedDate.includes('月') && cleanedDate.includes('日')) {
            // 处理中文日期格式
            const match = cleanedDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (match) {
              const [, year, month, day] = match;
              timestamp = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).getTime();
            }
          } else {
            timestamp = new Date(cleanedDate).getTime();
          }
          
          if (!isNaN(timestamp)) {
            return timestamp;
          }
        }
      }
      
      console.warn(`批注 ${commentId} 的日期格式无法识别: "${cleanedDate}"，使用当前时间`);
      return Date.now();
    } catch (error) {
      console.error(`解析批注 ${commentId} 的日期时发生错误:`, error);
      return Date.now();
    }
  }

  /**
   * 提取批注内容
   */
  private extractCommentContent(comment: Element): string {
    try {
      let content = '';
      
      // 查找段落元素
      const paragraphs = comment.querySelectorAll('w\\:p, p');
      
      if (paragraphs.length > 0) {
        // 从段落中提取文本
        paragraphs.forEach((paragraph, pIndex) => {
          const paragraphText = this.extractTextFromParagraph(paragraph);
          if (paragraphText.trim()) {
            if (content && pIndex > 0) {
              content += '\n'; // 段落间添加换行
            }
            content += paragraphText;
          }
        });
      } else {
        // 如果没有段落结构，直接提取所有文本内容
        content = this.extractTextFromElement(comment);
      }
      
      return content.trim();
    } catch (error) {
      console.error('提取批注内容时发生错误:', error);
      return '';
    }
  }

  /**
   * 从段落元素中提取文本
   */
  private extractTextFromParagraph(paragraph: Element): string {
    try {
      let text = '';
      
      // 查找文本运行元素
      const runs = paragraph.querySelectorAll('w\\:r, r');
      
      if (runs.length > 0) {
        runs.forEach(run => {
          const textElements = run.querySelectorAll('w\\:t, t');
          textElements.forEach(textEl => {
            const textContent = textEl.textContent || '';
            text += textContent;
          });
        });
      } else {
        // 如果没有运行结构，直接提取段落的文本内容
        text = this.extractTextFromElement(paragraph);
      }
      
      return text;
    } catch (error) {
      console.error('从段落提取文本时发生错误:', error);
      return '';
    }
  }

  /**
   * 从元素中提取纯文本内容
   */
  private extractTextFromElement(element: Element): string {
    try {
      // 首先尝试查找所有文本元素
      const textElements = element.querySelectorAll('w\\:t, t');
      if (textElements.length > 0) {
        let text = '';
        textElements.forEach(textEl => {
          text += textEl.textContent || '';
        });
        return text;
      }
      
      // 如果没有找到文本元素，使用textContent
      return element.textContent || '';
    } catch (error) {
      console.error('从元素提取文本时发生错误:', error);
      return '';
    }
  }

  /**
   * 生成备用ID
   */
  private generateFallbackId(index: number, usedIds: Set<string>): string {
    let fallbackId = `error_comment_${index}`;
    let counter = 1;
    
    while (usedIds.has(fallbackId)) {
      fallbackId = `error_comment_${index}_${counter}`;
      counter++;
    }
    
    return fallbackId;
  }



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
    try {
      console.log('开始从文档XML中提取批注范围文本...');
      
      // 验证输入参数
      if (!documentXml || typeof documentXml !== 'string') {
        console.warn('文档XML内容为空或无效，跳过范围文本提取');
        return;
      }

      // 预处理文档XML
      const cleanedDocumentXml = this.preprocessXmlContent(documentXml);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanedDocumentXml, 'text/xml');
      
      // 检查XML解析是否成功
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.error('文档XML解析错误:', parseError.textContent);
        throw new Error(`文档XML格式无效: ${parseError.textContent}`);
      }
      
      // 支持多种格式的批注范围标记
      const commentRangeStarts = this.findCommentRangeStarts(doc);
      console.log('找到批注范围开始标记数量:', commentRangeStarts.length);
      
      if (commentRangeStarts.length === 0) {
        console.info('未找到批注范围标记，可能文档中没有批注或使用了不同的标记格式');
        return;
      }
      
      // 处理每个批注范围
      commentRangeStarts.forEach((start, index) => {
        try {
          const commentId = this.extractCommentRangeId(start, index);
          if (!commentId) {
            return;
          }
          
          const end = this.findCommentRangeEnd(doc, commentId);
          
          if (end) {
            try {
              const text = this.extractTextBetweenNodes(start as Element, end as Element);
              if (text && text.trim()) {
                const cleanedText = this.cleanExtractedText(text);
                commentRangeTextMap.set(commentId, cleanedText);
                console.log(`成功提取批注 ${commentId} 的范围文本: "${cleanedText.substring(0, 50)}..."`);
              } else {
                console.warn(`批注 ${commentId} 的范围文本为空`);
                // 即使为空也记录，避免重复处理
                commentRangeTextMap.set(commentId, '');
              }
            } catch (textError) {
              console.error(`提取批注 ${commentId} 的范围文本时发生错误:`, textError);
              // 记录错误但继续处理其他批注
              commentRangeTextMap.set(commentId, '');
            }
          } else {
            console.warn(`未找到批注 ${commentId} 的结束标记`);
            // 尝试备用方法提取文本
            const fallbackText = this.extractCommentTextFallback(doc, commentId, start as Element);
            if (fallbackText) {
              commentRangeTextMap.set(commentId, fallbackText);
              console.log(`使用备用方法提取批注 ${commentId} 的文本: "${fallbackText.substring(0, 50)}..."`);
            }
          }
        } catch (rangeError) {
          console.error(`处理第 ${index + 1} 个批注范围时发生错误:`, rangeError);
          // 继续处理下一个批注范围
        }
      });
      
      console.log('批注范围文本提取完成，共提取', commentRangeTextMap.size, '个有效范围');
    } catch (error) {
      console.error('提取批注范围文本时发生严重错误:', error);
      console.error('错误详情:', error instanceof Error ? error.stack : '未知错误类型');
      console.error('文档XML内容片段:', documentXml?.substring(0, 500) || '无内容');
      // 不抛出错误，让调用方继续处理
    }
  }

  /**
   * 查找批注范围开始标记，支持多种格式
   */
  private findCommentRangeStarts(doc: Document): Element[] {
    const selectors = [
      'w\\:commentRangeStart',
      'commentRangeStart',
      'w\\:commentStart',
      'commentStart',
      '*[*|id][class*="comment"]',  // 通用选择器
    ];
    
    for (const selector of selectors) {
      try {
        const elements = doc.querySelectorAll(selector);
        if (elements.length > 0) {
          console.debug(`使用选择器 "${selector}" 找到 ${elements.length} 个批注范围开始标记`);
          return Array.from(elements);
        }
      } catch (selectorError) {
        console.warn(`选择器 "${selector}" 查询失败:`, selectorError);
        continue;
      }
    }
    
    return [];
  }

  /**
   * 提取批注范围ID
   */
  private extractCommentRangeId(start: Element, index: number): string | null {
    const idAttributes = ['w:id', 'id', 'commentId', 'w:commentId'];
    
    for (const attr of idAttributes) {
      const id = start.getAttribute(attr);
      if (id && id.trim()) {
        return id.trim();
      }
    }
    
    console.warn(`第 ${index + 1} 个批注范围开始标记缺少ID属性`);
    return null;
  }

  /**
   * 查找批注范围结束标记
   */
  private findCommentRangeEnd(doc: Document, commentId: string): Element | null {
    const selectors = [
      `w\\:commentRangeEnd[w\\:id="${commentId}"]`,
      `commentRangeEnd[id="${commentId}"]`,
      `w\\:commentEnd[w\\:id="${commentId}"]`,
      `commentEnd[id="${commentId}"]`,
      `*[*|id="${commentId}"][class*="commentEnd"]`,
    ];
    
    for (const selector of selectors) {
      try {
        const element = doc.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (selectorError) {
        console.warn(`查找批注结束标记时选择器失败:`, selectorError);
        continue;
      }
    }
    
    return null;
  }

  /**
   * 清理提取的文本
   * 改进版本：更智能地处理分割的文本片段和样式标记
   */
  private cleanExtractedText(text: string): string {
    try {
      if (!text || typeof text !== 'string') {
        return '';
      }
      
      console.debug(`清理文本前: "${text}"`);
      
      let cleaned = text
        .trim()
        .replace(/\s+/g, ' ')  // 合并多个空白字符
        .replace(/\n\s*\n/g, '\n')  // 合并多个换行
        .replace(/^\s+|\s+$/gm, '')  // 移除行首行尾空白
        .replace(/[\u200B-\u200D\uFEFF]/g, '');  // 移除零宽字符
      
      // 改进的字符间空格检测和修复
      if (cleaned.includes(' ') && cleaned.length > 3) {
        // 策略1: 检测单字符+空格的模式（如 "T i t l e" -> "Title"）
        const singleCharSpacePattern = /\b\w\s+(?=\w)/g;
        const matches = cleaned.match(singleCharSpacePattern);
        
        if (matches && matches.length >= 2) {
          const withoutExtraSpaces = cleaned.replace(/(\w)\s+(?=\w)/g, '$1');
          
          // 验证修复后的文本是否更合理
          if (withoutExtraSpaces.length < cleaned.length * 0.8 && withoutExtraSpaces.length > 2) {
            console.debug(`修复字符间空格: "${cleaned}" -> "${withoutExtraSpaces}"`);
            cleaned = withoutExtraSpaces;
          }
        }
        
        // 策略2: 检测中文字符间的异常空格
        const chineseCharSpacePattern = /[\u4e00-\u9fff]\s+(?=[\u4e00-\u9fff])/g;
        if (chineseCharSpacePattern.test(cleaned)) {
          const withoutChineseSpaces = cleaned.replace(chineseCharSpacePattern, (match) => {
            return match.replace(/\s+/g, '');
          });
          console.debug(`修复中文字符间空格: "${cleaned}" -> "${withoutChineseSpaces}"`);
          cleaned = withoutChineseSpaces;
        }
        
        // 策略3: 检测标点符号前的异常空格
        const punctuationSpacePattern = /\s+([。，！？；：""''（）【】《》])/g;
        if (punctuationSpacePattern.test(cleaned)) {
          const withoutPunctuationSpaces = cleaned.replace(punctuationSpacePattern, '$1');
          console.debug(`修复标点符号前空格: "${cleaned}" -> "${withoutPunctuationSpaces}"`);
          cleaned = withoutPunctuationSpaces;
        }
      }
      
      // 如果文本过长，智能截取
      if (cleaned.length > 200) {
        const truncateAt = Math.min(200, cleaned.length);
        let cutPoint = truncateAt;
        
        // 优先在句子边界截断
        const sentenceEnders = ['。', '！', '？', '.', '!', '?'];
        for (let i = truncateAt - 1; i >= Math.max(0, truncateAt - 100); i--) {
          if (sentenceEnders.includes(cleaned[i])) {
            cutPoint = i + 1;
            break;
          }
        }
        
        // 其次在词语边界截断
        if (cutPoint === truncateAt) {
          const wordEnders = ['，', ',', ' ', '、'];
          for (let i = truncateAt - 1; i >= Math.max(0, truncateAt - 50); i--) {
            if (wordEnders.includes(cleaned[i])) {
              cutPoint = i + 1;
              break;
            }
          }
        }
        
        cleaned = cleaned.substring(0, cutPoint).trim();
        console.debug(`文本过长，截取到 ${cutPoint} 字符`);
      }
      
      // 验证文本质量
      if (cleaned.length < 2) {
        console.debug('文本太短，返回空字符串');
        return '';
      }
      
      // 检查是否包含过多的特殊字符或数字（可能是格式标记）
      const specialCharRatio = (cleaned.match(/[^\w\s\u4e00-\u9fff]/g) || []).length / cleaned.length;
      if (specialCharRatio > 0.5) {
        console.warn(`文本包含过多特殊字符 (${Math.round(specialCharRatio * 100)}%)，可能不是有效的批注原文:`, cleaned.substring(0, 50));
        return '';
      }
      
      console.debug(`清理文本后: "${cleaned}"`);
      return cleaned;
    } catch (error) {
      console.error('清理文本时发生错误:', error);
      return text ? text.trim() : '';
    }
  }

  /**
   * 备用方法提取批注文本
   */
  private extractCommentTextFallback(doc: Document, commentId: string, start: Element): string {
    try {
      console.debug(`使用备用方法提取批注 ${commentId} 的原文`);
      
      // 方法1: 查找批注引用元素，从其附近提取文本
      const commentRef = doc.querySelector(`w\\:commentReference[w\\:id="${commentId}"], commentReference[id="${commentId}"]`);
      if (commentRef) {
        const nearbyText = this.extractTextNearElement(commentRef);
        if (nearbyText && nearbyText.trim() && nearbyText.length > 3) {
          console.debug(`从批注引用附近提取到文本: "${nearbyText.substring(0, 50)}..."`);
          return this.cleanExtractedText(nearbyText);
        }
      }
      
      // 方法2: 从开始标记的同级文本运行中提取
      const siblingRuns = this.findSiblingTextRuns(start);
      if (siblingRuns.length > 0) {
        const siblingText = siblingRuns.join(' ').trim();
        if (siblingText && siblingText.length > 3) {
          console.debug(`从兄弟文本运行提取到文本: "${siblingText.substring(0, 50)}..."`);
          return this.cleanExtractedText(siblingText);
        }
      }
      
      // 方法3: 从包含的段落中提取，但限制长度
      const containingParagraph = this.findContainingParagraph(start);
      if (containingParagraph) {
        const paragraphText = this.extractTextFromTextRun(containingParagraph);
        if (paragraphText && paragraphText.trim() && paragraphText.length > 3) {
          // 限制文本长度，避免提取整个段落
          const limitedText = paragraphText.length > 100 
            ? paragraphText.substring(0, 100).trim()
            : paragraphText.trim();
          
          if (limitedText.length > 3) {
            console.debug(`从包含段落提取到文本: "${limitedText.substring(0, 50)}..."`);
            return this.cleanExtractedText(limitedText);
          }
        }
      }
      
      console.warn(`所有备用方法都无法提取批注 ${commentId} 的有效原文`);
      return '';
    } catch (error) {
      console.error('备用文本提取方法失败:', error);
      return '';
    }
  }

  /**
   * 从兄弟节点中提取文本
   */
  private extractTextFromSiblings(start: Element): string {
    try {
      let text = '';
      const maxSiblings = 10; // 限制检查的兄弟节点数量
      let count = 0;
      
      // 检查后续兄弟节点
      let sibling = start.nextSibling;
      while (sibling && count < maxSiblings) {
        if (sibling.nodeType === Node.ELEMENT_NODE) {
          const siblingText = this.extractTextFromNode(sibling);
          if (siblingText && siblingText.trim()) {
            text += siblingText + ' ';
          }
        } else if (sibling.nodeType === Node.TEXT_NODE) {
          const textContent = sibling.textContent?.trim();
          if (textContent) {
            text += textContent + ' ';
          }
        }
        sibling = sibling.nextSibling;
        count++;
      }
      
      // 如果后续节点没有找到足够的文本，检查前面的兄弟节点
      if (text.trim().length < 20) {
        count = 0;
        sibling = start.previousSibling;
        while (sibling && count < maxSiblings) {
          if (sibling.nodeType === Node.ELEMENT_NODE) {
            const siblingText = this.extractTextFromNode(sibling);
            if (siblingText && siblingText.trim()) {
              text = siblingText + ' ' + text;
            }
          } else if (sibling.nodeType === Node.TEXT_NODE) {
            const textContent = sibling.textContent?.trim();
            if (textContent) {
              text = textContent + ' ' + text;
            }
          }
          sibling = sibling.previousSibling;
          count++;
        }
      }
      
      return text.trim();
    } catch (error) {
      console.error('从兄弟节点提取文本时发生错误:', error);
      return '';
    }
  }

  /**
   * 从包含指定元素的段落中提取文本（最后的备用方案）
   */
  private extractTextFromContainingParagraph(start: Element): string {
    try {
      // 查找包含start元素的段落
      let paragraph = start;
      while (paragraph && paragraph.tagName.toLowerCase() !== 'w:p' && paragraph.tagName.toLowerCase() !== 'p') {
        paragraph = paragraph.parentElement as Element;
        if (!paragraph) break;
      }
      
      if (paragraph) {
        const paragraphText = this.extractTextFromElement(paragraph);
        // 限制段落文本长度，避免提取过多内容
        if (paragraphText && paragraphText.length > 200) {
          return paragraphText.substring(0, 200) + '...';
        }
        return paragraphText;
      }
      
      return '';
    } catch (error) {
      console.error('从段落提取文本时发生错误:', error);
      return '';
    }
  }

  private extractTextBetweenNodes(startNode: Element, endNode: Element): string {
    try {
      console.debug(`开始提取节点间文本，从 ${startNode.tagName} 到 ${endNode.tagName}`);
      
      // 首先尝试直接查找包含的文本运行元素（推荐方法）
      const textRuns = this.findTextRunsBetweenNodes(startNode, endNode);
      if (textRuns.length > 0) {
        // 智能合并文本片段
        const mergedText = this.smartMergeTextFragments(textRuns);
        if (mergedText && mergedText.length > 0) {
          console.debug(`通过文本运行提取到批注原文: "${mergedText.substring(0, 50)}..."`);
          return this.cleanExtractedText(mergedText);
        }
      }
      
      // 如果文本运行方法失败，使用传统的节点遍历方法
      console.debug('文本运行方法未获得结果，使用节点遍历方法');
      
      let text = '';
      let currentNode: Node | null = startNode.nextSibling;
      let nodeCount = 0;
      const maxNodes = 1000;
      const processedNodes = new Set<Node>();
      
      while (currentNode && currentNode !== endNode && nodeCount < maxNodes) {
        try {
          // 防止重复处理同一个节点
          if (processedNodes.has(currentNode)) {
            console.warn('检测到重复节点，跳过处理');
            currentNode = currentNode.nextSibling;
            continue;
          }
          processedNodes.add(currentNode);
          
          if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const element = currentNode as Element;
            const tagName = element.tagName.toLowerCase();
            
            // 只处理文本相关的元素，跳过表格、图片等复杂结构
            if (tagName === 'w:r' || tagName === 'r') {
              // 文本运行元素 - 最重要的文本容器
              const runText = this.extractTextFromTextRun(element);
              if (runText.trim()) {
                text += runText;
              }
            } else if (tagName === 'w:t' || tagName === 't') {
              // 直接的文本元素
              const textContent = element.textContent || '';
              if (textContent.trim()) {
                text += textContent;
              }
            } else if (tagName === 'w:br' || tagName === 'br') {
              // 换行元素
              text += ' ';
            } else if (tagName === 'w:tab' || tagName === 'tab') {
              // 制表符元素
              text += ' ';
            } else if (tagName === 'w:p' || tagName === 'p') {
              // 段落元素 - 只在必要时处理
              if (text.trim() === '') {
                const paragraphText = this.extractTextFromTextRun(element);
                if (paragraphText.trim()) {
                  text += paragraphText;
                }
              }
            }
            // 跳过表格、图片等复杂元素
          } else if (currentNode.nodeType === Node.TEXT_NODE) {
            // 直接的文本节点
            const textContent = currentNode.textContent || '';
            if (textContent.trim()) {
              text += textContent;
            }
          }
        } catch (nodeError) {
          console.warn('处理节点时发生错误:', nodeError, '，跳过该节点');
        }
        
        currentNode = currentNode?.nextSibling || null;
        nodeCount++;
      }
      
      if (nodeCount >= maxNodes) {
        console.warn('提取文本时达到最大节点数限制，可能存在循环引用或文档结构复杂');
      }
      
      if (currentNode !== endNode && endNode) {
        console.warn('未能到达结束节点，可能存在文档结构问题');
        // 尝试使用备用方法
        const fallbackText = this.extractTextBetweenNodesFallback(startNode, endNode);
        if (fallbackText && fallbackText.length > text.length) {
          console.debug('使用备用方法获得了更多文本内容');
          text = fallbackText;
        }
      }
      
      console.debug(`节点间文本提取完成，提取了 ${text.length} 个字符`);
      return text;
    } catch (error) {
      console.error('提取节点间文本时发生错误:', error);
      // 尝试备用方法
      try {
        return this.extractTextBetweenNodesFallback(startNode, endNode);
      } catch (fallbackError) {
        console.error('备用文本提取方法也失败:', fallbackError);
        return '';
      }
    }
  }

  /**
   * 查找两个节点之间的文本运行元素
   * 改进版本：更准确地识别批注范围内的所有文本片段
   */
  private findTextRunsBetweenNodes(startNode: Element, endNode: Element): string[] {
    const textRuns: string[] = [];
    
    try {
      console.debug(`查找批注范围内的文本运行，从 ${startNode.tagName} 到 ${endNode.tagName}`);
      
      // 获取共同的父元素
      const commonParent = this.findCommonParent(startNode, endNode);
      if (!commonParent) {
        console.warn('未找到共同父元素');
        return textRuns;
      }
      
      // 在共同父元素中查找所有文本运行
      const allRuns = commonParent.querySelectorAll('w\\:r, r');
      let collecting = false;
      let foundStart = false;
      let foundEnd = false;
      
      console.debug(`共找到 ${allRuns.length} 个文本运行元素`);
      
      for (let i = 0; i < allRuns.length; i++) {
        const run = allRuns[i] as Element;
        
        // 检查是否到达开始节点
        if (!foundStart && (run.contains(startNode) || run === startNode || this.isAfterNode(run, startNode))) {
          collecting = true;
          foundStart = true;
          console.debug(`找到开始位置，运行 ${i + 1}`);
        }
        
        // 检查是否到达结束节点
        if (foundStart && (run.contains(endNode) || run === endNode || this.isAfterNode(endNode, run))) {
          foundEnd = true;
          console.debug(`找到结束位置，运行 ${i + 1}`);
          
          // 如果当前运行包含结束节点，仍需要提取其文本
          if (run.contains(endNode) || run === endNode) {
            const runText = this.extractTextFromTextRun(run);
            if (runText.trim()) {
              textRuns.push(runText.trim());
              console.debug(`提取结束运行文本: "${runText.trim()}"`);
            }
          }
          break;
        }
        
        // 如果正在收集，提取文本
        if (collecting) {
          const runText = this.extractTextFromTextRun(run);
          if (runText.trim()) {
            textRuns.push(runText.trim());
            console.debug(`提取运行 ${i + 1} 文本: "${runText.trim()}"`);
          }
        }
      }
      
      console.debug(`文本运行提取完成，共提取 ${textRuns.length} 个片段`);
      console.debug(`提取的文本片段:`, textRuns);
      
      // 如果没有找到开始或结束节点，尝试备用方法
      if (!foundStart || !foundEnd) {
        console.warn(`未完整找到批注范围 (开始: ${foundStart}, 结束: ${foundEnd})，尝试备用方法`);
        return this.findTextRunsBetweenNodesFallback(startNode, endNode);
      }
      
      return textRuns;
    } catch (error) {
      console.error('查找文本运行时发生错误:', error);
      return textRuns;
    }
  }

  /**
   * 智能合并文本片段
   * 处理由于样式分割导致的文本片段化问题
   */
  private smartMergeTextFragments(textFragments: string[]): string {
    if (!textFragments || textFragments.length === 0) {
      return '';
    }
    
    if (textFragments.length === 1) {
      return textFragments[0];
    }
    
    console.debug(`智能合并 ${textFragments.length} 个文本片段:`, textFragments);
    
    // 策略1: 直接连接（适用于大多数情况）
    let merged = textFragments.join('');
    console.debug(`直接连接结果: "${merged}"`);
    
    // 策略2: 用空格连接（适用于词语被分割的情况）
    const spaceJoined = textFragments.join(' ');
    console.debug(`空格连接结果: "${spaceJoined}"`);
    
    // 策略3: 智能连接（根据片段特征决定是否需要空格）
    const smartJoined = this.intelligentJoinFragments(textFragments);
    console.debug(`智能连接结果: "${smartJoined}"`);
    
    // 选择最佳结果
    const candidates = [merged, spaceJoined, smartJoined].filter(text => text.trim().length > 0);
    
    // 优先选择长度适中且看起来最自然的文本
    let bestCandidate = candidates[0];
    let bestScore = this.calculateTextNaturalness(bestCandidate);
    
    for (let i = 1; i < candidates.length; i++) {
      const score = this.calculateTextNaturalness(candidates[i]);
      if (score > bestScore) {
        bestCandidate = candidates[i];
        bestScore = score;
      }
    }
    
    console.debug(`选择最佳合并结果: "${bestCandidate}" (得分: ${bestScore.toFixed(2)})`);
    return bestCandidate;
  }
  
  /**
   * 智能连接文本片段
   */
  private intelligentJoinFragments(fragments: string[]): string {
    if (fragments.length <= 1) {
      return fragments.join('');
    }
    
    let result = fragments[0];
    
    for (let i = 1; i < fragments.length; i++) {
      const prev = fragments[i - 1];
      const current = fragments[i];
      
      // 判断是否需要在片段间添加空格
      const needsSpace = this.shouldAddSpaceBetweenFragments(prev, current);
      
      if (needsSpace) {
        result += ' ' + current;
      } else {
        result += current;
      }
    }
    
    return result;
  }
  
  /**
   * 判断两个文本片段之间是否需要空格
   */
  private shouldAddSpaceBetweenFragments(prev: string, current: string): boolean {
    if (!prev || !current) {
      return false;
    }
    
    const prevTrimmed = prev.trim();
    const currentTrimmed = current.trim();
    
    if (!prevTrimmed || !currentTrimmed) {
      return false;
    }
    
    const prevLast = prevTrimmed[prevTrimmed.length - 1];
    const currentFirst = currentTrimmed[0];
    
    // 中文字符之间通常不需要空格
    const isChinese = (char: string) => /[\u4e00-\u9fff]/.test(char);
    if (isChinese(prevLast) && isChinese(currentFirst)) {
      return false;
    }
    
    // 标点符号前后的处理
    const isPunctuation = (char: string) => /[。，！？；：""''（）【】《》,.!?;:()[\]{}]/.test(char);
    if (isPunctuation(prevLast) || isPunctuation(currentFirst)) {
      return false;
    }
    
    // 数字和字母之间可能需要空格
    const isAlphaNumeric = (char: string) => /[a-zA-Z0-9]/.test(char);
    if (isAlphaNumeric(prevLast) && isAlphaNumeric(currentFirst)) {
      return true;
    }
    
    // 英文单词之间需要空格
    if (/[a-zA-Z]/.test(prevLast) && /[a-zA-Z]/.test(currentFirst)) {
      return true;
    }
    
    // 默认不添加空格
    return false;
  }
  
  /**
   * 计算文本的自然度得分
   */
  private calculateTextNaturalness(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const trimmed = text.trim();
    
    // 基础分数：文本长度
    score += Math.min(trimmed.length / 50, 1) * 10;
    
    // 减分：过多的空格
    const spaceRatio = (trimmed.match(/\s/g) || []).length / trimmed.length;
    if (spaceRatio > 0.3) {
      score -= (spaceRatio - 0.3) * 20;
    }
    
    // 加分：包含完整的词语
    const wordCount = trimmed.split(/\s+/).filter(word => word.length > 1).length;
    score += wordCount * 2;
    
    // 减分：过多的单字符
    const singleCharCount = trimmed.split(/\s+/).filter(word => word.length === 1).length;
    score -= singleCharCount * 1;
    
    // 加分：自然的标点符号使用
    const punctuationMatches = trimmed.match(/[。，！？；：""''（）【】《》]/g);
    if (punctuationMatches) {
      score += Math.min(punctuationMatches.length, 3) * 1;
    }
    
    // 减分：异常的字符模式
    if (/\w\s+\w\s+\w/.test(trimmed)) {
      score -= 5; // 检测到字符间有异常空格的模式
    }
    
    return Math.max(score, 0);
  }

  /**
   * 备用方法：查找两个节点之间的文本运行
   */
  private findTextRunsBetweenNodesFallback(startNode: Element, endNode: Element): string[] {
    const textRuns: string[] = [];
    
    try {
      console.debug('使用备用方法查找文本运行');
      
      // 方法1：基于DOM遍历顺序
      const walker = document.createTreeWalker(
        startNode.ownerDocument!.documentElement,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node: Node) => {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();
            return (tagName === 'w:r' || tagName === 'r') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          }
        }
      );
      
      // 定位到开始节点
      walker.currentNode = startNode;
      let collecting = false;
      let currentRun = walker.nextNode() as Element;
      
      while (currentRun) {
        if (currentRun.contains(startNode) || currentRun === startNode) {
          collecting = true;
        }
        
        if (collecting) {
          const runText = this.extractTextFromTextRun(currentRun);
          if (runText.trim()) {
            textRuns.push(runText.trim());
          }
        }
        
        if (currentRun.contains(endNode) || currentRun === endNode) {
          break;
        }
        
        currentRun = walker.nextNode() as Element;
      }
      
      console.debug(`备用方法提取了 ${textRuns.length} 个文本片段`);
      return textRuns;
    } catch (error) {
      console.error('备用文本运行查找失败:', error);
      return textRuns;
    }
  }

  /**
   * 检查节点A是否在节点B之后
        if (run.contains(endNode) || run === endNode) {
          break;
        }
      }
      
    } catch (error) {
      console.warn('查找文本运行时发生错误:', error);
    }
    
    return textRuns;
  }

  /**
   * 专门用于提取文本运行的方法
   */
  private extractTextFromTextRun(element: Element): string {
    try {
      // 查找所有文本元素
      const textElements = element.querySelectorAll('w\\:t, t');
      let text = '';
      
      textElements.forEach(textEl => {
        const textContent = textEl.textContent || '';
        if (textContent) {
          text += textContent;
        }
      });
      
      return text;
    } catch (error) {
      console.warn('提取文本运行内容时发生错误:', error);
      return element.textContent || '';
    }
  }

  /**
   * 查找两个节点的共同父元素
   */
  private findCommonParent(node1: Element, node2: Element): Element | null {
    try {
      const parents1 = this.getParentChain(node1);
      const parents2 = this.getParentChain(node2);
      
      // 从根节点开始，找到第一个不同的父元素
      for (let i = 0; i < Math.min(parents1.length, parents2.length); i++) {
        if (parents1[i] !== parents2[i]) {
          return i > 0 ? parents1[i - 1] : null;
        }
      }
      
      // 如果一个是另一个的祖先
      return parents1.length < parents2.length ? parents1[parents1.length - 1] : parents2[parents2.length - 1];
    } catch (error) {
      console.warn('查找共同父元素时发生错误:', error);
      return null;
    }
  }

  /**
   * 获取元素的父元素链
   */
  private getParentChain(element: Element): Element[] {
    const chain: Element[] = [];
    let current: Element | null = element;
    
    while (current && current.parentElement) {
      chain.unshift(current.parentElement);
      current = current.parentElement;
    }
    
    return chain;
  }

  /**
   * 检查一个节点是否在另一个节点之后
   */
  private isAfterNode(node1: Element, node2: Element): boolean {
    try {
      const position = node1.compareDocumentPosition(node2);
      return (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
    } catch (error) {
      console.warn('比较节点位置时发生错误:', error);
      return false;
    }
  }

  /**
   * 获取节点在父元素中的索引
   */
  private getNodeIndex(node: Node, parent: Node): number {
    try {
      const childNodes = Array.from(parent.childNodes);
      return childNodes.indexOf(node as ChildNode);
    } catch (error) {
      console.error('获取节点索引时发生错误:', error);
      return -1;
    }
  }

  /**
   * 备用的节点间文本提取方法
   */
  private extractTextBetweenNodesFallback(startNode: Element, endNode: Element): string {
    try {
      console.debug('使用备用方法提取节点间文本');
      
      // 获取两个节点的共同父元素
      const commonParent = this.findCommonParent(startNode, endNode);
      if (!commonParent) {
        console.warn('未找到共同父元素，无法使用备用方法');
        return '';
      }
      
      // 获取开始和结束节点在父元素中的位置
      const startIndex = this.getNodeIndex(startNode, commonParent);
      const endIndex = this.getNodeIndex(endNode, commonParent);
      
      if (startIndex === -1 || endIndex === -1) {
        console.warn('无法确定节点位置，使用简单文本提取');
        return this.extractTextFromElement(commonParent);
      }
      
      // 提取指定范围内的文本
      let text = '';
      const childNodes = Array.from(commonParent.childNodes);
      
      for (let i = startIndex + 1; i < endIndex; i++) {
        const node = childNodes[i];
        if (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            text += this.extractTextFromNode(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          }
        }
      }
      
      return text;
    } catch (error) {
      console.error('备用文本提取方法失败:', error);
      return '';
    }
  }



  private extractTextFromNode(node: Node): string {
    try {
      if (!node) {
        return '';
      }
      
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // 直接文本元素
        if (tagName === 'w:t' || tagName === 't') {
          return element.textContent || '';
        }
        
        // 特殊元素处理
        if (tagName === 'w:br' || tagName === 'br') {
          return '\n';
        }
        
        if (tagName === 'w:tab' || tagName === 'tab') {
          return '\t';
        }
        
        // 跳过某些不包含文本的元素
        const skipElements = ['w:rpr', 'rpr', 'w:ppr', 'ppr', 'w:sectpr', 'sectpr'];
        if (skipElements.includes(tagName)) {
          return '';
        }
        
        // 递归处理子节点，但限制递归深度和处理的节点数
        const maxDepth = 15;
        const maxNodes = 500;
        let processedNodes = 0;
        
        const extractRecursive = (currentNode: Node, depth: number): string => {
          if (depth > maxDepth || processedNodes > maxNodes) {
            if (depth > maxDepth) {
              console.warn('达到最大递归深度，停止文本提取');
            }
            if (processedNodes > maxNodes) {
              console.warn('达到最大处理节点数，停止文本提取');
            }
            return '';
          }
          
          let result = '';
          try {
            const childNodes = Array.from(currentNode.childNodes);
            
            for (const child of childNodes) {
              processedNodes++;
              
              if (child.nodeType === Node.TEXT_NODE) {
                const textContent = child.textContent || '';
                if (textContent.trim()) {
                  result += textContent;
                }
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                const childElement = child as Element;
                const childTagName = childElement.tagName.toLowerCase();
                
                if (childTagName === 'w:t' || childTagName === 't') {
                  result += childElement.textContent || '';
                } else if (childTagName === 'w:br' || childTagName === 'br') {
                  result += '\n';
                } else if (childTagName === 'w:tab' || childTagName === 'tab') {
                  result += '\t';
                } else if (childTagName === 'w:p' || childTagName === 'p') {
                  // 段落元素，添加换行
                  const paragraphText = extractRecursive(child, depth + 1);
                  if (paragraphText.trim()) {
                    result += (result && !result.endsWith('\n') ? '\n' : '') + paragraphText;
                  }
                } else {
                  // 其他元素，继续递归
                  result += extractRecursive(child, depth + 1);
                }
              }
              
              // 如果已经处理了太多节点，停止处理
              if (processedNodes > maxNodes) {
                break;
              }
            }
          } catch (childError) {
            console.warn('处理子节点时发生错误:', childError);
          }
          return result;
        };
        
        const text = extractRecursive(element, 0);
        return text;
      }
      
      return '';
    } catch (error) {
      console.error('从节点提取文本时发生错误:', error);
      // 尝试简单的textContent提取作为备用
      try {
        return node.textContent || '';
      } catch (fallbackError) {
        console.error('备用文本提取也失败:', fallbackError);
        return '';
      }
    }
  }

  /**
   * 从元素附近提取文本
   */
  private extractTextNearElement(element: Element): string {
    try {
      // 查找包含该元素的文本运行
      const containingRun = element.closest('w\\:r, r');
      if (containingRun) {
        const runText = this.extractTextFromTextRun(containingRun);
        if (runText.trim()) {
          return runText.trim();
        }
      }
      
      // 查找前后的兄弟文本运行
      const parent = element.parentElement;
      if (parent) {
        const textRuns = parent.querySelectorAll('w\\:r, r');
        const texts: string[] = [];
        
        textRuns.forEach(run => {
          const runText = this.extractTextFromTextRun(run);
          if (runText.trim()) {
            texts.push(runText.trim());
          }
        });
        
        return texts.join(' ');
      }
      
      return '';
    } catch (error) {
      console.warn('从元素附近提取文本时发生错误:', error);
      return '';
    }
  }

  /**
   * 查找兄弟文本运行
   */
  private findSiblingTextRuns(element: Element): string[] {
    const texts: string[] = [];
    
    try {
      const parent = element.parentElement;
      if (!parent) return texts;
      
      // 查找所有兄弟文本运行
      const siblings = Array.from(parent.children);
      
      for (const sibling of siblings) {
        if (sibling.tagName.toLowerCase() === 'w:r' || sibling.tagName.toLowerCase() === 'r') {
          const runText = this.extractTextFromTextRun(sibling);
          if (runText.trim()) {
            texts.push(runText.trim());
          }
        }
      }
    } catch (error) {
      console.warn('查找兄弟文本运行时发生错误:', error);
    }
    
    return texts;
  }

  /**
   * 查找包含的段落元素
   */
  private findContainingParagraph(element: Element): Element | null {
    try {
      return element.closest('w\\:p, p');
    } catch (error) {
      console.warn('查找包含段落时发生错误:', error);
      return null;
    }
  }


}