import { parseAsync } from 'docx-preview';
import type { FileHandler, EditorData, Comment } from '../types';
import { extractCommentsFromDocument } from './WordHandlerComments';

/**
 * Word文件处理器
 * 负责Word文件的导入和导出
 */
export class WordHandler implements FileHandler {

  /**
   * 解析文档结构，遍历document.documentPart.body.children
   * 为每个type类型创建独立的编辑器块，支持递归处理嵌套结构
   */
  private parseDocumentStructure(document: any): any[] {
    const blocks: any[] = [];
    
    try {
      // 检查文档结构是否存在
      if (!document?.documentPart?.body?.children) {
        console.warn('文档结构不完整，缺少documentPart.body.children');
        return blocks;
      }
      
      const bodyChildren = document.documentPart.body.children;
      console.log('文档body子元素数量:', bodyChildren.length);
      
      // 递归处理每个子元素
      this.processElementsRecursively(bodyChildren, blocks);
      
      console.log('成功解析的块数量:', blocks.length);
      return blocks;
      
    } catch (error) {
      console.error('解析文档结构时出错:', error);
      return blocks;
    }
  }

  /**
   * 递归处理元素数组
   */
  private processElementsRecursively(elements: any[], blocks: any[], depth: number = 0): void {
    if (!elements || !Array.isArray(elements)) return;
    
    elements.forEach((element) => {
      
      // 根据元素类型分类处理
      const elementCategory = this.categorizeElement(element);
      
      
      switch (elementCategory) {
        case 'block': // 块级元素，创建独立的编辑器块
          const block = this.createBlockFromDocumentElement(element, blocks.length);
          if (block) {
            blocks.push(block);
          }
          // 注意：块级元素已经在createBlockFromDocumentElement中处理了子元素，不需要再递归
          break;
          
        case 'inline': // 内联元素，合并到当前块
          this.mergeInlineElement(element, blocks);
          // 内联元素的子元素也需要递归处理
          if (element.children) {
            this.processElementsRecursively(element.children, blocks, depth + 1);
          }
          break;
          
        case 'container': // 容器元素，递归处理子元素
          if (element.children) {
            this.processElementsRecursively(element.children, blocks, depth + 1);
          }
          break;
          
        case 'ignore': // 忽略的元素类型
          console.log(`忽略元素类型: ${element.type}`);
          break;
      }
    });
  }

  /**
   * 元素分类
   */
  private categorizeElement(element: any): 'block' | 'inline' | 'container' | 'ignore' {
    if (!element.type) return 'ignore';
    
    const blockTypes = ['paragraph', 'heading', 'title', 'table', 'list', 'image', 'pageBreak'];
    const inlineTypes = ['run', 'text', 'tab', 'br', 'symbol'];
    const containerTypes = ['body', 'section', 'div'];
    const ignoreTypes = ['bookmark', 'field', 'comment', 'footnote'];
    
    if (blockTypes.includes(element.type)) return 'block';
    if (inlineTypes.includes(element.type)) return 'inline';
    if (containerTypes.includes(element.type)) return 'container';
    if (ignoreTypes.includes(element.type)) return 'ignore';
    
    // 默认作为块级元素处理
    return 'block';
  }

  /**
   * 合并内联元素到最后一个块
   */
  private mergeInlineElement(element: any, blocks: any[]): void {
    if (blocks.length === 0) {
      // 如果没有块，创建一个新的段落块
      const newBlock = {
        id: `paragraph_${Date.now()}`,
        type: 'paragraph',
        data: {
          text: this.extractTextFromElement(element),
          styles: this.extractStylesFromElement(element)
        }
      };
      blocks.push(newBlock);
    } else {
      // 合并到最后一个块
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock.type === 'paragraph') {
        const additionalText = this.extractTextFromElement(element);
        lastBlock.data.text += additionalText;
        
        // 合并样式
        const additionalStyles = this.extractStylesFromElement(element);
        Object.assign(lastBlock.data.styles, additionalStyles);
      }
    }
  }

  /**
   * 根据文档元素创建编辑器块
   * 将docx文档元素类型映射到editor.js块类型
   */
  private createBlockFromDocumentElement(element: any, index: number): any | null {
    if (!element || !element.type) {
      console.warn('元素缺少type属性:', element);
      return null;
    }
    
    const elementType = element.type;
    
    switch (elementType) {
      case 'paragraph':
        return this.createParagraphBlock(element, index);
      
      case 'table':
        return this.createTableBlock(element, index);
      
      case 'heading':
      case 'title':
        return this.createHeaderBlock(element, index);
      
      case 'list':
      case 'numbering':
        return this.createListBlock(element, index);
      
      case 'image':
      case 'picture':
        return this.createImageBlock(element, index);
      
      default:
        console.log(`未知元素类型: ${elementType}，尝试作为段落处理`);
        return this.createParagraphBlock(element, index);
    }
  }

  /**
   * 创建段落块
   */
  private createParagraphBlock(element: any, index: number): any {
    const text = this.extractTextFromElement(element);
    const styles = this.extractStylesFromElement(element);
    
    const block = {
      id: `paragraph_${Date.now()}_${index}`,
      type: 'paragraph',
      data: {
        text: text || '',
        styles: styles
      }
    };
    
    return block;
  }

  /**
   * 创建标题块
   */
  private createHeaderBlock(element: any, index: number): any {
    const text = this.extractTextFromElement(element);
    const styles = this.extractStylesFromElement(element);
    const level = this.extractHeaderLevel(element);
    
    return {
      id: `header_${Date.now()}_${index}`,
      type: 'header',
      data: {
        text: text || '',
        level: level,
        styles: styles
      }
    };
  }

  /**
   * 创建表格块
   */
  private createTableBlock(element: any, index: number): any {
    const tableData = this.extractTableData(element);
    const styles = this.extractStylesFromElement(element);
    
    return {
      id: `table_${Date.now()}_${index}`,
      type: 'table',
      data: {
        withHeadings: tableData.withHeadings,
        content: tableData.content,
        styles: styles
      }
    };
  }

  /**
   * 创建列表块
   */
  private createListBlock(element: any, index: number): any {
    const listData = this.extractListData(element);
    const styles = this.extractStylesFromElement(element);
    
    return {
      id: `list_${Date.now()}_${index}`,
      type: 'list',
      data: {
        style: listData.style,
        items: listData.items,
        styles: styles
      }
    };
  }

  /**
   * 创建图片块
   */
  private createImageBlock(element: any, index: number): any {
    const imageData = this.extractImageData(element);
    const styles = this.extractStylesFromElement(element);
    
    return {
      id: `image_${Date.now()}_${index}`,
      type: 'image',
      data: {
        file: imageData.file,
        caption: imageData.caption,
        withBorder: imageData.withBorder,
        withBackground: imageData.withBackground,
        stretched: imageData.stretched,
        styles: styles
      }
    };
  }

  /**
   * 从文档元素中提取文本内容
   */
  /**
   * 从元素中提取文本内容，支持递归处理嵌套结构和特殊文本元素
   */
  private extractTextFromElement(element: any): string {
    if (!element) return '';
    
    let text = '';
    
    // 1. 直接文本属性
    if (element.text) {
      text += element.text;
    }
    
    // 2. 处理特殊文本元素
    switch (element.type) {
      case 'tab':
        text += '\t';
        break;
      case 'br':
        text += '\n';
        break;
      case 'symbol':
        text += element.char || '';
        break;
    }
    
    // 3. 递归提取子元素文本（重要：处理嵌套结构）
    if (element.children && Array.isArray(element.children)) {
      text += element.children
        .map((child: any) => this.extractTextFromElement(child))
        .join('');
    }
    
    // 4. 提取文本运行
    if (element.runs && Array.isArray(element.runs)) {
      text += element.runs
        .map((run: any) => {
          // 递归处理run中的子元素
          if (run.children) {
            return this.extractTextFromElement(run);
          }
          return run.text || '';
        })
        .join('');
    }
    
    return text;
  }

  /**
   * 从文档元素中提取样式信息
   * 支持从cssStyle、lineSpacing、runProps等多个来源获取样式
   */
  private extractStylesFromElement(element: any): any {
    const styles: any = {};
    
    if (!element) return styles;
    
    // 1. 从cssStyle中提取样式
    if (element.cssStyle) {
      this.parseCssStyleString(element.cssStyle, styles);
    }
    
    // 2. 从lineSpacing中提取行间距
    if (element.lineSpacing) {
      if (typeof element.lineSpacing === 'number') {
        styles.lineHeight = element.lineSpacing;
      } else if (element.lineSpacing.line) {
        styles.lineHeight = element.lineSpacing.line;
      }
    }
    
    // 3. 从runProps中提取字符属性
    if (element.runProps) {
      this.extractRunProperties(element.runProps, styles);
    }
    
    // 4. 提取段落属性（保持原有逻辑）
    if (element.paragraphProperties) {
      const pPr = element.paragraphProperties;
      
      // 对齐方式
      if (pPr.alignment) {
        styles.textAlign = pPr.alignment;
      }
      
      // 缩进
      if (pPr.indent) {
        if (pPr.indent.left) styles.marginLeft = `${pPr.indent.left}px`;
        if (pPr.indent.right) styles.marginRight = `${pPr.indent.right}px`;
        if (pPr.indent.firstLine) styles.textIndent = `${pPr.indent.firstLine}px`;
      }
      
      // 间距
      if (pPr.spacing) {
        if (pPr.spacing.before) styles.marginTop = `${pPr.spacing.before}px`;
        if (pPr.spacing.after) styles.marginBottom = `${pPr.spacing.after}px`;
        if (pPr.spacing.line) styles.lineHeight = pPr.spacing.line;
      }
    }
    
    // 5. 提取字符属性（保持原有逻辑）
    if (element.characterProperties || element.runProperties) {
      const rPr = element.characterProperties || element.runProperties;
      
      // 字体
      if (rPr.fontFamily) {
        styles.fontFamily = this.mapChineseFontName(rPr.fontFamily);
      }
      
      // 字号
      if (rPr.fontSize) {
        styles.fontSize = `${rPr.fontSize}pt`;
      }
      
      // 颜色
      if (rPr.color) {
        styles.color = rPr.color;
      }
      
      // 粗体
      if (rPr.bold) {
        styles.fontWeight = 'bold';
      }
      
      // 斜体
      if (rPr.italic) {
        styles.fontStyle = 'italic';
      }
      
      // 下划线
      if (rPr.underline) {
        styles.textDecoration = 'underline';
      }
    }
    
    return styles;
  }
  
  /**
   * 解析CSS样式字符串
   */
  private parseCssStyleString(cssStyle: string, styles: any): void {
    if (!cssStyle || typeof cssStyle !== 'string') return;
    
    // 分割CSS样式字符串
    const declarations = cssStyle.split(';').filter(decl => decl.trim());
    
    declarations.forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        // 转换CSS属性名为camelCase
        const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        
        // 特殊处理字体族
        if (camelCaseProperty === 'fontFamily') {
          styles[camelCaseProperty] = this.mapChineseFontName(value);
        } else {
          styles[camelCaseProperty] = value;
        }
      }
    });
  }
  
  /**
   * 从runProps中提取字符属性
   */
  private extractRunProperties(runProps: any, styles: any): void {
    if (!runProps) return;
    
    // 字体族
    if (runProps.fontFamily || runProps.rFonts) {
      const fontFamily = runProps.fontFamily || runProps.rFonts?.ascii || runProps.rFonts?.eastAsia;
      if (fontFamily) {
        styles.fontFamily = this.mapChineseFontName(fontFamily);
      }
    }
    
    // 字号
    if (runProps.fontSize || runProps.sz) {
      const fontSize = runProps.fontSize || runProps.sz;
      styles.fontSize = typeof fontSize === 'number' ? `${fontSize / 2}pt` : fontSize;
    }
    
    // 颜色
    if (runProps.color) {
      styles.color = runProps.color.startsWith('#') ? runProps.color : `#${runProps.color}`;
    }
    
    // 粗体
    if (runProps.bold || runProps.b) {
      styles.fontWeight = 'bold';
    }
    
    // 斜体
    if (runProps.italic || runProps.i) {
      styles.fontStyle = 'italic';
    }
    
    // 下划线
    if (runProps.underline || runProps.u) {
      styles.textDecoration = 'underline';
    }
    
    // 删除线
    if (runProps.strike) {
      styles.textDecoration = styles.textDecoration ? `${styles.textDecoration} line-through` : 'line-through';
    }
  }

  /**
   * 提取标题级别
   */
  private extractHeaderLevel(element: any): number {
    // 从样式名称中提取级别
    if (element.styleName) {
      const match = element.styleName.match(/heading\s*(\d+)/i) || element.styleName.match(/标题\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    // 从段落属性中提取
    if (element.paragraphProperties?.outlineLevel) {
      return element.paragraphProperties.outlineLevel + 1;
    }
    
    // 默认为1级标题
    return 1;
  }

  /**
   * 提取表格数据
   */
  private extractTableData(element: any): any {
    const content: string[][] = [];
    let withHeadings = false;
    
    if (element.rows && Array.isArray(element.rows)) {
      element.rows.forEach((row: any, rowIndex: number) => {
        const rowData: string[] = [];
        
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell: any) => {
            const cellText = this.extractTextFromElement(cell);
            rowData.push(cellText);
          });
        }
        
        content.push(rowData);
        
        // 第一行作为表头
        if (rowIndex === 0 && rowData.some(cell => cell.trim())) {
          withHeadings = true;
        }
      });
    }
    
    return { content, withHeadings };
  }

  /**
   * 提取列表数据
   */
  private extractListData(element: any): any {
    const items: string[] = [];
    let style = 'unordered';
    
    // 判断列表类型
    if (element.numberingProperties || element.listType === 'ordered') {
      style = 'ordered';
    }
    
    // 提取列表项
    if (element.items && Array.isArray(element.items)) {
      element.items.forEach((item: any) => {
        const itemText = this.extractTextFromElement(item);
        if (itemText.trim()) {
          items.push(itemText);
        }
      });
    } else {
      // 如果没有items属性，尝试从当前元素提取文本
      const text = this.extractTextFromElement(element);
      if (text.trim()) {
        items.push(text);
      }
    }
    
    return { style, items };
  }

  /**
   * 提取图片数据
   */
  private extractImageData(element: any): any {
    return {
      file: {
        url: element.src || element.imageData || ''
      },
      caption: element.caption || '',
      withBorder: false,
      withBackground: false,
      stretched: false
    };
  }

  /**
   * 导入Word文件
   * 将.docx文件转换为编辑器数据格式
   */
  async import(file: File): Promise<EditorData> {
    console.log('WordHandler.import 开始处理文件:', file.name, '大小:', file.size);
    
    if (!file.name.toLowerCase().endsWith('.docx')) {
      throw new Error('仅支持.docx格式的Word文件');
    }

    try {
      // 使用docx-preview将docx转换为HTML
      const arrayBuffer = await file.arrayBuffer();
      console.log('文件读取完成，ArrayBuffer大小:', arrayBuffer.byteLength, 'bytes');
      
      // 创建一个临时容器来渲染文档
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      
      try {
        // 先解析文档获取批注数据
        const document = await parseAsync(arrayBuffer, {
          renderComments: true, // 解析时需要启用批注解析
          experimental: false,
          trimXmlDeclaration: true
        });
        
        console.log('文档解析完成，批注数量:', document.commentsPart?.comments?.length || 0);
        console.log('批注结构:', document.commentsPart);
        console.log('文档JSON结构:', document.documentPart.body);
        
        
        // 遍历document.documentPart.body.children来创建编辑器块
        const editorBlocks = this.parseDocumentStructure(document);
        console.log('从文档结构解析的块数量:', editorBlocks.length);
        
        // 如果成功解析出块，直接使用结构化数据
        if (editorBlocks.length > 0) {
          const editorData: EditorData = {
            time: Date.now(),
            blocks: editorBlocks,
            version: '2.28.2'
          };
          
          // 解析批注信息并关联到相应的块
          const comments = extractCommentsFromDocument(document);
          console.log('提取到的批注数量:', comments.length);
          
          // 将批注关联到对应的文本块
          this.associateCommentsWithBlocks(editorData, comments);
          
          console.log('使用文档结构解析的编辑器数据:', editorData);
          return editorData;
        } else {
          // 如果解析失败，返回空的编辑器数据
          console.warn('文档结构解析失败，返回空的编辑器数据');
          return {
            time: Date.now(),
            blocks: [],
            version: '2.28.2'
          };
        }
        
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
      // 检查数据有效性
      if (!data || !data.blocks || data.blocks.length === 0) {
        throw new Error('没有可导出的内容');
      }

      console.log('开始导出Word文档，数据块数量:', data.blocks.length);

      // 将编辑器数据转换为HTML
      const html = this.editorDataToHtml(data);
      console.log('转换后的HTML:', html);
      
      // 创建简化的Word文档内容
      const wordContent = this.createSimpleWordDocument(html);
      
      // 创建File对象
      const blob = new Blob([wordContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const fileName = `document_${Date.now()}.docx`;
      console.log('Word文档创建成功:', fileName);
      return new File([blob], fileName, { type: blob.type });
      
    } catch (error) {
      console.error('Word文件导出失败:', error);
      throw new Error(`Word文件导出失败: ${(error as Error).message}`);
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
   * 映射中文字体名称到Web安全字体
   */
  private mapChineseFontName(fontName: string): string {
    // 清理字体名称，移除引号和多余空格
    const cleanFontName = fontName.replace(/['"]/g, '').trim();
    
    console.log('开始字体映射处理:', cleanFontName);
    
    // 处理复合字体（如 "Times New Roman", 黑体）
    if (cleanFontName.includes(',')) {
      const fontParts = cleanFontName.split(',').map(part => part.trim().replace(/['"]/g, ''));
      console.log('检测到复合字体:', fontParts);
      
      // 优先处理中文字体
      const chineseFontPart = fontParts.find(part => 
        this.isFangSongFont(part) || 
        this.isKaiTiFont(part) || 
        /[\u4e00-\u9fff]/.test(part)
      );
      
      if (chineseFontPart) {
        console.log(`复合字体中发现中文字体: ${chineseFontPart}`);
        // 递归处理中文字体部分
        const mappedChineseFont = this.mapChineseFontName(chineseFontPart);
        console.log(`复合字体映射结果: ${mappedChineseFont}`);
        return mappedChineseFont;
      }
      
      // 如果没有中文字体，检查是否应该应用默认中文字体
      // 对于纯英文字体的复合字体，返回仿宋作为默认中文字体
      console.log('复合字体中未发现中文字体，应用默认仿宋字体');
      return '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
    }
    
    // 中文字体映射表
    const result = this.processSingleFont(cleanFontName);
    console.log(`单一字体映射结果: ${cleanFontName} -> ${result}`);
    return result;
  }

  /**
   * 中文字体映射表
   */
  private get chineseFontMap(): { [key: string]: string } {
    return {
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
      
      // 仿宋系列 - 优化映射顺序，确保仿宋_GB2312优先
      '仿宋_GB2312': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'FangSong_GB2312': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      '仿宋': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'FangSong': '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif',
      'STFangsong': '"仿宋_GB2312", "FangSong_GB2312", "STFangsong", "FangSong", "仿宋", serif',
      
      // 隶书系列
      '隶书': '"LiSu", "隶书", serif',
      'LiSu': '"LiSu", "隶书", serif',
      
      // 幼圆系列
      '幼圆': '"YouYuan", "幼圆", sans-serif',
      'YouYuan': '"YouYuan", "幼圆", sans-serif'
    };
  }

  /**
   * 处理单一字体映射
   */
  private processSingleFont(cleanFontName: string): string {
    // 检查是否有直接映射
    if (this.chineseFontMap[cleanFontName]) {
      console.log(`中文字体直接映射: ${cleanFontName} -> ${this.chineseFontMap[cleanFontName]}`);
      return this.chineseFontMap[cleanFontName];
    }
    
    // 特殊处理仿宋相关字体的模糊匹配
    if (this.isFangSongFont(cleanFontName)) {
      const fangsongFont = '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", "STFangsong", serif';
      console.log(`仿宋字体特殊处理: ${cleanFontName} -> ${fangsongFont}`);
      return fangsongFont;
    }
    
    // 特殊处理楷体相关字体的模糊匹配
    if (this.isKaiTiFont(cleanFontName)) {
      const kaitiFont = '"KaiTi_GB2312", "KaiTi", "楷体", "STKaiti", "DFKai-SB", serif';
      console.log(`楷体字体特殊处理: ${cleanFontName} -> ${kaitiFont}`);
      return kaitiFont;
    }
    
    // 模糊匹配
    for (const [key, value] of Object.entries(this.chineseFontMap)) {
      if (cleanFontName.includes(key) || key.includes(cleanFontName)) {
        return value;
      }
    }
    
    // 如果包含中文字符，添加通用中文字体fallback
    if (/[\u4e00-\u9fff]/.test(cleanFontName)) {
      const fallbackFont = `"${cleanFontName}", "SimSun", "宋体", "Microsoft YaHei", "微软雅黑", serif`;
      return fallbackFont;
    }
    
    // 返回原字体名称，添加引号保护
    const quotedFont = `"${cleanFontName}"`;
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
    // 清理字体名称，移除引号和多余空格
    const cleanFontName = fontName.replace(/['"]/g, '').trim();
    
    // 仿宋字体关键词，按优先级排序
    const fangsongKeywords = [
      '仿宋_GB2312',     // 最高优先级
      'FangSong_GB2312', 
      '仿宋',
      'FangSong',
      'fangsong',
      'FANGSONG',
      'STFangsong'
    ];
    
    // 精确匹配优先
    if (fangsongKeywords.includes(cleanFontName)) {
      console.log(`仿宋字体精确匹配: ${cleanFontName}`);
      return true;
    }
    
    // 模糊匹配
    const isMatch = fangsongKeywords.some(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      const lowerFontName = cleanFontName.toLowerCase();
      return lowerFontName.includes(lowerKeyword) || 
             lowerKeyword.includes(lowerFontName) ||
             cleanFontName.includes(keyword);
    });
    
    if (isMatch) {
      // console.log(`仿宋字体模糊匹配: ${cleanFontName}`);
    }
    
    return isMatch;
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
          html += `<h${level}>${this.escapeHtml(block.data.text || '')}</h${level}>`;
          break;
        case 'paragraph':
          html += `<p>${this.escapeHtml(block.data.text || '')}</p>`;
          break;
        case 'list':
          const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
          const items = (block.data.items || []).map((item: string) => 
            `<li>${this.escapeHtml(item)}</li>`
          ).join('');
          html += `<${tag}>${items}</${tag}>`;
          break;
        case 'quote':
          html += `<blockquote><p>${this.escapeHtml(block.data.text || '')}</p>`;
          if (block.data.caption) {
            html += `<cite>${this.escapeHtml(block.data.caption)}</cite>`;
          }
          html += `</blockquote>`;
          break;
        case 'code':
          html += `<pre><code>${this.escapeHtml(block.data.code || '')}</code></pre>`;
          break;
        case 'table':
          if (block.data.content && Array.isArray(block.data.content)) {
            html += '<table border="1" style="border-collapse: collapse; width: 100%;">';
            block.data.content.forEach((row: string[]) => {
              html += '<tr>';
              row.forEach(cell => {
                html += `<td style="padding: 8px; border: 1px solid #ccc;">${this.escapeHtml(cell || '')}</td>`;
              });
              html += '</tr>';
            });
            html += '</table>';
          }
          break;
        default:
          // 处理未知类型的块
          if (block.data && block.data.text) {
            html += `<p>${this.escapeHtml(block.data.text)}</p>`;
          }
      }
    });

    return html || '<p>空文档</p>';
  }

  /**
   * HTML转义函数
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 创建简化的Word文档内容
   */
  private createSimpleWordDocument(html: string): string {
    // 移除HTML标签，保留文本内容
    const textContent = html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
    
    // 创建基础的Word文档XML结构
    const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${this.escapeXml(textContent || '这是一个新文档')}</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    return wordXml;
  }

  /**
   * XML转义函数
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
   * 将批注关联到对应的文本块
   * @param editorData - 编辑器数据
   * @param comments - 批注数组
   */
  private associateCommentsWithBlocks(editorData: EditorData, comments: Comment[]): void {
    if (comments.length === 0) return;
    
    // 记录已关联的批注ID，避免重复关联
    const associatedCommentIds = new Set<string>();
    
    // 定义匹配结果的类型接口
    interface MatchResult {
      blockIndex: number;
      matchScore: number;
    }
    
    let bestMatch: MatchResult | null = null;
    
    // 为每个批注找到最佳匹配的文本块
    comments.forEach(comment => {
      const commentText = comment.range.text.trim();
      
      // 遍历所有块，找到最佳匹配
      editorData.blocks.forEach((block, blockIndex) => {
        const blockText = (block.data.text || '').trim();
        
        if (!blockText) return;
        
        // 计算匹配分数
        let matchScore = 0;
        
        // 1. 精确匹配（最高分）
        if (blockText.includes(commentText)) {
          matchScore = 100;
        }
        // 2. 反向匹配
        else if (commentText.includes(blockText)) {
          matchScore = 90;
        }
        // 3. 模糊匹配（去除标点符号和空格）
        else {
          const normalizeText = (text: string) => text.replace(/[\s\p{P}]/gu, '').toLowerCase();
          const normalizedBlock = normalizeText(blockText);
          const normalizedComment = normalizeText(commentText);
          
          if (normalizedBlock && normalizedComment) {
            if (normalizedBlock.includes(normalizedComment)) {
              matchScore = 80;
            } else if (normalizedComment.includes(normalizedBlock)) {
              matchScore = 70;
            }
          }
        }
        
        // 更新最佳匹配
        if (matchScore > 0 && (bestMatch === null || matchScore > bestMatch.matchScore)) {
          bestMatch = { blockIndex, matchScore };
        }
      });
      
      // 如果找到最佳匹配，将批注关联到该块
      if (bestMatch !== null && !associatedCommentIds.has(comment.id)) {
        const block = editorData.blocks[bestMatch.blockIndex];
        const blockText = (block.data.text || '').trim();
        
        // 创建块级别的批注引用（保持原始ID）
        const blockComment: Comment = {
          ...comment,
          range: {
            startOffset: Math.max(0, blockText.indexOf(commentText)),
            endOffset: Math.min(blockText.length, 
              blockText.indexOf(commentText) + commentText.length),
            text: commentText
          }
        };
        
        // 初始化块的批注数组
        if (!block.comments) {
          block.comments = [];
        }
        
        block.comments.push(blockComment);
        associatedCommentIds.add(comment.id);
      }
    });
    
    // 将所有原始批注保存到 EditorData 的 comments 属性中（避免重复）
    if (!editorData.comments) {
      editorData.comments = [];
    }
    editorData.comments.push(...comments);
    
    const associatedCount = associatedCommentIds.size;
    const unassociatedCount = comments.length - associatedCount;
    
    console.log(`批注处理完成: 总计 ${comments.length} 个批注，其中 ${associatedCount} 个已关联到文本块，${unassociatedCount} 个未关联`);
  }
}