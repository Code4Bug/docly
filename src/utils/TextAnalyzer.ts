/**
 * 通用文本分析工具类
 * 提供各种文本内容的分析和识别功能，不依赖特定的业务场景
 */
export class TextAnalyzer {
  
  /**
   * 判断文本是否可能是标题
   * 基于文本结构特征和格式特征进行判断
   * @param element - DOM元素
   * @param textContent - 文本内容
   * @returns 是否为标题
   */
  static isLikelyTitle(element: Element, textContent: string): boolean {
    // 基于结构特征判断
    const structuralIndicators = [
      textContent.length < 100,  // 标题通常较短
      !textContent.includes('。'), // 中文标题通常不包含句号
      !textContent.includes('.'), // 英文标题通常不包含句号
      element.tagName === 'P',   // 在Word中标题通常转换为P标签
      element.previousElementSibling === null || // 可能是第一个元素
      element.nextElementSibling?.tagName === 'P' // 后面跟着段落
    ];
    
    // 基于格式特征判断
    const formatIndicators = [
      /^[第\d一二三四五六七八九十]+[章节条款部分]/,  // 章节标识
      /^[\d一二三四五六七八九十]+[、\.]/,           // 序号格式
      /^\([一二三四五六七八九十\d]+\)/,            // 括号序号
      /^[A-Za-z]+[\.、]/,                        // 字母序号
      /^\d+\.\d+/,                              // 多级编号
      /^附录[A-Z\d]/,                           // 附录标识
      /^参考文献$/,                              // 特殊章节
      /^致谢$/,                                 // 特殊章节
      /^摘要$/,                                 // 特殊章节
      /^Abstract$/i                             // 英文摘要
    ];
    
    const hasStructuralFeatures = structuralIndicators.filter(Boolean).length >= 2;
    const hasFormatFeatures = formatIndicators.some(pattern => pattern.test(textContent.trim()));
    
    return hasStructuralFeatures || hasFormatFeatures;
  }

  /**
   * 判断文本是否可能是列表项
   * @param textContent - 文本内容
   * @returns 是否为列表项
   */
  static isLikelyListItem(textContent: string): boolean {
    return /^[•·▪▫◦‣⁃]\s/.test(textContent) ||
           /^\d+[\.、]\s/.test(textContent) ||
           /^[a-zA-Z][\.、]\s/.test(textContent);
  }

  /**
   * 判断文本是否可能是引用
   * @param textContent - 文本内容
   * @returns 是否为引用
   */
  static isLikelyQuote(textContent: string): boolean {
    return textContent.startsWith('"') && textContent.endsWith('"') ||
           textContent.startsWith('"') && textContent.endsWith('"') ||
           textContent.startsWith('「') && textContent.endsWith('」') ||
           textContent.includes('引用') ||
           textContent.includes('摘自');
  }

  /**
   * 判断文本是否为中文段落
   * @param textContent - 文本内容
   * @returns 是否为中文段落
   */
  static isChineseParagraph(textContent: string): boolean {
    const chineseCharCount = (textContent.match(/[\u4e00-\u9fff]/g) || []).length;
    return chineseCharCount > textContent.length * 0.3;
  }

  /**
   * 判断文本是否为英文段落
   * @param textContent - 文本内容
   * @returns 是否为英文段落
   */
  static isEnglishParagraph(textContent: string): boolean {
    const englishCharCount = (textContent.match(/[a-zA-Z]/g) || []).length;
    return englishCharCount > textContent.length * 0.5;
  }

  /**
   * 检测列表项的缩进级别
   * @param textContent - 文本内容
   * @returns 缩进级别
   */
  static detectListIndentLevel(textContent: string): number {
    const leadingSpaces = textContent.match(/^\s*/)?.[0].length || 0;
    return Math.floor(leadingSpaces / 4); // 每4个空格为一个缩进级别
  }

  /**
   * 推断标题级别
   * @param textContent - 文本内容
   * @returns 标题级别 (1-6)
   */
  static inferTitleLevel(textContent: string): number {
    // 基于章节标识推断级别
    if (/^第[一二三四五六七八九十\d]+章/.test(textContent)) return 1;
    if (/^第[一二三四五六七八九十\d]+节/.test(textContent)) return 2;
    if (/^[一二三四五六七八九十\d]+[、\.]/.test(textContent)) return 3;
    if (/^\([一二三四五六七八九十\d]+\)/.test(textContent)) return 4;
    if (/^[A-Za-z]+[\.、]/.test(textContent)) return 5;
    
    // 基于文本长度推断级别
    if (textContent.length <= 10) return 2;
    if (textContent.length <= 20) return 3;
    if (textContent.length <= 30) return 4;
    
    return 3; // 默认级别
  }

  /**
   * 检测文本的对齐方式
   * @param element - DOM元素
   * @param textContent - 文本内容
   * @returns 对齐方式
   */
  static detectTextAlignment(element: Element, textContent: string): string | null {
    // 从内联样式中检测
    const style = element.getAttribute('style');
    if (style) {
      const alignMatch = style.match(/text-align:\s*([^;]+)/);
      if (alignMatch) {
        return alignMatch[1].trim();
      }
    }

    // 从类名中检测
    const className = element.className;
    if (className.includes('center')) return 'center';
    if (className.includes('right')) return 'right';
    if (className.includes('justify')) return 'justify';
    if (className.includes('left')) return 'left';

    return null;
  }

  /**
   * 检测元素的缩进级别
   * @param element - DOM元素
   * @returns 缩进级别
   */
  static detectIndentLevel(element: Element): number {
    // 从样式中检测缩进
    const style = element.getAttribute('style');
    if (style) {
      const marginMatch = style.match(/margin-left:\s*(\d+)px/);
      if (marginMatch) {
        return Math.floor(parseInt(marginMatch[1]) / 20); // 每20px为一个缩进级别
      }
      
      const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
      if (paddingMatch) {
        return Math.floor(parseInt(paddingMatch[1]) / 20);
      }
    }

    // 从类名中检测缩进
    const className = element.className;
    const indentMatch = className.match(/indent-(\d+)/);
    if (indentMatch) {
      return parseInt(indentMatch[1]);
    }

    return 0;
  }

  /**
   * 计算元素的嵌套级别
   * @param element - DOM元素
   * @returns 嵌套级别
   */
  static calculateNestingLevel(element: Element): number {
    let level = 0;
    let parent = element.parentElement;
    
    while (parent && parent.tagName !== 'BODY') {
      if (['DIV', 'P', 'SECTION', 'ARTICLE'].includes(parent.tagName)) {
        level++;
      }
      parent = parent.parentElement;
    }
    
    return level;
  }
}