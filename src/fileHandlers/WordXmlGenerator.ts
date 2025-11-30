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
    
    console.log('生成的body XML长度:', bodyXml.length);
    console.log('body XML是否包含图片标记:', bodyXml.includes('<w:drawing>'));
    
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
    let fallbackInsertions = 0;
    
    // 按批注在文档中的位置排序，确保从后往前插入，避免位置偏移
    const sortedComments = [...comments].sort((a, b) => {
      // 如果有range信息，按startOffset排序
      if (a.range?.startOffset !== undefined && b.range?.startOffset !== undefined) {
        return b.range.startOffset - a.range.startOffset; // 从后往前
      }
      // 否则按ID排序
      return b.id.localeCompare(a.id);
    });
    
    // 为每个批注添加范围标记
    sortedComments.forEach((comment, index) => {
      const commentId = comment.id;
      const rangeText = comment.range?.text;
      
      console.log(`处理批注 ${index + 1}/${comments.length}: ${commentId}`);
      
      if (rangeText && rangeText.trim() && rangeText.length > 1) {
        const trimmedRangeText = rangeText.trim();
        console.log(`批注 ${commentId} 范围文本: "${trimmedRangeText}"`);
        console.log(`批注 ${commentId} 原始范围文本长度: ${rangeText.length}, 清理后长度: ${trimmedRangeText.length}`);
        
        // 显示范围文本的详细信息用于调试
        console.log(`批注 ${commentId} 范围文本字符码:`, Array.from(trimmedRangeText).map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
        
        // 使用更精确的批注定位方法，包含偏移量信息
        const insertResult = this.insertCommentAtPreciseLocationWithOffset(modifiedXml, commentId, comment);
        
        if (insertResult.success) {
          modifiedXml = insertResult.xml;
          successfulMatches++;
          console.log(`✓ 批注 ${commentId} 成功定位并插入`);
        } else {
          console.warn(`✗ 批注 ${commentId} 精确定位失败: ${insertResult.reason}`);
          
          // 尝试回退策略：在文档末尾插入批注引用
          const fallbackResult = this.insertCommentAsFallback(modifiedXml, commentId, comment);
          if (fallbackResult.success) {
            modifiedXml = fallbackResult.xml;
            fallbackInsertions++;
            console.log(`⚠ 批注 ${commentId} 使用回退策略插入`);
          } else {
            console.error(`✗ 批注 ${commentId} 回退策略也失败`);
          }
        }
      } else {
        console.warn(`⚠ 批注 ${commentId} 缺少有效范围文本，使用回退策略`);
        
        // 对于没有范围文本的批注，也使用回退策略
        const fallbackResult = this.insertCommentAsFallback(modifiedXml, commentId, comment);
        if (fallbackResult.success) {
          modifiedXml = fallbackResult.xml;
          fallbackInsertions++;
          console.log(`⚠ 批注 ${commentId} 使用回退策略插入（无范围文本）`);
        }
      }
    });
    
    console.log(`批注范围标记插入完成:`);
    console.log(`  - 精确匹配: ${successfulMatches}/${comments.length}`);
    console.log(`  - 回退插入: ${fallbackInsertions}/${comments.length}`);
    console.log(`  - 总成功率: ${Math.round(((successfulMatches + fallbackInsertions) / comments.length) * 100)}%`);
    
    return modifiedXml;
  }

  /**
   * 使用偏移量信息进行精确的批注定位
   */
  private insertCommentAtPreciseLocationWithOffset(xml: string, commentId: string, comment: Comment): { success: boolean; xml: string; reason?: string } {
    try {
      const rangeText = comment.range?.text;
      const startOffset = comment.range?.startOffset || 0;
      const endOffset = comment.range?.endOffset || 0;
      
      console.log(`批注 ${commentId} 偏移量信息: start=${startOffset}, end=${endOffset}, text="${rangeText}"`);
      
      if (!rangeText || rangeText.trim().length === 0) {
        return { success: false, xml, reason: '缺少范围文本' };
      }
      
      // 如果有有效的偏移量信息，尝试基于偏移量定位
      if (startOffset > 0 || endOffset > startOffset) {
        const offsetResult = this.insertCommentByTextOffset(xml, commentId, startOffset, endOffset, rangeText);
        if (offsetResult.success) {
          return offsetResult;
        }
        console.warn(`基于偏移量的定位失败: ${offsetResult.reason}`);
      }
      
      // 回退到原有的文本匹配方法
      return this.insertCommentAtPreciseLocation(xml, commentId, rangeText);
      
    } catch (error) {
      console.error(`批注 ${commentId} 精确定位时发生错误:`, error);
      return { success: false, xml, reason: `定位错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }
  
  /**
   * 基于文本偏移量插入批注标记
   */
  private insertCommentByTextOffset(xml: string, commentId: string, startOffset: number, endOffset: number, expectedText: string): { success: boolean; xml: string; reason?: string } {
    try {
      console.log(`尝试基于偏移量插入批注 ${commentId}: ${startOffset}-${endOffset}`);
      
      // 提取XML中的所有文本内容及其位置映射
      const textMap = this.buildTextPositionMap(xml);
      
      if (textMap.totalLength === 0) {
        return { success: false, xml, reason: '文档中没有文本内容' };
      }
      
      console.log(`文档总文本长度: ${textMap.totalLength}, 批注范围: ${startOffset}-${endOffset}`);
      
      // 验证偏移量是否在有效范围内
      if (startOffset >= textMap.totalLength || endOffset > textMap.totalLength || startOffset >= endOffset) {
        return { success: false, xml, reason: `偏移量超出范围 (${startOffset}-${endOffset} vs ${textMap.totalLength})` };
      }
      
      // 查找对应偏移量的XML位置
      const startPosition = this.findXmlPositionByTextOffset(textMap, startOffset);
      const endPosition = this.findXmlPositionByTextOffset(textMap, endOffset);
      
      if (!startPosition || !endPosition) {
        return { success: false, xml, reason: '无法找到对应的XML位置' };
      }
      
      console.log(`找到XML位置: start=${startPosition.xmlPos}, end=${endPosition.xmlPos}`);
      
      // 验证提取的文本是否与期望的文本匹配
      const actualText = this.extractTextBetweenXmlPositions(xml, startPosition.xmlPos, endPosition.xmlPos);
      const normalizedActual = this.normalizeText(actualText);
      const normalizedExpected = this.normalizeText(expectedText);
      
      console.log(`文本验证: 期望="${normalizedExpected}", 实际="${normalizedActual}"`);
      
      if (!this.isTextSimilar(normalizedActual, normalizedExpected)) {
        return { success: false, xml, reason: `文本不匹配: 期望"${normalizedExpected}", 实际"${normalizedActual}"` };
      }
      
      // 在找到的位置插入批注标记
      const modifiedXml = this.insertCommentMarkersAtXmlPositions(xml, commentId, startPosition.xmlPos, endPosition.xmlPos);
      
      return { success: true, xml: modifiedXml };
      
    } catch (error) {
      console.error(`基于偏移量插入批注时发生错误:`, error);
      return { success: false, xml, reason: `偏移量插入错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  /**
   * 在精确位置插入批注标记（原有方法，作为备用）
   */
  private insertCommentAtPreciseLocation(xml: string, commentId: string, rangeText: string): { success: boolean; xml: string; reason?: string } {
    try {
      // 1. 清理和标准化范围文本
      const cleanRangeText = this.normalizeText(rangeText);
      
      console.log(`批注 ${commentId} 标准化前: "${rangeText}"`);
      console.log(`批注 ${commentId} 标准化后: "${cleanRangeText}"`);
      
      if (cleanRangeText.length < 2) {
        return { success: false, xml, reason: '范围文本太短' };
      }
      
      // 2. 查找所有可能的文本匹配位置
      const candidates = this.findTextCandidates(xml, cleanRangeText);
      
      console.log(`批注 ${commentId} 找到 ${candidates.length} 个候选位置`);
      candidates.forEach((candidate, index) => {
        console.log(`  候选 ${index + 1}: "${candidate.context}"`);
      });
      
      if (candidates.length === 0) {
        // 尝试提取文档中的所有文本内容进行调试
        const allTextContent = this.extractAllTextFromXml(xml);
        console.log(`文档中的所有文本内容 (前500字符): "${allTextContent.substring(0, 500)}..."`);
        console.log(`文档总文本长度: ${allTextContent.length}`);
        
        return { success: false, xml, reason: '未找到匹配的文本' };
      }
      
      // 3. 选择最佳匹配位置（优先选择不在表格中的位置）
      const bestCandidate = this.selectBestCandidate(xml, candidates);
      
      if (!bestCandidate) {
        return { success: false, xml, reason: '未找到合适的插入位置' };
      }
      
      console.log(`批注 ${commentId} 选择最佳候选: "${bestCandidate.context}"`);
      
      // 4. 在最佳位置插入批注标记
      const modifiedXml = this.insertCommentMarkersAtPosition(xml, commentId, bestCandidate);
      
      return { success: true, xml: modifiedXml };
      
    } catch (error) {
      console.error(`插入批注 ${commentId} 时发生错误:`, error);
      return { success: false, xml, reason: `插入错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  /**
   * 构建文本位置映射
   */
  private buildTextPositionMap(xml: string): { totalLength: number; positions: Array<{ textOffset: number; xmlPos: number; length: number; content: string }> } {
    const positions: Array<{ textOffset: number; xmlPos: number; length: number; content: string }> = [];
    let totalLength = 0;
    
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    
    while ((match = textPattern.exec(xml)) !== null) {
      const content = match[1];
      const normalizedContent = this.normalizeText(content);
      
      if (normalizedContent.length > 0) {
        positions.push({
          textOffset: totalLength,
          xmlPos: match.index!,
          length: normalizedContent.length,
          content: normalizedContent
        });
        
        totalLength += normalizedContent.length;
      }
    }
    
    return { totalLength, positions };
  }
  
  /**
   * 根据文本偏移量查找XML位置
   */
  private findXmlPositionByTextOffset(textMap: { totalLength: number; positions: Array<{ textOffset: number; xmlPos: number; length: number; content: string }> }, targetOffset: number): { xmlPos: number; withinElement: boolean } | null {
    for (const pos of textMap.positions) {
      const elementStart = pos.textOffset;
      const elementEnd = pos.textOffset + pos.length;
      
      if (targetOffset >= elementStart && targetOffset <= elementEnd) {
        return {
          xmlPos: pos.xmlPos,
          withinElement: true
        };
      }
    }
    
    return null;
  }
  
  /**
   * 提取两个XML位置之间的文本
   */
  private extractTextBetweenXmlPositions(xml: string, startPos: number, endPos: number): string {
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let text = '';
    let match;
    
    textPattern.lastIndex = 0;
    while ((match = textPattern.exec(xml)) !== null) {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;
      
      // 如果文本元素在指定范围内
      if (matchStart >= startPos && matchEnd <= endPos) {
        text += this.normalizeText(match[1]);
      }
    }
    
    return text;
  }
  
  /**
   * 检查两个文本是否相似
   */
  private isTextSimilar(text1: string, text2: string): boolean {
    if (text1 === text2) {
      return true;
    }
    
    // 移除空格后比较
    const noSpaces1 = text1.replace(/\s/g, '');
    const noSpaces2 = text2.replace(/\s/g, '');
    
    if (noSpaces1 === noSpaces2) {
      return true;
    }
    
    // 计算相似度
    const similarity = this.calculateSimilarity(text1, text2);
    return similarity > 0.8; // 80%相似度阈值
  }
  
  /**
   * 计算文本相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    
    return (maxLength - distance) / maxLength;
  }
  
  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * 在指定XML位置插入批注标记
   */
  private insertCommentMarkersAtXmlPositions(xml: string, commentId: string, startPos: number, endPos: number): string {
    const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
    const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/>`;
    const commentRef = `<w:r><w:rPr></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`;
    
    // 找到包含开始和结束位置的运行元素
    const startRunStart = xml.lastIndexOf('<w:r>', startPos);
    const endRunEnd = xml.indexOf('</w:r>', endPos) + 6;
    
    if (startRunStart === -1 || endRunEnd === -1) {
      // 如果找不到运行元素，直接在位置插入
      return xml.substring(0, startPos) + 
             commentStart + 
             xml.substring(startPos, endPos) + 
             commentEnd + commentRef +
             xml.substring(endPos);
    }
    
    // 在运行元素边界插入标记
    return xml.substring(0, startRunStart) + 
           commentStart + 
           xml.substring(startRunStart, endRunEnd) + 
           commentEnd + commentRef +
           xml.substring(endRunEnd);
  }

  /**
   * 标准化文本，移除多余空格和特殊字符
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')  // 合并多个空格
      .replace(/[\r\n\t]/g, ' ')  // 替换换行和制表符
      .replace(/\u00A0/g, ' ')  // 替换不间断空格
      .trim();
  }

  /**
   * 查找跨多个文本元素的匹配
   * 解决批注范围跨越多个样式片段的问题
   */
  private findCrossElementMatches(xml: string, searchText: string): Array<{ start: number; end: number; context: string }> {
    const matches: Array<{ start: number; end: number; context: string }> = [];
    
    try {
      console.log(`查找跨元素匹配，搜索文本: "${searchText}"`);
      
      // 提取所有文本元素及其位置
      const textElements: Array<{ content: string; start: number; end: number }> = [];
      const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let match;
      
      while ((match = textPattern.exec(xml)) !== null) {
        const content = this.normalizeText(match[1]).replace(/\s/g, '');
        if (content) {
          textElements.push({
            content,
            start: match.index!,
            end: match.index! + match[0].length
          });
        }
      }
      
      console.log(`找到 ${textElements.length} 个文本元素`);
      
      // 尝试连续的文本元素组合
      for (let i = 0; i < textElements.length; i++) {
        let combinedText = '';
        let startPos = textElements[i].start;
        let endPos = textElements[i].end;
        
        // 从当前位置开始，尝试不同长度的组合
        for (let j = i; j < Math.min(i + 10, textElements.length); j++) {
          combinedText += textElements[j].content;
          endPos = textElements[j].end;
          
          console.log(`检查组合文本 [${i}-${j}]: "${combinedText}"`);
          
          if (combinedText.includes(searchText)) {
            console.log(`✓ 跨元素匹配成功: "${combinedText}" 包含 "${searchText}"`);
            
            // 构建上下文信息
            const contextStart = Math.max(0, i - 1);
            const contextEnd = Math.min(textElements.length - 1, j + 1);
            const contextText = textElements.slice(contextStart, contextEnd + 1)
              .map(el => el.content)
              .join('');
            
            matches.push({
              start: startPos,
              end: endPos,
              context: contextText
            });
            
            break; // 找到匹配后跳出内层循环
          }
          
          // 如果组合文本已经比搜索文本长很多，停止组合
          if (combinedText.length > searchText.length * 3) {
            break;
          }
        }
      }
      
      console.log(`跨元素匹配找到 ${matches.length} 个候选位置`);
      return matches;
    } catch (error) {
      console.error('跨元素匹配时发生错误:', error);
      return matches;
    }
  }

  /**
   * 查找文本候选位置
   */
  private findTextCandidates(xml: string, searchText: string): Array<{ start: number; end: number; context: string }> {
    const candidates: Array<{ start: number; end: number; context: string }> = [];
    
    // 提取所有文本内容及其位置
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    
    // 标准化搜索文本
    const normalizedSearchText = this.normalizeText(searchText);
    
    while ((match = textPattern.exec(xml)) !== null) {
      const textContent = match[1];
      const normalizedTextContent = this.normalizeText(textContent);
      const textStart = match.index!;
      const textEnd = textStart + match[0].length;
      
      // 检查是否包含搜索文本（标准化后比较）
      if (normalizedTextContent && normalizedTextContent.includes(normalizedSearchText)) {
        candidates.push({
          start: textStart,
          end: textEnd,
          context: textContent
        });
      }
    }
    
    // 如果精确匹配失败，尝试更宽松的匹配策略
    if (candidates.length === 0) {
      console.log(`精确匹配失败，尝试宽松匹配策略，搜索文本: "${normalizedSearchText}"`);
      
      // 策略0: 特殊处理 - 尝试将搜索文本中的多个空格压缩为单个空格，然后匹配
      const compressedSearchText = normalizedSearchText.replace(/\s+/g, ' ');
      if (compressedSearchText !== normalizedSearchText) {
        console.log(`尝试压缩空格匹配，压缩后文本: "${compressedSearchText}"`);
        
        textPattern.lastIndex = 0;
        while ((match = textPattern.exec(xml)) !== null) {
          const textContent = match[1];
          const normalizedTextContent = this.normalizeText(textContent);
          const textStart = match.index!;
          const textEnd = textStart + match[0].length;
          
          if (normalizedTextContent && normalizedTextContent.includes(compressedSearchText)) {
            console.log(`✓ 压缩空格匹配成功: "${textContent}" 包含 "${compressedSearchText}"`);
            candidates.push({
              start: textStart,
              end: textEnd,
              context: textContent
            });
          }
        }
      }
      
      // 策略1: 移除所有空格后匹配
      const searchTextNoSpaces = normalizedSearchText.replace(/\s/g, '');
      console.log(`尝试无空格匹配，搜索文本: "${searchTextNoSpaces}"`);
      
      if (searchTextNoSpaces.length > 2) {
        // 尝试跨多个文本元素匹配
        const crossElementMatches = this.findCrossElementMatches(xml, searchTextNoSpaces);
        candidates.push(...crossElementMatches);
        
        // 单个文本元素内匹配
        textPattern.lastIndex = 0;
        while ((match = textPattern.exec(xml)) !== null) {
          const textContent = match[1];
          const textContentNoSpaces = this.normalizeText(textContent).replace(/\s/g, '');
          const textStart = match.index!;
          const textEnd = textStart + match[0].length;
          
          console.log(`检查文本: "${textContent}" -> 无空格: "${textContentNoSpaces}"`);
          
          if (textContentNoSpaces && textContentNoSpaces.includes(searchTextNoSpaces)) {
            console.log(`✓ 无空格匹配成功: "${textContent}" 包含 "${searchTextNoSpaces}"`);
            candidates.push({
              start: textStart,
              end: textEnd,
              context: textContent
            });
          } else if (textContentNoSpaces && searchTextNoSpaces.includes(textContentNoSpaces)) {
            console.log(`✓ 反向无空格匹配成功: "${searchTextNoSpaces}" 包含 "${textContentNoSpaces}"`);
            candidates.push({
              start: textStart,
              end: textEnd,
              context: textContent
            });
          }
        }
      }
      
      // 策略2: 部分文本匹配
      if (candidates.length === 0 && normalizedSearchText.length > 3) {
        // 尝试匹配前半部分和后半部分
        const halfLength = Math.floor(normalizedSearchText.length / 2);
        const firstHalf = normalizedSearchText.substring(0, halfLength);
        const secondHalf = normalizedSearchText.substring(halfLength);
        
        console.log(`尝试部分匹配，前半部分: "${firstHalf}", 后半部分: "${secondHalf}"`);
        
        textPattern.lastIndex = 0; // 重置正则表达式
        
        while ((match = textPattern.exec(xml)) !== null) {
          const textContent = match[1];
          const normalizedTextContent = this.normalizeText(textContent);
          const textStart = match.index!;
          const textEnd = textStart + match[0].length;
          
          // 检查是否包含前半部分或后半部分
          if (normalizedTextContent && (
            normalizedTextContent.includes(firstHalf) || 
            normalizedTextContent.includes(secondHalf) ||
            firstHalf.includes(normalizedTextContent) ||
            secondHalf.includes(normalizedTextContent)
          )) {
            console.log(`✓ 部分匹配成功: "${textContent}" 与 "${normalizedSearchText}" 部分匹配`);
            candidates.push({
              start: textStart,
              end: textEnd,
              context: textContent
            });
          }
        }
      }
      
      // 策略3: 模糊匹配（字符相似度）
      if (candidates.length === 0 && normalizedSearchText.length > 3) {
        textPattern.lastIndex = 0; // 重置正则表达式
        
        while ((match = textPattern.exec(xml)) !== null) {
          const textContent = match[1];
          const normalizedTextContent = this.normalizeText(textContent);
          const textStart = match.index!;
          const textEnd = textStart + match[0].length;
          
          const similarity = this.calculateSimilarity(normalizedSearchText, normalizedTextContent);
          console.log(`检查相似度: "${textContent}" 与 "${normalizedSearchText}" 相似度: ${similarity.toFixed(3)}`);
          
          if (normalizedTextContent && similarity > 0.5) {
            console.log(`✓ 模糊匹配成功: "${textContent}" 与 "${normalizedSearchText}" 相似度: ${similarity.toFixed(3)}`);
            candidates.push({
              start: textStart,
              end: textEnd,
              context: textContent
            });
          }
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
   * 改进版本：支持跨多个文本运行的批注范围
   */
  private insertCommentMarkersAtPosition(xml: string, commentId: string, position: { start: number; end: number; context: string }): string {
    try {
      console.log(`为批注 ${commentId} 插入标记，位置: ${position.start}-${position.end}`);
      
      // 查找批注范围涉及的所有文本运行
      const affectedRuns = this.findAffectedTextRuns(xml, position.start, position.end);
      
      if (affectedRuns.length === 0) {
        console.warn(`未找到受影响的文本运行，使用简单插入策略`);
        return this.insertCommentMarkersSimple(xml, commentId, position);
      }
      
      console.log(`批注 ${commentId} 影响 ${affectedRuns.length} 个文本运行`);
      
      // 如果只影响一个文本运行，使用简单策略
      if (affectedRuns.length === 1) {
        return this.insertCommentMarkersForSingleRun(xml, commentId, affectedRuns[0]);
      }
      
      // 如果影响多个文本运行，使用跨运行策略
      return this.insertCommentMarkersForMultipleRuns(xml, commentId, affectedRuns);
      
    } catch (error) {
      console.error(`插入批注标记时发生错误:`, error);
      return this.insertCommentMarkersSimple(xml, commentId, position);
    }
  }

  /**
   * 查找受批注范围影响的所有文本运行
   */
  private findAffectedTextRuns(xml: string, startPos: number, endPos: number): Array<{ start: number; end: number; content: string }> {
    const runs: Array<{ start: number; end: number; content: string }> = [];
    
    // 查找所有文本运行
    const runPattern = /<w:r[^>]*>.*?<\/w:r>/g;
    let match;
    
    while ((match = runPattern.exec(xml)) !== null) {
      const runStart = match.index!;
      const runEnd = runStart + match[0].length;
      
      // 检查运行是否与批注范围重叠
      if (runEnd > startPos && runStart < endPos) {
        runs.push({
          start: runStart,
          end: runEnd,
          content: match[0]
        });
      }
    }
    
    return runs;
  }

  /**
   * 为单个文本运行插入批注标记
   */
  private insertCommentMarkersForSingleRun(xml: string, commentId: string, run: { start: number; end: number; content: string }): string {
    const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
    const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/>`;
    const commentRef = `<w:r><w:rPr></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`;
    
    return xml.substring(0, run.start) + 
           commentStart + 
           run.content + 
           commentEnd + commentRef +
           xml.substring(run.end);
  }

  /**
   * 为多个文本运行插入批注标记
   */
  private insertCommentMarkersForMultipleRuns(xml: string, commentId: string, runs: Array<{ start: number; end: number; content: string }>): string {
    if (runs.length === 0) {
      return xml;
    }
    
    // 按位置排序
    runs.sort((a, b) => a.start - b.start);
    
    const firstRun = runs[0];
    const lastRun = runs[runs.length - 1];
    
    const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
    const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/>`;
    const commentRef = `<w:r><w:rPr></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`;
    
    // 在第一个运行前插入开始标记，在最后一个运行后插入结束标记和引用
    return xml.substring(0, firstRun.start) + 
           commentStart + 
           xml.substring(firstRun.start, lastRun.end) + 
           commentEnd + commentRef +
           xml.substring(lastRun.end);
  }

  /**
   * 简单的批注标记插入策略（备用）
   */
  private insertCommentMarkersSimple(xml: string, commentId: string, position: { start: number; end: number; context: string }): string {
    const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
    const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/>`;
    const commentRef = `<w:r><w:rPr></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`;
    
    return xml.substring(0, position.start) + 
           commentStart + 
           xml.substring(position.start, position.end) + 
           commentEnd + commentRef +
           xml.substring(position.end);
  }

  /**
   * 回退策略：在文档适当位置插入批注引用
   */
  private insertCommentAsFallback(xml: string, commentId: string, comment: Comment): { success: boolean; xml: string; reason?: string } {
    try {
      // 策略1: 如果有范围文本，尝试模糊匹配
      if (comment.range?.text && comment.range.text.trim().length > 3) {
        const fuzzyResult = this.insertCommentWithFuzzyMatch(xml, commentId, comment.range.text.trim());
        if (fuzzyResult.success) {
          return fuzzyResult;
        }
      }
      
      // 策略2: 在第一个段落末尾插入批注引用
      const firstParagraphEnd = xml.indexOf('</w:p>');
      if (firstParagraphEnd !== -1) {
        const commentRef = `<w:r><w:rPr></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`;
        const modifiedXml = xml.substring(0, firstParagraphEnd) + 
                           commentRef + 
                           xml.substring(firstParagraphEnd);
        
        return { success: true, xml: modifiedXml };
      }
      
      // 策略3: 在文档body末尾插入一个新段落包含批注引用
      const bodyEndIndex = xml.lastIndexOf('</w:body>');
      if (bodyEndIndex !== -1) {
        const commentParagraph = `<w:p><w:r><w:rPr></w:rPr><w:commentReference w:id="${commentId}"/></w:r></w:p>`;
        const modifiedXml = xml.substring(0, bodyEndIndex) + 
                           commentParagraph + 
                           xml.substring(bodyEndIndex);
        
        return { success: true, xml: modifiedXml };
      }
      
      return { success: false, xml, reason: '无法找到合适的插入位置' };
      
    } catch (error) {
      console.error(`批注 ${commentId} 回退策略执行失败:`, error);
      return { success: false, xml, reason: `回退策略错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  /**
   * 使用模糊匹配插入批注
   */
  private insertCommentWithFuzzyMatch(xml: string, commentId: string, searchText: string): { success: boolean; xml: string; reason?: string } {
    // 尝试匹配部分文本（取前一半或后一半）
    const halfLength = Math.floor(searchText.length / 2);
    const firstHalf = searchText.substring(0, halfLength);
    const secondHalf = searchText.substring(halfLength);
    
    // 尝试匹配前半部分
    if (firstHalf.length > 3) {
      const candidates = this.findTextCandidates(xml, firstHalf);
      if (candidates.length > 0) {
        const bestCandidate = this.selectBestCandidate(xml, candidates);
        if (bestCandidate) {
          const modifiedXml = this.insertCommentMarkersAtPosition(xml, commentId, bestCandidate);
          return { success: true, xml: modifiedXml };
        }
      }
    }
    
    // 尝试匹配后半部分
    if (secondHalf.length > 3) {
      const candidates = this.findTextCandidates(xml, secondHalf);
      if (candidates.length > 0) {
        const bestCandidate = this.selectBestCandidate(xml, candidates);
        if (bestCandidate) {
          const modifiedXml = this.insertCommentMarkersAtPosition(xml, commentId, bestCandidate);
          return { success: true, xml: modifiedXml };
        }
      }
    }
    
    return { success: false, xml, reason: '模糊匹配失败' };
  }



  /**
   * 生成批注XML内容
   */
  generateCommentsXml(comments: Comment[]): string {
    console.log('开始生成批注XML...');
    
    const commentsElements = comments.map((comment, index) => {
      // 确保时间戳有效
      let timestamp = comment.timestamp;
      if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
        timestamp = Date.now();
        console.warn(`批注 ${comment.id} 时间戳无效，使用当前时间`);
      }
      
      const date = new Date(timestamp).toISOString();
      const escapedContent = this.escapeXml(comment.content || '批注内容为空');
      const escapedAuthor = this.escapeXml(comment.author || comment.user || '匿名用户');
      
      // 生成用户缩写
      const initials = comment.initials || this.generateInitials(escapedAuthor);
      
      console.log(`生成批注 ${index + 1}/${comments.length}: ID=${comment.id}, 作者=${escapedAuthor}, 内容长度=${comment.content?.length || 0}`);
      
      // 构建批注XML，包含更完整的格式信息
      let commentXml = `<w:comment w:id="${comment.id}" w:author="${escapedAuthor}" w:date="${date}" w:initials="${initials}">`;
      
      // 主批注内容
      commentXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="CommentText"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rStyle w:val="CommentReference"/>
            </w:rPr>
            <w:annotationRef/>
          </w:r>
          <w:r>
            <w:t xml:space="preserve"> ${escapedContent}</w:t>
          </w:r>
        </w:p>`;
      
      // 如果有回复，添加回复内容
      if (comment.replies && comment.replies.length > 0) {
        console.log(`批注 ${comment.id} 包含 ${comment.replies.length} 条回复`);
        
        comment.replies.forEach((reply) => {
          const replyTimestamp = reply.timestamp && !isNaN(reply.timestamp) && reply.timestamp > 0 ? reply.timestamp : Date.now();
          const replyAuthor = this.escapeXml(reply.author || reply.user || '匿名用户');
          const replyContent = this.escapeXml(reply.content || '回复内容为空');
          const replyInitials = reply.initials || this.generateInitials(replyAuthor);
          
          commentXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="CommentText"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:sz w:val="18"/>
            </w:rPr>
            <w:t>${replyAuthor} (${replyInitials})</w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:sz w:val="16"/>
              <w:color w:val="666666"/>
            </w:rPr>
            <w:t xml:space="preserve"> - ${new Date(replyTimestamp).toLocaleString('zh-CN')}</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:pStyle w:val="CommentText"/>
            <w:ind w:left="360"/>
          </w:pPr>
          <w:r>
            <w:t>${replyContent}</w:t>
          </w:r>
        </w:p>`;
        });
      }
      
      commentXml += `
      </w:comment>`;
      
      return commentXml;
    }).join('\n');
    
    const commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${commentsElements}
</w:comments>`;
    
    console.log('批注XML生成完成:');
    console.log(`  - 批注数量: ${comments.length}`);
    console.log(`  - 总回复数: ${comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0)}`);
    console.log(`  - XML长度: ${commentsXml.length} 字符`);
    
    return commentsXml;
  }

  /**
   * 从XML中提取所有文本内容用于调试
   */
  private extractAllTextFromXml(xml: string): string {
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const textContents: string[] = [];
    let match;
    
    while ((match = textPattern.exec(xml)) !== null) {
      const textContent = match[1];
      if (textContent) {
        textContents.push(textContent);
      }
    }
    
    return textContents.join('');
  }



  /**
   * 生成用户缩写
   */
  private generateInitials(author: string): string {
    if (!author || author.trim().length === 0) {
      return 'U';
    }
    
    const cleanAuthor = author.trim();
    
    // 如果是中文名，取前两个字符
    if (/[\u4e00-\u9fff]/.test(cleanAuthor)) {
      return cleanAuthor.substring(0, 2);
    }
    
    // 如果是英文名，取每个单词的首字母
    const words = cleanAuthor.split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    // 单个单词，取前两个字母
    return cleanAuthor.substring(0, 2).toUpperCase();
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
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
           xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" 
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
           xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" 
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
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