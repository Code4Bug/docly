import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import type { FileHandler, EditorData } from '../types';

/**
 * Word文件处理器
 * 负责Word文件的导入和导出
 */
export class WordHandler implements FileHandler {
  
  /**
   * 导入Word文件
   * 将.docx文件转换为编辑器数据格式
   */
  async import(file: File): Promise<EditorData> {
    if (!file.name.endsWith('.docx')) {
      throw new Error('仅支持.docx格式的Word文件');
    }

    try {
      // 使用docx-preview将docx转换为HTML
      const arrayBuffer = await file.arrayBuffer();
      
      // 创建一个临时容器来渲染文档
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      
      try {
        // 使用docx-preview渲染文档
         await renderAsync(arrayBuffer, container, undefined, {
           className: 'docx-preview',
           inWrapper: false,
           ignoreWidth: false,
           ignoreHeight: false,
           ignoreFonts: false, // 确保不忽略字体信息
           breakPages: false,
           ignoreLastRenderedPageBreak: true,
           experimental: false,
           trimXmlDeclaration: true,
           useBase64URL: false,
           renderChanges: false,
           renderComments: false,
           renderEndnotes: false,
           renderFootnotes: false,
           renderHeaders: false,
           renderFooters: false
         });
        
        // 获取渲染后的HTML内容
        const htmlContent = container.innerHTML;
        
        // 调试：输出转换后的HTML内容
        console.log('docx-preview转换完成');
        console.log('转换后的HTML长度:', htmlContent.length);
        console.log('HTML前500字符:', htmlContent.substring(0, 500));
        
        // 检查是否有空的HTML内容
        if (htmlContent.length === 0) {
          console.warn('警告：转换后的HTML内容为空');
        }
        
        // 检查HTML中是否包含style属性
        const styleMatches = htmlContent.match(/style="[^"]*"/g);
        console.log('找到的style属性数量:', styleMatches ? styleMatches.length : 0);
        if (styleMatches && styleMatches.length > 0) {
          console.log('前5个style属性:', styleMatches.slice(0, 5));
        }
        
        // 检查是否包含font-family
        const fontFamilyMatches = htmlContent.match(/font-family[^;"]*/g);
        console.log('找到的font-family属性数量:', fontFamilyMatches ? fontFamilyMatches.length : 0);
        if (fontFamilyMatches && fontFamilyMatches.length > 0) {
          console.log('找到的font-family属性:', fontFamilyMatches);
          // 特别检查楷体相关字体
          const kaitiMatches = fontFamilyMatches.filter(font => 
            font.includes('楷体') || font.includes('KaiTi') || font.includes('Kai')
          );
          if (kaitiMatches.length > 0) {
            console.log('发现楷体字体:', kaitiMatches);
          }
        }
        
        // 在转换前先处理HTML中的楷体字体
        let processedHtml = htmlContent;
        
        // 查找并标记所有包含楷体字体的元素
        const kaitiRegex = /(font-family[^;]*(?:楷体|KaiTi|kaiti)[^;"]*)/gi;
        if (kaitiRegex.test(htmlContent)) {
          console.log('在HTML中发现楷体字体，进行预处理');
          // 为包含楷体的元素添加特殊类名
          processedHtml = htmlContent.replace(
            /(<[^>]*style="[^"]*(?:楷体|KaiTi|kaiti)[^"]*"[^>]*>)/gi,
            (match) => {
              if (match.includes('class="')) {
                return match.replace('class="', 'class="kaiti-font debug-kaiti ');
              } else {
                return match.replace('>', ' class="kaiti-font debug-kaiti">');
              }
            }
          );
          console.log('楷体字体预处理完成');
        }

        // 查找并标记所有包含仿宋字体的元素
        const fangsongRegex = /(font-family[^;]*(?:仿宋|FangSong|fangsong)[^;"]*)/gi;
        if (fangsongRegex.test(processedHtml)) {
          console.log('在HTML中发现仿宋字体，进行预处理');
          // 为包含仿宋的元素添加特殊类名
          processedHtml = processedHtml.replace(
            /(<[^>]*style="[^"]*(?:仿宋|FangSong|fangsong)[^"]*"[^>]*>)/gi,
            (match) => {
              if (match.includes('class="')) {
                return match.replace('class="', 'class="fangsong-font debug-fangsong ');
              } else {
                return match.replace('>', ' class="fangsong-font debug-fangsong">');
              }
            }
          );
          console.log('仿宋字体预处理完成');
        }

        // 将HTML转换为编辑器数据格式
        const editorData = this.htmlToEditorData(processedHtml);
        
        // 调试：输出编辑器数据
        console.log('转换后的编辑器数据:', JSON.stringify(editorData, null, 2));
        console.log('编辑器数据块数量:', editorData.blocks.length);
        
        // 检查是否有空的编辑器数据
        if (editorData.blocks.length === 0) {
          console.warn('警告：转换后的编辑器数据为空');
        }
        
        return editorData;
        
      } finally {
        // 清理临时容器
        document.body.removeChild(container);
      }
      
    } catch (error) {
      console.error('Word文件导入失败:', error);
      throw new Error('Word文件导入失败，请检查文件格式');
    }
  }

  /**
   * 导出为Word文件
   * 将编辑器数据转换为.docx文件
   */
  async export(data: EditorData): Promise<File> {
    try {
      // 将编辑器数据转换为HTML
      const html = this.editorDataToHtml(data);
      
      // 创建Word文档模板
      const docxTemplate = this.createDocxTemplate(html);
      
      // 生成Word文件
      const buffer = docxTemplate.getZip().generate({ type: 'arraybuffer' });
      
      // 创建File对象
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const fileName = `document_${Date.now()}.docx`;
      return new File([blob], fileName, { type: blob.type });
      
    } catch (error) {
      console.error('Word文件导出失败:', error);
      throw new Error('Word文件导出失败');
    }
  }

  /**
   * 预览编辑器数据
   * 生成HTML预览
   */
  preview(data: EditorData): HTMLElement {
    const container = document.createElement('div');
    container.className = 'docly-preview';
    container.innerHTML = this.editorDataToHtml(data);
    return container;
  }

  /**
   * 将HTML转换为编辑器数据格式
   * 保留Word文档中的样式信息
   */
  private htmlToEditorData(html: string): EditorData {
    console.log('开始HTML到编辑器数据转换');
    console.log('输入HTML长度:', html.length);
    console.log('输入HTML内容:', html.substring(0, 200));
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: any[] = [];

    // 遍历所有子节点，保持原有顺序
    const bodyChildren = Array.from(doc.body.children);
    console.log('找到的body子元素数量:', bodyChildren.length);
    
    bodyChildren.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      console.log(`处理第${index}个元素: ${tagName}, 内容: ${element.textContent?.substring(0, 50)}`);
      
      // 处理标题
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const level = parseInt(element.tagName.charAt(1));
        const block = {
          id: `heading_${index}`,
          type: 'header',
          data: {
            text: this.extractStyledText(element),
            level: level,
            styles: this.extractElementStyles(element)
          }
        };
        console.log('添加标题块:', block);
        blocks.push(block);
      }
      // 处理段落
      else if (tagName === 'p') {
        if (element.textContent?.trim()) {
          const block = {
            id: `paragraph_${index}`,
            type: 'paragraph',
            data: {
              text: this.extractStyledText(element),
              styles: this.extractElementStyles(element)
            }
          };
          console.log('添加段落块:', block);
          blocks.push(block);
        } else {
          console.log('跳过空段落');
        }
      }
      // 处理列表
      else if (['ul', 'ol'].includes(tagName)) {
        const items = Array.from(element.querySelectorAll('li')).map(li => ({
          text: this.extractStyledText(li),
          styles: this.extractElementStyles(li)
        }));
        blocks.push({
          id: `list_${index}`,
          type: 'list',
          data: {
            style: tagName === 'ul' ? 'unordered' : 'ordered',
            items: items,
            styles: this.extractElementStyles(element)
          }
        });
      }
      // 处理表格
      else if (tagName === 'table') {
        const rows = Array.from(element.querySelectorAll('tr')).map(tr => {
          return Array.from(tr.querySelectorAll('td, th')).map(cell => ({
            text: this.extractStyledText(cell),
            styles: this.extractElementStyles(cell)
          }));
        });
        blocks.push({
          id: `table_${index}`,
          type: 'table',
          data: {
            rows: rows,
            styles: this.extractElementStyles(element)
          }
        });
      }
      // 处理其他块级元素
      else if (element.textContent?.trim()) {
        blocks.push({
          id: `block_${index}`,
          type: 'paragraph',
          data: {
            text: this.extractStyledText(element),
            styles: this.extractElementStyles(element)
          }
        });
      }
    });

    console.log('HTML转换完成，生成的块数量:', blocks.length);
    console.log('生成的块详情:', blocks.map(b => ({ type: b.type, id: b.id, textLength: b.data.text?.length || 0 })));

    return {
      time: Date.now(),
      blocks: blocks,
      version: '2.28.2'
    };
  }

  /**
   * 提取元素的样式信息
   * 基于元素结构和属性进行智能样式推断，而非依赖具体内容匹配
   */
  private extractElementStyles(element: Element): any {
    console.log('=== 样式提取详细信息 ===');
    console.log('元素标签:', element.tagName);
    console.log('元素类名:', element.className);
    console.log('元素ID:', element.id);
    console.log('所有属性:', Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`));
    console.log('元素文本内容:', element.textContent?.substring(0, 50));

    const styles: any = {};
    
    // 检查元素是否包含中文字体相关的属性或样式
    const elementHtml = element.outerHTML;
    if (elementHtml.includes('方正') || elementHtml.includes('楷体') || elementHtml.includes('宋体') || elementHtml.includes('黑体') || elementHtml.includes('仿宋')) {
      console.log('检测到可能包含中文字体的元素:', elementHtml.substring(0, 200));
    }

    // 1. 基于元素标签的样式推断
    this.applyTagBasedStyles(element, styles);

    // 2. 基于类名的样式推断
    this.applyClassBasedStyles(element, styles);

    // 3. 提取内联样式
    this.extractInlineStyles(element, styles);

    // 4. 基于元素层级和上下文的样式推断
    this.applyContextBasedStyles(element, styles);

    // 5. 提取子元素的样式信息
    this.extractChildElementStyles(element, styles);

    console.log('最终提取的样式:', styles);
    return Object.keys(styles).length > 0 ? styles : null;
  }

  /**
   * 基于HTML标签类型应用默认样式
   */
  private applyTagBasedStyles(element: Element, styles: any): void {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'h1':
        styles.fontSize = '24px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '16px';
        break;
      case 'h2':
        styles.fontSize = '20px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '14px';
        break;
      case 'h3':
        styles.fontSize = '18px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '12px';
        break;
      case 'h4':
      case 'h5':
      case 'h6':
        styles.fontSize = '16px';
        styles.fontWeight = 'bold';
        styles.lineHeight = '1.4';
        styles.marginBottom = '10px';
        break;
      case 'p':
        styles.lineHeight = '1.6';
        styles.marginBottom = '12px';
        break;
      case 'strong':
      case 'b':
        styles.fontWeight = 'bold';
        break;
      case 'em':
      case 'i':
        styles.fontStyle = 'italic';
        break;
      case 'u':
        styles.textDecoration = 'underline';
        break;
    }
    
    console.log(`标签 ${tagName} 应用的样式:`, styles);
  }

  /**
   * 基于CSS类名应用样式
   */
  private applyClassBasedStyles(element: Element, styles: any): void {
    const classList = Array.from(element.classList);
    
    classList.forEach(className => {
      switch (className) {
        case 'heading-1':
        case 'title':
          styles.fontSize = '28px';
          styles.fontWeight = 'bold';
          styles.marginBottom = '20px';
          break;
        case 'heading-2':
        case 'subtitle':
          styles.fontSize = '22px';
          styles.fontWeight = 'bold';
          styles.marginBottom = '16px';
          break;
        case 'heading-3':
          styles.fontSize = '18px';
          styles.fontWeight = 'bold';
          styles.marginBottom = '14px';
          break;
        case 'paragraph':
          styles.lineHeight = '1.8';
          break;
        case 'bold':
        case 'strong-style':
          styles.fontWeight = 'bold';
          break;
        case 'italic':
        case 'emphasis-style':
          styles.fontStyle = 'italic';
          break;
        case 'underline':
        case 'underline-style':
          styles.textDecoration = 'underline';
          break;
      }
    });
    
    if (classList.length > 0) {
      console.log(`类名 ${classList.join(', ')} 应用的样式:`, styles);
    }
  }

  /**
   * 提取元素的内联样式
   */
  private extractInlineStyles(element: Element, styles: any): void {
    const inlineStyle = element.getAttribute('style');
    if (inlineStyle) {
      console.log('内联样式:', inlineStyle);
      
      // 解析内联样式
      const styleDeclarations = inlineStyle.split(';');
      styleDeclarations.forEach(declaration => {
        const [property, value] = declaration.split(':').map(s => s.trim());
        if (property && value) {
          // 转换CSS属性名为驼峰命名
          const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
          // 跳过textAlign，由统一对齐处理逻辑处理
          if (property === 'text-align') {
            return;
          }
          if (property === 'font-family') {
            // 对字体族进行中文字体映射处理
            const originalFont = value;
            styles[camelCaseProperty] = this.mapChineseFontName(value);
            console.log(`内联样式字体族映射: ${value} -> ${styles[camelCaseProperty]}`);
            
            // 特别处理楷体字体
            if (this.isKaiTiFont(originalFont)) {
              console.log(`检测到楷体字体，添加特殊标记: ${originalFont}`);
              // 添加楷体字体标记类
              if (element.classList) {
                element.classList.add('kaiti-font');
              }
              // 强制设置楷体字体
              styles[camelCaseProperty] = '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif';
            }
            
            // 特别处理仿宋字体
            if (this.isFangSongFont(originalFont)) {
              console.log(`检测到仿宋字体，添加特殊标记: ${originalFont}`);
              // 添加仿宋字体标记类
              if (element.classList) {
                element.classList.add('fangsong-font', 'debug-fangsong');
              }
              // 强制设置仿宋字体 - 使用统一的字体族定义
              styles[camelCaseProperty] = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
            }
          } else {
            styles[camelCaseProperty] = value;
          }
        }
      });
    }

    // 检查HTMLElement的style属性
    if (element instanceof HTMLElement && element.style) {
      const allStyles = [
        'fontWeight', 'fontSize', 'fontFamily', 'fontStyle', 
        'color', 'backgroundColor', 'textDecoration', 'textAlign', 
        'lineHeight', 'textIndent', 'letterSpacing', 'wordSpacing',
        // 添加缩进相关样式
        'paddingLeft', 'paddingRight', 'marginLeft', 'marginRight',
        'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'
      ];
      
      allStyles.forEach(prop => {
        const value = (element.style as any)[prop];
        if (value && value !== '' && value !== 'normal' && value !== 'auto' && value !== '0px') {
          if (prop === 'fontFamily') {
            // 对字体族进行中文字体映射处理
            styles[prop] = this.mapChineseFontName(value);
            console.log(`内联样式字体族映射: ${value} -> ${styles[prop]}`);
          } else {
            styles[prop] = value;
            console.log(`提取样式 ${prop}:`, value);
          }
        }
      });
    }

    // 从计算样式中提取字体信息（如果可用）
    if (typeof window !== 'undefined' && element instanceof HTMLElement) {
      try {
        const computed = window.getComputedStyle(element);
        const computedFontStyles = [
          { prop: 'fontFamily', defaultValue: 'serif' },
          { prop: 'fontSize', defaultValue: '16px' },
          { prop: 'fontWeight', defaultValue: '400' },
          { prop: 'fontStyle', defaultValue: 'normal' },
          { prop: 'color', defaultValue: 'rgb(0, 0, 0)' },
          { prop: 'textDecoration', defaultValue: 'none' }
        ];

        computedFontStyles.forEach(({ prop, defaultValue }) => {
          if (!styles[prop]) {
            const computedValue = computed[prop as keyof CSSStyleDeclaration] as string;
            if (computedValue && computedValue !== defaultValue && computedValue !== 'normal') {
              if (prop === 'fontFamily') {
                // 对字体族进行中文字体映射处理
                styles[prop] = this.mapChineseFontName(computedValue);
                console.log(`从计算样式提取并映射fontFamily: ${computedValue} -> ${styles[prop]}`);
              } else {
                styles[prop] = computedValue;
                console.log(`从计算样式提取 ${prop}:`, computedValue);
              }
            }
          }
        });
      } catch (e) {
        console.warn('获取计算样式失败:', e);
      }
    }
  }

  /**
   * 基于元素上下文应用样式
   */
  private applyContextBasedStyles(element: Element, styles: any): void {
    // 检查父元素上下文
    const parent = element.parentElement;
    if (parent) {
      // 如果在表格中
      if (parent.tagName === 'TD' || parent.tagName === 'TH') {
        styles.padding = '8px';
        styles.border = '1px solid #ddd';
      }
      
      // 如果在列表中
      if (parent.tagName === 'LI') {
        styles.marginBottom = '4px';
      }
    }

    // 检测缩进级别
    this.detectAndApplyIndentStyles(element, styles);

    // 统一处理文本对齐
    this.detectAndApplyTextAlignment(element, styles, element.textContent || '');

    // 基于Word文档原始样式的智能推断
    this.applyWordStyleInference(element, styles);
  }

  /**
   * 统一检测和应用文本对齐样式
   * 避免多处设置textAlign导致的冲突
   */
  private detectAndApplyTextAlignment(element: Element, styles: any, textContent: string): void {
    // 如果已经有明确的对齐设置，优先保留
    if (styles.textAlign) {
      console.log('保留已有对齐设置:', styles.textAlign);
      return;
    }

    // 从内联样式中检测对齐
    const inlineAlign = this.extractAlignmentFromInlineStyle(element);
    if (inlineAlign) {
      styles.textAlign = inlineAlign;
      console.log('从内联样式检测到对齐:', inlineAlign);
      return;
    }

    // 从类名中检测对齐
    const classAlign = this.extractAlignmentFromClass(element);
    if (classAlign) {
      styles.textAlign = classAlign;
      console.log('从类名检测到对齐:', classAlign);
      return;
    }

    // 根据元素类型和内容应用默认对齐
    this.applyDefaultAlignment(element, styles, textContent);
  }

  /**
   * 从内联样式中提取对齐信息
   */
  private extractAlignmentFromInlineStyle(element: Element): string | null {
    const style = element.getAttribute('style');
    if (!style) return null;

    const alignMatch = style.match(/text-align\s*:\s*([^;]+)/i);
    if (alignMatch) {
      const align = alignMatch[1].trim();
      console.log('内联样式对齐检测:', align);
      return align;
    }

    return null;
  }

  /**
   * 从类名中提取对齐信息
   */
  private extractAlignmentFromClass(element: Element): string | null {
    const className = element.className;
    if (!className) return null;

    // 检测常见的对齐类名
    const alignmentClasses = {
      'text-center': 'center',
      'text-left': 'left',
      'text-right': 'right',
      'text-justify': 'justify',
      'center': 'center',
      'left': 'left',
      'right': 'right',
      'justify': 'justify'
    };

    for (const [cls, align] of Object.entries(alignmentClasses)) {
      if (className.includes(cls)) {
        console.log('类名对齐检测:', cls, '->', align);
        return align;
      }
    }

    return null;
  }

  /**
   * 应用默认对齐规则
   */
  private applyDefaultAlignment(element: Element, styles: any, textContent: string): void {
    const tagName = element.tagName.toLowerCase();
    
    // 标题默认居中对齐
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      // 检查是否是真正的标题（长度较短且可能包含标题特征）
      if (textContent.length < 50 && this.isLikelyTitle(element, textContent)) {
        styles.textAlign = 'center';
        console.log('标题默认居中对齐');
        return;
      }
    }

    // 段落根据语言特征设置对齐
    if (tagName === 'p') {
      if (this.isChineseParagraph(textContent)) {
        styles.textAlign = 'justify';
        console.log('中文段落默认两端对齐');
      } else if (this.isEnglishParagraph(textContent)) {
        styles.textAlign = 'left';
        console.log('英文段落默认左对齐');
      } else {
        styles.textAlign = 'left';
        console.log('普通段落默认左对齐');
      }
      return;
    }

    // 列表项默认左对齐
    if (['li', 'ul', 'ol'].includes(tagName)) {
      styles.textAlign = 'left';
      console.log('列表项默认左对齐');
      return;
    }

    // 其他元素默认左对齐
    styles.textAlign = 'left';
    console.log('其他元素默认左对齐');
  }

  /**
   * 检测并应用缩进样式
   */
  private detectAndApplyIndentStyles(element: Element, styles: any): void {
    const textContent = element.textContent?.trim() || '';
    
    // 检查元素的缩进属性
    const indentLevel = this.detectIndentLevel(element);
    
    if (indentLevel > 0) {
      // 根据缩进级别应用样式
      const indentValue = indentLevel * 20; // 每级缩进20px
      
      // 检查是否为列表项
      if (this.isLikelyListItem(textContent) || element.tagName.toLowerCase() === 'li') {
        styles.paddingLeft = `${indentValue}px`;
        console.log(`应用列表项缩进: ${indentValue}px (级别: ${indentLevel})`);
      } else {
        // 普通段落使用textIndent
        styles.textIndent = `${indentValue}px`;
        console.log(`应用段落缩进: ${indentValue}px (级别: ${indentLevel})`);
      }
    }
    
    // 检查Word特有的缩进标记
    this.detectWordIndentMarkers(element, styles, textContent);
  }

  /**
   * 检测元素的缩进级别
   */
  private detectIndentLevel(element: Element): number {
    let indentLevel = 0;
    
    // 检查类名中的缩进信息
    const className = element.className || '';
    const indentMatch = className.match(/indent-?(\d+)/i);
    if (indentMatch) {
      indentLevel = parseInt(indentMatch[1]);
      console.log(`从类名检测到缩进级别: ${indentLevel}`);
      return indentLevel;
    }
    
    // 检查样式中的缩进信息
    if (element instanceof HTMLElement) {
      const paddingLeft = element.style.paddingLeft;
      const marginLeft = element.style.marginLeft;
      const textIndent = element.style.textIndent;
      
      // 从padding-left推断缩进级别
      if (paddingLeft && paddingLeft !== '0px') {
        const paddingValue = parseInt(paddingLeft);
        if (paddingValue > 0) {
          indentLevel = Math.max(indentLevel, Math.ceil(paddingValue / 20));
          console.log(`从paddingLeft推断缩进级别: ${indentLevel} (${paddingLeft})`);
        }
      }
      
      // 从margin-left推断缩进级别
      if (marginLeft && marginLeft !== '0px') {
        const marginValue = parseInt(marginLeft);
        if (marginValue > 0) {
          indentLevel = Math.max(indentLevel, Math.ceil(marginValue / 20));
          console.log(`从marginLeft推断缩进级别: ${indentLevel} (${marginLeft})`);
        }
      }
      
      // 从text-indent推断缩进级别
      if (textIndent && textIndent !== '0px') {
        const indentValue = parseInt(textIndent);
        if (indentValue > 0) {
          indentLevel = Math.max(indentLevel, Math.ceil(indentValue / 20));
          console.log(`从textIndent推断缩进级别: ${indentLevel} (${textIndent})`);
        }
      }
    }
    
    // 检查父元素的嵌套级别
    const nestingLevel = this.calculateNestingLevel(element);
    if (nestingLevel > 1) {
      indentLevel = Math.max(indentLevel, nestingLevel - 1);
      console.log(`从嵌套级别推断缩进: ${indentLevel} (嵌套: ${nestingLevel})`);
    }
    
    return indentLevel;
  }

  /**
   * 计算元素的嵌套级别
   */
  private calculateNestingLevel(element: Element): number {
    let level = 0;
    let current = element.parentElement;
    
    while (current && level < 10) { // 限制最大检查深度
      const tagName = current.tagName.toLowerCase();
      if (['ul', 'ol', 'li', 'blockquote', 'div'].includes(tagName)) {
        level++;
      }
      current = current.parentElement;
    }
    
    return level;
  }

  /**
   * 检测Word特有的缩进标记
   */
  private detectWordIndentMarkers(element: Element, styles: any, textContent: string): void {
    // 检查文本开头的空格或制表符
    const leadingSpaces = textContent.match(/^(\s+)/);
    if (leadingSpaces) {
      const spaceCount = leadingSpaces[1].length;
      if (spaceCount >= 2) {
        const indentLevel = Math.ceil(spaceCount / 2);
        const indentValue = indentLevel * 20;
        
        if (!styles.textIndent && !styles.paddingLeft) {
          styles.textIndent = `${indentValue}px`;
          console.log(`从前导空格检测缩进: ${indentValue}px (空格数: ${spaceCount})`);
        }
      }
    }
    
    // 检查是否包含缩进标记符号
    const indentMarkers = ['　', '\u3000', '\t']; // 全角空格、制表符等
    for (const marker of indentMarkers) {
      if (textContent.startsWith(marker)) {
        const markerCount = textContent.match(new RegExp(`^(\\${marker}+)`))?.[1]?.length || 0;
        if (markerCount > 0) {
          const indentValue = markerCount * 20;
          if (!styles.textIndent && !styles.paddingLeft) {
            styles.textIndent = `${indentValue}px`;
            console.log(`从缩进标记检测缩进: ${indentValue}px (标记数: ${markerCount})`);
          }
        }
        break;
      }
    }
  }

  /**
   * 基于Word文档原始样式的智能推断机制
   * 通过分析元素的结构特征和上下文来推断原始Word样式
   */
  private applyWordStyleInference(element: Element, styles: any): void {
    const textContent = element.textContent || '';
    const textLength = textContent.length;
    
    console.log('Word样式推断 - 文本内容:', textContent.substring(0, 50));
    console.log('Word样式推断 - 文本长度:', textLength);
    
    // 1. 标题样式推断（基于结构特征而非具体内容）
    if (this.isLikelyTitle(element, textContent)) {
      this.applyTitleStyles(element, styles, textContent);
    }
    
    // 2. 段落样式推断
    else if (element.tagName === 'P') {
      this.applyParagraphStyles(element, styles, textContent);
    }
    
    // 3. 列表项样式推断
    if (this.isLikelyListItem(textContent)) {
      this.applyListItemStyles(styles, textContent);
    }
    
    // 4. 特殊格式推断（引用、注释等）
    if (this.isLikelyQuote(textContent)) {
      this.applyQuoteStyles(styles);
    }

    // 5. Word文档字体样式特殊处理
    this.applyWordFontInference(element, styles);
  }

  /**
   * 应用Word文档字体样式推断
   * 由于docx-preview转换后通常包含更好的字体信息，优先使用原始字体
   */
  private applyWordFontInference(element: Element, styles: any): void {
    const text = element.textContent || '';
    console.log('Word字体推断 - 处理元素:', element.tagName, '文本:', text.substring(0, 30));
    
    // 检查是否已有字体族信息
    if (styles.fontFamily) {
      console.log('Word字体推断 - 已有字体族:', styles.fontFamily);
      return;
    }
    
    // 检查是否包含特殊字体标记（Word转换后可能保留的属性）
    const classList = element.className || '';
    console.log('Word字体推断 - 类名:', classList);
    
    // 检查Word样式类名
    if (classList.includes('MsoNormal')) {
      console.log('检测到Word标准样式');
    }
    
    if (classList.includes('MsoTitle')) {
      styles.fontWeight = 'bold';
      styles.fontSize = '18px';
      console.log('检测到Word标题样式');
    }
    
    if (classList.includes('MsoSubtitle')) {
      styles.fontWeight = '600';
      styles.fontSize = '14px';
      console.log('检测到Word副标题样式');
    }

    // 由于docx-preview转换后通常包含更好的字体信息，优先使用原始字体
    if (text && this.isChineseParagraph(text)) {
      styles.fontFamily = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif';
      console.log('Word字体推断 - 应用默认中文字体:', styles.fontFamily);
    } else if (text) {
      styles.fontFamily = '"Times New Roman", "Helvetica", "Arial", sans-serif';
      console.log('Word字体推断 - 应用默认英文字体:', styles.fontFamily);
    }
  }

  /**
   * 映射中文字体名称到Web安全字体
   */
  private mapChineseFontName(fontName: string): string {
    // 清理字体名称，移除引号和多余空格
    const cleanFontName = fontName.replace(/['"]/g, '').trim();
    
    console.log('开始字体映射处理:', cleanFontName);
    
    // 中文字体映射表
    const chineseFontMap: { [key: string]: string } = {
      // 方正字体系列
      '方正小标宋简体': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      '方正小标宋_GBK': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      '方正小标宋': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      'FZXiaoBiaoSong-B05S': '"FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
      
      // 楷体系列 - 增强支持
      '楷体_GB2312': '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif',
      'KaiTi_GB2312': '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif',
      '楷体': '"KaiTi", "楷体", "KaiTi_GB2312", "STKaiti", "DFKai-SB", serif',
      'KaiTi': '"KaiTi", "楷体", "KaiTi_GB2312", "STKaiti", "DFKai-SB", serif',
      'STKaiti': '"STKaiti", "楷体", "KaiTi", "KaiTi_GB2312", "DFKai-SB", serif',
      'DFKai-SB': '"DFKai-SB", "KaiTi", "楷体", "KaiTi_GB2312", "STKaiti", serif',
      
      // 宋体系列
      '宋体': '"SimSun", "宋体", serif',
      'SimSun': '"SimSun", "宋体", serif',
      '新宋体': '"NSimSun", "新宋体", "SimSun", "宋体", serif',
      'NSimSun': '"NSimSun", "新宋体", "SimSun", "宋体", serif',
      
      // 黑体系列
      '黑体': '"SimHei", "黑体", sans-serif',
      'SimHei': '"SimHei", "黑体", sans-serif',
      '微软雅黑': '"Microsoft YaHei", "微软雅黑", "SimHei", "黑体", sans-serif',
      'Microsoft YaHei': '"Microsoft YaHei", "微软雅黑", "SimHei", "黑体", sans-serif',
      
      // 仿宋系列 - 修正映射顺序，优先使用本地字体文件
      '仿宋': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'FangSong': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      '仿宋_GB2312': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'FangSong_GB2312': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      
      // 隶书系列
      '隶书': '"LiSu", "隶书", serif',
      'LiSu': '"LiSu", "隶书", serif',
      
      // 幼圆系列
      '幼圆': '"YouYuan", "幼圆", sans-serif',
      'YouYuan': '"YouYuan", "幼圆", sans-serif'
    };
    
    // 检查是否有直接映射
    if (chineseFontMap[cleanFontName]) {
      console.log(`中文字体直接映射: ${cleanFontName} -> ${chineseFontMap[cleanFontName]}`);
      return chineseFontMap[cleanFontName];
    }
    
    // 特殊处理楷体相关字体的模糊匹配
    if (this.isKaiTiFont(cleanFontName)) {
      const kaitiFont = '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif';
      console.log(`楷体字体特殊处理: ${cleanFontName} -> ${kaitiFont}`);
      return kaitiFont;
    }

    // 特殊处理仿宋相关字体的模糊匹配
    if (this.isFangSongFont(cleanFontName)) {
      const fangsongFont = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
      console.log(`仿宋字体特殊处理: ${cleanFontName} -> ${fangsongFont}`);
      return fangsongFont;
    }
    
    // 模糊匹配
    for (const [key, value] of Object.entries(chineseFontMap)) {
      if (cleanFontName.includes(key) || key.includes(cleanFontName)) {
        console.log(`中文字体模糊匹配: ${cleanFontName} -> ${value}`);
        return value;
      }
    }
    
    // 如果包含中文字符，添加通用中文字体fallback
    if (/[\u4e00-\u9fff]/.test(cleanFontName)) {
      const fallbackFont = `"${cleanFontName}", "SimSun", "宋体", "Microsoft YaHei", "微软雅黑", serif`;
      console.log(`中文字体添加fallback: ${cleanFontName} -> ${fallbackFont}`);
      return fallbackFont;
    }
    
    // 返回原字体名称，添加引号保护
    const quotedFont = `"${cleanFontName}"`;
    console.log(`保持原字体名称: ${cleanFontName} -> ${quotedFont}`);
    return quotedFont;
  }

  /**
   * 检测是否为楷体相关字体
   */
  private isKaiTiFont(fontName: string): boolean {
    const kaitiKeywords = ['楷体', 'KaiTi', 'Kai', '楷', 'kaiti', 'KAITI'];
    return kaitiKeywords.some(keyword => 
      fontName.toLowerCase().includes(keyword.toLowerCase()) ||
      fontName.includes(keyword)
    );
  }

  /**
   * 检测是否为仿宋相关字体
   */
  private isFangSongFont(fontName: string): boolean {
    const fangsongKeywords = ['仿宋', 'FangSong', 'fangsong', 'FANGSONG', '仿宋_GB2312', 'FangSong_GB2312'];
    return fangsongKeywords.some(keyword => 
      fontName.toLowerCase().includes(keyword.toLowerCase()) ||
      fontName.includes(keyword)
    );
  }

  /**
   * 解析data-style属性
   */
  private parseDataStyleAttribute(dataStyle: string, styles: any): void {
    const styleRules = dataStyle.split(';');
    styleRules.forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (property && value) {
        const camelCaseProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        if (!styles[camelCaseProp]) {
          styles[camelCaseProp] = value;
          console.log(`从data-style提取样式 ${camelCaseProp}:`, value);
        }
      }
    });
  }

  /**
   * 转换Word字体大小到CSS
   */
  private convertWordSizeToCSS(wordSize: string): string | null {
    // Word字体大小映射表
    const sizeMap: { [key: string]: string } = {
      '1': '8px',
      '2': '10px', 
      '3': '12px',
      '4': '14px',
      '5': '18px',
      '6': '24px',
      '7': '36px'
    };
    
    // 如果是数字，使用映射表
    if (sizeMap[wordSize]) {
      return sizeMap[wordSize];
    }
    
    // 如果已经是CSS格式，直接返回
    if (wordSize.includes('px') || wordSize.includes('pt') || wordSize.includes('em')) {
      return wordSize;
    }
    
    // 尝试转换pt到px
    const ptMatch = wordSize.match(/(\d+(?:\.\d+)?)pt/);
    if (ptMatch) {
      const pt = parseFloat(ptMatch[1]);
      return `${Math.round(pt * 1.33)}px`; // 1pt ≈ 1.33px
    }
    
    return null;
  }

  /**
   * 判断元素是否可能是标题
   */
  private isLikelyTitle(element: Element, textContent: string): boolean {
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
    
    const isTitle = hasStructuralFeatures || hasFormatFeatures;
    
    if (isTitle) {
      console.log('推断为标题 - 结构特征:', hasStructuralFeatures, '格式特征:', hasFormatFeatures);
    }
    
    return isTitle;
  }

  /**
   * 应用标题样式
   */
  private applyTitleStyles(element: Element, styles: any, textContent: string): void {
    // 根据标题级别应用不同样式
    const level = this.inferTitleLevel(textContent);
    
    switch (level) {
      case 1: // 主标题
        styles.fontSize = '24px';
        styles.fontWeight = 'bold';
        styles.marginTop = '20px';
        styles.marginBottom = '16px';
        break;
      case 2: // 二级标题
        styles.fontSize = '20px';
        styles.fontWeight = 'bold';
        styles.marginTop = '16px';
        styles.marginBottom = '12px';
        break;
      case 3: // 三级标题
        styles.fontSize = '18px';
        styles.fontWeight = 'bold';
        styles.marginTop = '14px';
        styles.marginBottom = '10px';
        break;
      default: // 其他标题
        styles.fontSize = '16px';
        styles.fontWeight = 'bold';
        styles.marginTop = '12px';
        styles.marginBottom = '8px';
        break;
    }
    
    styles.lineHeight = '1.4';
    console.log(`应用${level}级标题样式`);
  }

  /**
   * 推断标题级别
   */
  private inferTitleLevel(textContent: string): number {
    // 一级标题特征
    if (/^第[一二三四五六七八九十\d]+[章部分]/.test(textContent) ||
        /^[章部分][一二三四五六七八九十\d]+/.test(textContent) ||
        /^摘要$|^Abstract$|^致谢$|^参考文献$|^附录/.test(textContent)) {
      return 1;
    }
    
    // 二级标题特征
    if (/^第[一二三四五六七八九十\d]+节/.test(textContent) ||
        /^[一二三四五六七八九十\d]+[、\.]\d*/.test(textContent)) {
      return 2;
    }
    
    // 三级标题特征
    if (/^\([一二三四五六七八九十\d]+\)/.test(textContent) ||
        /^\d+\.\d+/.test(textContent)) {
      return 3;
    }
    
    return 4; // 默认四级标题
  }

  /**
   * 应用段落样式
   */
  private applyParagraphStyles(element: Element, styles: any, textContent: string): void {
    // 基本段落样式
    styles.lineHeight = '1.8';
    styles.marginBottom = '12px';
    
    // 段落缩进处理（不设置对齐，由统一对齐处理逻辑决定）
    if (this.isChineseParagraph(textContent)) {
      styles.textIndent = '2em';
      console.log('应用中文段落缩进样式');
    }
    
    console.log('应用段落基础样式');
  }

  /**
    * 判断是否为中文段落
    */
   private isChineseParagraph(textContent: string): boolean {
     const chineseChars = textContent.match(/[\u4e00-\u9fff]/g);
     return !!(chineseChars && chineseChars.length > textContent.length * 0.3);
   }

   /**
    * 判断是否为英文段落
    */
   private isEnglishParagraph(textContent: string): boolean {
     const englishChars = textContent.match(/[a-zA-Z]/g);
     return !!(englishChars && englishChars.length > textContent.length * 0.5);
   }

  /**
   * 判断是否可能是列表项
   */
  private isLikelyListItem(textContent: string): boolean {
    return /^[•·▪▫◦‣⁃]\s/.test(textContent) ||
           /^\d+[\.、]\s/.test(textContent) ||
           /^[a-zA-Z][\.、]\s/.test(textContent);
  }

  /**
   * 应用列表项样式
   */
  private applyListItemStyles(styles: any, textContent: string): void {
    styles.marginLeft = '20px';
    styles.marginBottom = '6px';
    styles.lineHeight = '1.6';
    
    // 检测列表项的缩进级别
    const indentLevel = this.detectListIndentLevel(textContent);
    if (indentLevel > 0) {
      const indentValue = indentLevel * 24; // 列表项缩进稍大一些
      styles.paddingLeft = `${indentValue}px`;
      console.log(`应用列表项缩进: ${indentValue}px (级别: ${indentLevel})`);
    }
    
    // 检测列表类型并应用相应样式
    if (textContent.match(/^\d+[\.\)]/)) {
      styles.listStyleType = 'decimal';
      console.log('应用有序列表样式');
    } else if (textContent.match(/^[•·▪▫◦‣⁃]/)) {
      styles.listStyleType = 'disc';
      console.log('应用无序列表样式');
    } else if (textContent.match(/^[a-zA-Z][\.\)]/)) {
      styles.listStyleType = 'lower-alpha';
      console.log('应用字母列表样式');
    }
    
    console.log('应用列表项样式');
  }

  /**
   * 检测列表项的缩进级别
   */
  private detectListIndentLevel(textContent: string): number {
    // 检查前导空格
    const leadingSpaces = textContent.match(/^(\s*)/);
    if (leadingSpaces) {
      const spaceCount = leadingSpaces[1].length;
      return Math.floor(spaceCount / 4); // 每4个空格为一级缩进
    }
    
    // 检查列表标记的复杂度来推断级别
    if (textContent.match(/^\s*[a-z]\./)) return 2; // 小写字母，二级
    if (textContent.match(/^\s*[A-Z]\./)) return 1; // 大写字母，一级
    if (textContent.match(/^\s*[ivx]+\./)) return 3; // 罗马数字，三级
    
    return 0;
  }

  /**
   * 判断是否可能是引用
   */
  private isLikelyQuote(textContent: string): boolean {
    return textContent.startsWith('"') && textContent.endsWith('"') ||
           textContent.startsWith('"') && textContent.endsWith('"') ||
           textContent.startsWith('「') && textContent.endsWith('」');
  }

  /**
   * 应用引用样式
   */
  private applyQuoteStyles(styles: any): void {
    styles.fontStyle = 'italic';
    styles.marginLeft = '20px';
    styles.marginRight = '20px';
    styles.color = '#666';
    console.log('应用引用样式');
  }

  /**
   * 提取子元素样式信息
   */
  private extractChildElementStyles(element: Element, styles: any): void {
    // 检查子元素中的格式化标签
    const childElements = element.querySelectorAll('strong, b, em, i, u, span');
    
    if (childElements.length > 0) {
      console.log('子元素样式检查:');
      
      // 检查粗体样式
      const boldElements = element.querySelectorAll('strong, b');
      const totalText = element.textContent?.length || 0;
      const boldText = Array.from(boldElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
      
      if (boldText > totalText * 0.7) {
        styles.fontWeight = 'bold';
        console.log('大部分内容为粗体，应用粗体样式');
      }
      
      // 检查斜体样式
      const italicElements = element.querySelectorAll('em, i');
      const italicText = Array.from(italicElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
      
      if (italicText > totalText * 0.7) {
        styles.fontStyle = 'italic';
        console.log('大部分内容为斜体，应用斜体样式');
      }

      // 检查下划线样式
      const underlineElements = element.querySelectorAll('u');
      const underlineText = Array.from(underlineElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
      
      if (underlineText > totalText * 0.7) {
        styles.textDecoration = 'underline';
        console.log('大部分内容为下划线，应用下划线样式');
      }

      // 从子元素中提取字体样式
           childElements.forEach((child, index) => {
             if (child instanceof HTMLElement) {
               const childStyle = child.getAttribute('style');
               if (childStyle) {
                 console.log(`子元素${index}内联样式:`, childStyle);
                 
                 // 提取字体相关样式
                 const fontProperties = ['font-family', 'font-size', 'color', 'background-color'];
                 fontProperties.forEach(prop => {
                   const match = childStyle.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`));
                   if (match && match[1]) {
                     const camelCaseProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                     if (!styles[camelCaseProp]) {
                       const value = match[1].trim();
                       if (prop === 'font-family') {
                         // 对字体族进行中文字体映射处理
                         styles[camelCaseProp] = this.mapChineseFontName(value);
                         console.log(`从子元素提取并映射字体样式 ${camelCaseProp}: ${value} -> ${styles[camelCaseProp]}`);
                       } else {
                         styles[camelCaseProp] = value;
                         console.log(`从子元素提取字体样式 ${camelCaseProp}:`, value);
                       }
                     }
                   }
                 });
               }

               // 检查子元素的计算样式
               if (typeof window !== 'undefined') {
                 try {
                   const childComputed = window.getComputedStyle(child);
                   
                   // 提取字体族
                   if (!styles.fontFamily && childComputed.fontFamily && childComputed.fontFamily !== 'serif') {
                     const originalFont = childComputed.fontFamily;
                     styles.fontFamily = this.mapChineseFontName(childComputed.fontFamily);
                     console.log('从子元素计算样式提取并映射fontFamily:', childComputed.fontFamily, '->', styles.fontFamily);
                     
                     // 特别处理楷体字体
                     if (this.isKaiTiFont(originalFont)) {
                       console.log(`从子元素检测到楷体字体: ${originalFont}`);
                       // 添加楷体字体标记类
                       if (element.classList) {
                         element.classList.add('kaiti-font');
                       }
                     }
                   }
                   
                   // 提取字体大小
                   if (!styles.fontSize && childComputed.fontSize && childComputed.fontSize !== '16px') {
                     styles.fontSize = childComputed.fontSize;
                     console.log('从子元素计算样式提取fontSize:', childComputed.fontSize);
                   }
                 } catch (e) {
                   console.warn(`获取子元素${index}计算样式失败:`, e);
                 }
               }
             }
           });
    }
  }

  /**
   * 提取带样式的文本内容
   */
  private extractStyledText(element: Element): string {
    // 保留HTML标签以维持样式
    let html = element.innerHTML;
    
    // 清理不必要的属性，但保留样式相关的
    html = html.replace(/<(\w+)([^>]*?)>/g, (match, tag, attrs) => {
      // 保留重要的样式标签和属性
      const importantTags = ['strong', 'b', 'em', 'i', 'u', 's', 'span', 'a'];
      if (importantTags.includes(tag.toLowerCase())) {
        // 保留style属性
        const styleMatch = attrs.match(/style="([^"]*?)"/);
        const hrefMatch = attrs.match(/href="([^"]*?)"/);
        
        let newAttrs = '';
        if (styleMatch) newAttrs += ` style="${styleMatch[1]}"`;
        if (hrefMatch) newAttrs += ` href="${hrefMatch[1]}"`;
        
        return `<${tag}${newAttrs}>`;
      }
      return match;
    });
    
    return html;
  }

  /**
   * 将编辑器数据转换为HTML
   */
  private editorDataToHtml(data: EditorData): string {
    let html = '';

    data.blocks.forEach(block => {
      switch (block.type) {
        case 'header':
          const level = block.data.level || 2;
          html += `<h${level}>${block.data.text}</h${level}>`;
          break;
        case 'paragraph':
          html += `<p>${block.data.text}</p>`;
          break;
        case 'list':
          const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
          const items = block.data.items.map((item: string) => `<li>${item}</li>`).join('');
          html += `<${tag}>${items}</${tag}>`;
          break;
        case 'quote':
          html += `<blockquote><p>${block.data.text}</p><cite>${block.data.caption || ''}</cite></blockquote>`;
          break;
        case 'code':
          html += `<pre><code>${block.data.code}</code></pre>`;
          break;
        case 'table':
          if (block.data.content && Array.isArray(block.data.content)) {
            html += '<table border="1">';
            block.data.content.forEach((row: string[]) => {
              html += '<tr>';
              row.forEach(cell => {
                html += `<td>${cell}</td>`;
              });
              html += '</tr>';
            });
            html += '</table>';
          }
          break;
        default:
          // 处理未知类型的块
          if (block.data.text) {
            html += `<p>${block.data.text}</p>`;
          }
      }
    });

    return html;
  }

  /**
   * 创建Word文档模板
   */
  private createDocxTemplate(html: string): any {
    // 这里需要实现HTML到Word模板的转换
    // 由于docxtemplater主要用于模板填充，这里简化处理
    // 实际项目中可能需要使用其他库如html-docx-js
    
    // 创建基础的Word文档结构
    const content = `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>${html.replace(/<[^>]*>/g, ' ')}</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>
    `;

    // 这里返回一个模拟的docx对象
    // 实际实现需要完整的Word文档结构
    return {
      getZip: () => ({
        generate: (options: any) => new ArrayBuffer(0)
      })
    };
  }
}