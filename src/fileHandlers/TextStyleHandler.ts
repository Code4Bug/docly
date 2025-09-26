/**
 * 文本样式处理器
 * 将Word中的文本样式进行处理还原为HTML内联样式
 */
export class TextStyleHandler {
  
  /**
   * 将Word文档的格式化文本运行转换为Editor.js可识别的HTML格式
   *
   * 此方法处理Word XML中解析出的样式信息，将其转换为Editor.js内联工具能够理解的HTML标记。
   * 支持的样式包括：字体、字号、颜色、粗体、斜体、下划线、背景色等。
   *
   * @param runs - 格式化的文本运行数组，每个run包含text和styles属性
   * @returns 转换后的HTML格式字符串，可直接用于Editor.js的文本内容
   *
   * @example
   * // Word XML: <w:r><w:rPr><w:b/><w:color w:val="FF0000"/></w:rPr><w:t>红色粗体</w:t></w:r>
   * // 输出: <b><span style="color: #FF0000;">红色粗体</span></b>
   */
  convertRunsToEditorFormat(runs: any[]): string {
    if (!runs?.length) return "";

    return runs
      .map((run) => this.convertSingleRunToHtml(run))
      .filter(Boolean)
      .join("");
  }

  /**
   * 转换单个文本运行为HTML格式
   * @param run - 单个文本运行对象
   * @returns HTML字符串
   */
  private convertSingleRunToHtml(run: any): string {
    if (!run?.text) return "";

    let text = this.escapeHtml(run.text);
    const styles = run.styles || {};

    // 应用内联样式
    text = this.applyInlineStyles(text, styles);
    
    // 应用HTML标记（按优先级从外到内）
    text = this.applyHtmlTags(text, styles);

    return text;
  }

  /**
   * 应用内联样式到文本
   * @param text - 文本内容
   * @param styles - 样式对象
   * @returns 应用样式后的HTML字符串
   */
  private applyInlineStyles(text: string, styles: any): string {
    const inlineStyles = this.buildInlineStyles(styles);
    
    if (inlineStyles.length === 0) return text;

    const styleString = inlineStyles.join("; ").replace(/"/g, "&quot;");
    return `<span style="${styleString}">${text}</span>`;
  }

  /**
   * 构建内联样式数组
   * @param styles - 样式对象
   * @returns 样式字符串数组
   */
  private buildInlineStyles(styles: any): string[] {
    const inlineStyles: string[] = [];
    const styleHandlers = this.getStyleHandlers();

    for (const [property, handler] of Object.entries(styleHandlers)) {
      const value = styles[property];
      if (value != null) {
        const styleValue = handler(value);
        if (styleValue) {
          inlineStyles.push(styleValue);
        }
      }
    }

    return inlineStyles;
  }

  /**
   * 获取样式处理器映射
   * @returns 样式处理器对象
   */
  private getStyleHandlers(): Record<string, (value: any) => string | null> {
    return {
      fontFamily: (value: string) => {
        const safeFontFamily = value.replace(/'/g, "\\'");
        return `font-family: '${safeFontFamily}'`;
      },
      fontSize: (value: string) => `font-size: ${value}`,
      color: (value: string) => `color: ${value}`,
      backgroundColor: (value: string) => 
        value !== "#FFFFFF" ? `background-color: ${value}` : null,
      highlight: (value: string) => {
        if (value === "none") return null;
        const highlightColor = this.getHighlightColor(value);
        return `background-color: ${highlightColor}`;
      },
      letterSpacing: (value: string) => `letter-spacing: ${value}`,
      verticalAlign: (value: string) => `vertical-align: ${value}`,
    };
  }

  /**
   * 获取高亮颜色映射
   * @param highlight - 高亮颜色名称
   * @returns CSS颜色值
   */
  private getHighlightColor(highlight: string): string {
    const highlightColors: Record<string, string> = {
      yellow: "#FFFF00",
      green: "#00FF00",
      cyan: "#00FFFF",
      magenta: "#FF00FF",
      blue: "#0000FF",
      red: "#FF0000",
      darkBlue: "#000080",
      darkCyan: "#008080",
      darkGreen: "#008000",
      darkMagenta: "#800080",
      darkRed: "#800000",
      darkYellow: "#808000",
      darkGray: "#808080",
      lightGray: "#C0C0C0",
      black: "#000000",
    };
    
    return highlightColors[highlight] || highlight;
  }

  /**
   * 应用HTML标记到文本
   * @param text - 文本内容
   * @param styles - 样式对象
   * @returns 应用标记后的HTML字符串
   */
  private applyHtmlTags(text: string, styles: any): string {
    const tagHandlers = this.getHtmlTagHandlers();
    
    for (const [property, handler] of Object.entries(tagHandlers)) {
      const value = styles[property];
      if (value != null) {
        const result = handler(text, value, styles);
        if (result !== text) {
          text = result;
        }
      }
    }

    return text;
  }

  /**
   * 获取HTML标记处理器映射
   * @returns HTML标记处理器对象
   */
  private getHtmlTagHandlers(): Record<string, (text: string, value: any, styles: any) => string> {
    return {
      fontWeight: (text: string, value: string) => 
        value === "bold" ? `<b>${text}</b>` : text,
      
      fontStyle: (text: string, value: string) => 
        value === "italic" ? `<i>${text}</i>` : text,
      
      textDecoration: (text: string, value: string, styles: any) => {
        if (value?.includes("underline")) {
          if (styles.underlineColor) {
            const safeColor = styles.underlineColor.replace(/"/g, "&quot;");
            return `<u><span style="text-decoration-color: ${safeColor};">${text}</span></u>`;
          }
          return `<u>${text}</u>`;
        }
        
        if (value?.includes("line-through")) {
          return `<s>${text}</s>`;
        }
        
        return text;
      },
    };
  }

  /**
   * 转义HTML特殊字符
   * @param text - 原始文本
   * @returns 转义后的文本
   */
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