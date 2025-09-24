import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import List from '@editorjs/list';
import Table from '@editorjs/table';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import InlineCode from '@editorjs/inline-code';
import Underline from '@editorjs/underline';
import Marker from '@editorjs/marker';
import type { EditorConfig, EditorData, EditorInstance } from '../types';

/**
 * 编辑器核心类
 * 负责初始化和管理Editor.js实例
 */
export class EditorCore implements EditorInstance {
  private editor: EditorJS | null = null;
  private config: EditorConfig;
  private eventListeners: Map<string, Function[]> = new Map();
  private history: EditorData[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;
  private saveHistoryTimeout: ReturnType<typeof setTimeout> | null = null;
  private isUndoRedoOperation: boolean = false;

  constructor(config: EditorConfig) {
    this.config = config;
  }
 
   /**
    * 初始化历史记录
    */
   private async initializeHistory(): Promise<void> {
     if (!this.editor) return;
     
     try {
       const initialData = await this.editor.save();
       const editorData: EditorData = {
         time: initialData.time || Date.now(),
         blocks: initialData.blocks || [],
         version: initialData.version || '2.0.0'
       };
       
       this.history = [editorData];
       this.historyIndex = 0;
     } catch (error) {
       console.error('初始化历史记录失败:', error);
     }
   }
 
   /**
   * 初始化编辑器
   */
  async init(): Promise<void> {
    const tools: any = {
      header: {
        class: Header,
        config: {
          placeholder: '输入标题...',
          levels: [1, 2, 3, 4, 5, 6],
          defaultLevel: 2
        }
      },
      paragraph: {
        class: Paragraph,
        inlineToolbar: true,
        config: {
          placeholder: '输入内容...',
          preserveBlank: true
        }
      },
      list: {
        class: List,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      },
      table: {
        class: Table,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 3
        }
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: '输入引用内容...',
          captionPlaceholder: '引用来源'
        }
      },
      code: {
        class: Code,
        config: {
          placeholder: '输入代码...'
        }
      },
      // 内联工具
      inlineCode: {
        class: InlineCode,
        shortcut: 'CMD+SHIFT+M'
      },
      underline: {
        class: Underline,
        shortcut: 'CMD+U'
      },
      marker: {
        class: Marker,
        shortcut: 'CMD+SHIFT+H'
      }
    };

    this.editor = new EditorJS({
      holder: this.config.holder,
      tools,
      inlineToolbar: ['bold', 'italic', 'inlineCode', 'underline', 'marker'],
      data: this.config.data,
      readOnly: this.config.readOnly || false,
      placeholder: this.config.placeholder || '开始编写文档...',
      onChange: () => {
        // 如果正在执行 undo/redo 操作，不保存历史记录
        if (!this.isUndoRedoOperation) {
          this.debouncedSaveToHistory();
        }
        this.emit('change');
      }
    });

    await this.editor.isReady;
    
    // 初始化历史记录
    this.initializeHistory();
    
    this.setupKeyboardHandlers();
    this.emit('ready');
  }
  
  /**
   * 设置键盘事件处理器
   * 主要处理回车键行为
   */
  private setupKeyboardHandlers(): void {
    if (!this.editor || !this.config.holder) return;
    
    const holder = typeof this.config.holder === 'string' 
      ? document.getElementById(this.config.holder) 
      : this.config.holder;
      
    if (!holder) return;
    
    holder.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * 处理键盘按键事件
   * @param event - 键盘事件对象
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // 处理回车键
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.handleEnterKey(event);
    }
  }
  
  /**
   * 处理回车键行为
   * @param event - 键盘事件对象
   */
  private handleEnterKey(event: KeyboardEvent): void {
    const selection = window.getSelection();
    console.log('handleEnterKey', selection)
    if (!selection || selection.rangeCount === 0) {
      return
    };
    
    const range = selection.getRangeAt(0);
    console.log('range', range)
    const currentNode = range.startContainer;
    console.log('currentNode', currentNode)
    const currentBlock = this.findParentBlock(currentNode as Node);
    
    if (!currentBlock) return;
    
    const isAtEndOfLine = this.isCaretAtEndOfLine(selection, currentBlock);
    
    if (isAtEndOfLine) {
      // 当光标位于行末时，直接让默认行为创建新行
      return;
    } else {
      // 当光标位于行内时，在光标位置分段文本
      event.preventDefault();
      this.splitTextAtCursor(selection, currentBlock);
    }
  }
  
  /**
   * 查找包含节点的块级元素
   * @param node - DOM节点
   * @returns 块级元素或null
   */
  private findParentBlock(node: Node): HTMLElement | null {
    let current: Node | null = node;
    
    // 向上查找直到找到块级元素
    while (current && current.nodeType === Node.TEXT_NODE) {
      current = current.parentNode;
    }
    
    // 继续向上查找直到找到编辑器的块级元素
    while (current && current instanceof HTMLElement) {
      if (current.classList.contains('ce-block') || 
          current.classList.contains('cdx-block') ||
          current.classList.contains('ce-paragraph') ||
          current.classList.contains('ce-header')) {
        return current as HTMLElement;
      }
      current = current.parentNode;
    }
    
    return null;
  }
  
  /**
   * 判断光标是否在行末
   * @param selection - 当前选区
   * @param block - 块级元素
   * @returns 是否在行末
   */
  private isCaretAtEndOfLine(selection: Selection, block: HTMLElement): boolean {
    const range = selection.getRangeAt(0);
    const contentElement = (block.querySelector('.ce-paragraph, .ce-header, .cdx-block') as HTMLElement) || block;
    
    // 如果是文本节点，检查光标是否在文本末尾
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      return range.startOffset === range.startContainer.textContent?.length;
    }
    
    // 如果不是文本节点，检查是否没有子节点或光标在最后一个子节点之后
    return range.startOffset === contentElement.childNodes.length;
  }
  
  /**
   * 在光标位置分段文本
   * @param selection - 当前选区
   * @param block - 块级元素
   */
  private splitTextAtCursor(selection: Selection, block: HTMLElement): void {
    if (!this.editor) return;
    
    const range = selection.getRangeAt(0);
    const contentElement = (block.querySelector('.ce-paragraph, .ce-header, .cdx-block') as HTMLElement) || block;
    
    // 获取当前块的索引
    const blockIndex = this.getBlockIndex(block);
    if (blockIndex === -1) return;
    
    // 保存光标前后的文本内容
    const beforeText = this.getTextBeforeCursor(range, contentElement);
    const afterText = this.getTextAfterCursor(range, contentElement);
    
    // 更新当前块的内容为光标前的文本
    this.updateBlockContent(blockIndex, beforeText);
    
    // 在当前块后插入新块，内容为光标后的文本
    this.insertBlockAfter(blockIndex, afterText);
    
    // 将光标移动到新块的开始位置
    setTimeout(() => {
      this.moveCursorToBlockStart(blockIndex + 1);
    }, 0);
  }
  
  /**
   * 获取块的索引
   * @param block - 块级元素
   * @returns 块索引，如果未找到则返回-1
   */
  private getBlockIndex(block: HTMLElement): number {
    if (!this.editor) return -1;
    
    try {
      const blocks = this.editor.blocks.getBlocksCount();
      for (let i = 0; i < blocks; i++) {
        const blockElement = this.findBlockElement(i);
        if (blockElement === block || blockElement?.contains(block)) {
          return i;
        }
      }
    } catch (error) {
      console.error('获取块索引失败:', error);
    }
    
    return -1;
  }
  
  /**
   * 获取光标前的文本
   * @param range - 当前范围
   * @param element - 内容元素
   * @returns 光标前的文本
   */
  private getTextBeforeCursor(range: Range, element: HTMLElement): string {
    const tempRange = range.cloneRange();
    tempRange.setStart(element, 0);
    return tempRange.toString();
  }
  
  /**
   * 获取光标后的文本
   * @param range - 当前范围
   * @param element - 内容元素
   * @returns 光标后的文本
   */
  private getTextAfterCursor(range: Range, element: HTMLElement): string {
    const tempRange = range.cloneRange();
    tempRange.setEndAfter(element.lastChild || element);
    return tempRange.toString();
  }
  
  /**
   * 更新块内容
   * @param index - 块索引
   * @param content - 新内容
   */
  private async updateBlockContent(index: number, content: string): Promise<void> {
    if (!this.editor) return;
    
    try {
      const block = await this.editor.blocks.getBlockByIndex(index);
      if (block) {
        await this.editor.blocks.update(block.id, { text: content });
      }
    } catch (error) {
      console.error('更新块内容失败:', error);
    }
  }
  
  /**
   * 在指定块后插入新块
   * @param index - 块索引
   * @param content - 新块内容
   */
  private async insertBlockAfter(index: number, content: string): Promise<void> {
    if (!this.editor) return;
    
    try {
      // 确保在当前块之后插入新块，而不是在文档末尾
      await this.editor.blocks.insert('paragraph', { text: content }, {}, index + 1, false, true);
    } catch (error) {
      console.error('插入块失败:', error);
    }
  }
  
  /**
   * 将光标移动到指定块的开始位置
   * @param index - 块索引
   */
  private async moveCursorToBlockStart(index: number): Promise<void> {
    if (!this.editor) return;
    
    try {
      // 获取块元素
      const blockElement = this.findBlockElement(index);
      if (!blockElement) return;
      
      // 获取内容元素
      const contentElement = (blockElement.querySelector('.ce-paragraph, .ce-header, .cdx-block') as HTMLElement) || blockElement;
      
      // 创建新的范围并设置到内容元素的开始位置
      const range = document.createRange();
      range.setStart(contentElement, 0);
      range.collapse(true);
      
      // 应用选区
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.error('移动光标失败:', error);
    }
  }

  /**
   * 保存编辑器数据
   */
  /**
   * 提取清理后的HTML内容，去除编辑器相关的DOM结构
   * @param element - 要清理的DOM元素
   * @returns 清理后的HTML字符串
   */
  private extractCleanHtml(element: Element): string {
    // 创建一个临时容器来处理HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML;
    
    // 递归清理所有子元素
    this.cleanElement(tempDiv);
    
    return tempDiv.innerHTML;
  }
  
  /**
   * 递归清理元素，移除编辑器相关的类名和属性
   * @param element - 要清理的元素
   */
  private cleanElement(element: Element): void {
    // 移除编辑器相关的类名和属性
    const attributesToRemove = ['contenteditable', 'data-placeholder-active', 'data-empty'];
    const classesToRemove = ['ce-paragraph', 'cdx-block'];
    
    attributesToRemove.forEach(attr => {
      element.removeAttribute(attr);
    });
    
    // 清理类名
    if (element.classList) {
      classesToRemove.forEach(className => {
        element.classList.remove(className);
      });
      
      // 如果没有类名了，移除class属性
      if (element.classList.length === 0) {
        element.removeAttribute('class');
      }
    }
    
    // 递归处理子元素
    Array.from(element.children).forEach(child => {
      this.cleanElement(child);
    });
  }

  /**
   * 保存编辑器数据，包含完整的HTML内容和样式信息
   * @returns Promise<EditorData> - 包含样式信息的编辑器数据
   */
  async save(): Promise<EditorData> {
    if (!this.editor) {
      throw new Error('编辑器未初始化');
    }
    
    const outputData = await this.editor.save();
    
    // 获取编辑器容器中的所有块元素
    const editorContainer = this.config.holder as HTMLElement;
    const blockElements = editorContainer.querySelectorAll('[data-cy="block"], .ce-block');
    
    // 为每个块添加完整的HTML内容和样式信息
    const enhancedBlocks = outputData.blocks.map((block: any, index: number) => {
      const blockElement = blockElements[index] as HTMLElement;
      if (blockElement) {
        // 获取块的完整HTML内容
        const blockContent = blockElement.querySelector('.ce-block__content');
        if (blockContent) {
          // 提取实际内容，去除编辑器相关的DOM结构
          const cleanHtml = this.extractCleanHtml(blockContent);
          
          // 将HTML内容添加到块数据中
          return {
            ...block,
            data: {
              ...block.data,
              htmlContent: cleanHtml, // 保存清理后的HTML内容
              originalText: block.data.text // 保留原始文本
            }
          };
        }
      }
      return block;
    });
    
    return {
      time: outputData.time || Date.now(),
      blocks: enhancedBlocks,
      version: outputData.version || '2.0.0'
    };
  }

  /**
   * 渲染编辑器数据
   * 支持样式信息的渲染
   */
  async render(data: EditorData): Promise<void> {
    console.log('EditorCore.render 开始渲染数据:', data);
    
    if (!this.editor) {
      throw new Error('编辑器未初始化');
    }

    try {
      const processedData = this.processStyledData(data);
      
      await this.editor.render(processedData);
      
      this.applyBlockStyles(processedData);
    } catch (error) {
      console.error('渲染数据失败:', error);
      throw error;
    }
  }

  /**
   * 处理带样式的数据
   */
  private processStyledData(data: EditorData): EditorData {
    console.log('block 长度:', data.blocks.length);
    const processedBlocks = data.blocks.map(block => {
      // 保持原有数据结构，但确保样式信息被保留
      const processedBlock = { ...block };
      
      if (block.data && block.data.styles) {
        // 将样式信息嵌入到文本中
        if (block.data.text && typeof block.data.text === 'string') {
          processedBlock.data = {
            ...block.data,
            text: this.applyInlineStyles(block.data.text, block.data.styles)
          };
        }
      }
      
      return processedBlock;
    });

    return {
      ...data,
      blocks: processedBlocks
    };
  }

  /**
   * 应用内联样式到文本
   * @param text - 原始文本
   * @param styles - 样式对象
   * @returns 带样式的文本
   */
  private applyInlineStyles(text: string, styles: any): string {
    if (!styles || typeof text !== 'string') {
      return text;
    }

    // 检查是否包含HTML标签
    const hasHtmlTags = /<[^>]+>/.test(text);
    
    if (hasHtmlTags) {
      // 如果包含HTML标签，处理现有标签
      return this.addFangsongClassToHtml(text, styles);
    } else {
      // 如果是纯文本，包装在span中
      let styledText = text;
      
      if (styles.fontFamily && this.isFangsongFont(styles.fontFamily)) {
        styledText = `<span class="fangsong-font">${text}</span>`;
      }
      
      return styledText;
    }
  }

  /**
   * 检查是否为仿宋字体
   * @param fontFamily - 字体族名称
   * @returns 是否为仿宋字体
   */
  private isFangsongFont(fontFamily: string): boolean {
    const fangsongFonts = ['仿宋', '仿宋_GB2312', 'FangSong', 'FangSong_GB2312'];
    return fangsongFonts.some(font => fontFamily.includes(font));
  }

  /**
   * 为HTML文本添加仿宋字体类名
   * @param text - HTML文本
   * @param styles - 样式对象
   * @returns 处理后的HTML文本
   */
  private addFangsongClassToHtml(text: string, styles: any): string {
    if (!styles.fontFamily || !this.isFangsongFont(styles.fontFamily)) {
      return text;
    }

    const styledText = text.replace(/<([^>]+)>/g, (match, tagContent) => {
      if (tagContent.includes('class=')) {
        return match.replace(/class="([^"]*)"/, 'class="$1 fangsong-font"');
      } else {
        return match.replace(tagContent, `${tagContent} class="fangsong-font"`);
      }
    });

    return styledText;
  }

  /**
   * 应用块级样式
   * @param data - 编辑器数据
   */
  private applyBlockStyles(data: EditorData): void {
    console.log('applyBlockStyles 开始应用样式，数据:', data);
    if (!data || !data.blocks) return;

    data.blocks.forEach((block: any, index: number) => {
      // console.log(`处理块 ${index}:`, block);
      if (block.data && block.data.styles) {
        // console.log(`块 ${index} 有样式信息:`, block.data.styles);
        // 直接应用样式，不使用延迟机制
        this.applyStylesDirectly(index, block.data.styles);
      }
    });
  }

  /**
   * 直接应用样式到块元素
   * @param index - 块索引
   * @param styles - 样式对象
   */
  private applyStylesDirectly(index: number, styles: any): void {
    console.log(`applyStylesDirectly 开始处理块 ${index}，样式:`, styles);
    
    // 尝试立即查找DOM元素
    const element = this.findBlockElement(index);
    
    if (element) {
      // 尝试多种选择器查找内容元素
      const contentSelectors = [
        '.ce-paragraph',
        '.ce-header',
        '.cdx-block',
        '.ce-block__content',
        '[contenteditable="true"]'
      ];
      
      let contentElement: HTMLElement | null = null;
      for (const selector of contentSelectors) {
        contentElement = element.querySelector(selector) as HTMLElement;
        if (contentElement) {
          console.log(`块 ${index} 通过选择器 ${selector} 找到内容元素:`, contentElement);
          break;
        }
      }
      
      // 如果没找到特定的内容元素，使用块元素本身
      if (!contentElement) {
        contentElement = element;
        console.log(`块 ${index} 使用块元素本身作为内容元素:`, contentElement);
      }
      
      this.applyStylesToElement(contentElement, styles);
      console.log(`块 ${index} 样式应用完成`);
    } else {
      // 如果立即找不到元素，使用MutationObserver监听DOM变化
      console.log(`块 ${index} 未找到DOM元素，使用观察者模式等待元素创建`);
      this.observeAndApplyStyles(index, styles);
    }
  }

  /**
   * 使用MutationObserver观察DOM变化并应用样式
   * @param index - 块索引
   * @param styles - 样式对象
   */
  private observeAndApplyStyles(index: number, styles: any): void {
    if (!this.editor) return;
    
    // 获取编辑器容器元素
    const container = typeof this.config.holder === 'string' 
      ? document.getElementById(this.config.holder)
      : this.config.holder;
    if (!container) return;
    
    const observer = new MutationObserver(() => {
      const element = this.findBlockElement(index);
      if (element) {
        const contentElement = element.querySelector('.ce-paragraph, .ce-header, .cdx-block') || element;
        console.log(`通过观察者找到块 ${index} 内容元素:`, contentElement);
        this.applyStylesToElement(contentElement as HTMLElement, styles);
        console.log(`块 ${index} 样式应用完成`);
        observer.disconnect(); // 停止观察
      }
    });
    
    // 开始观察DOM变化
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    // 设置超时，避免无限等待
    setTimeout(() => {
      observer.disconnect();
      console.warn(`块 ${index} 观察超时，停止等待DOM元素`);
    }, 5000);
  }

  /**
   * 查找块级元素
   * @param index - 块索引
   * @returns DOM元素或null
   */
  private findBlockElement(index: number): HTMLElement | null {
    if (!this.editor) return null;

    const holder = this.config.holder;
    if (typeof holder === 'string') {
      const container = document.getElementById(holder);
      if (!container) {
        console.warn('未找到编辑器容器');
        return null;
      }

      // 尝试多种方法查找元素
      const methods = [
        () => container.querySelectorAll('.ce-block')[index] as HTMLElement,
        () => container.querySelectorAll('.cdx-block')[index] as HTMLElement,
        () => container.querySelectorAll('[data-cy="block"]')[index] as HTMLElement,
        () => container.querySelectorAll('.codex-editor__redactor .ce-block')[index] as HTMLElement
      ];

      for (const method of methods) {
        try {
          const element = method();
          if (element) {
            console.log(`通过方法找到块 ${index}:`, element);
            return element;
          }
        } catch (e) {
          // 静默处理查找失败
        }
      }
      
      console.warn(`未找到块 ${index}，容器中的块数量:`, container.querySelectorAll('.ce-block').length);
    }

    return null;
  }

  /**
   * 应用样式到元素
   * @param element - DOM元素
   * @param styles - 样式对象
   */
  private applyStylesToElement(element: HTMLElement, styles: any): void {
    console.log('applyStylesToElement 开始应用样式到元素:', element, '样式:', styles);
    if (!element || !element.style) {
      console.warn('元素无效或没有style属性');
      return;
    }

    try {
      // 字体相关样式
      if (styles.fontFamily) {
        console.log('应用字体:', styles.fontFamily);
        element.style.fontFamily = styles.fontFamily;
        
        // 仿宋字体特殊处理
        if (this.isFangsongFont(styles.fontFamily)) {
          element.classList.add('fangsong-font');
          // 强制设置字体样式
          element.style.setProperty('font-family', styles.fontFamily, 'important');
        }
      }

      // 其他样式应用
      const styleMap: { [key: string]: string } = {
        fontSize: 'font-size',
        fontWeight: 'font-weight',
        fontStyle: 'font-style',
        textDecoration: 'text-decoration',
        color: 'color',
        backgroundColor: 'background-color',
        textAlign: 'text-align',
        lineHeight: 'line-height',
        marginTop: 'margin-top',
        marginBottom: 'margin-bottom',
        paddingTop: 'padding-top',
        paddingBottom: 'padding-bottom',
        textIndent: 'text-indent',
        marginLeft: 'margin-left',
        marginRight: 'margin-right',
        paddingLeft: 'padding-left',
        paddingRight: 'padding-right',
        border: 'border',
        borderTop: 'border-top',
        borderBottom: 'border-bottom',
        borderLeft: 'border-left',
        borderRight: 'border-right'
      };

      // 特殊处理段落的paddingTop
      if (styles.paddingTop && element.classList.contains('ce-paragraph')) {
        const paddingValue = Math.min(parseFloat(styles.paddingTop), 12);
        element.style.paddingTop = `${paddingValue}px`;
        console.log('应用段落paddingTop:', paddingValue + 'px');
      }

      // 应用其他样式
      Object.keys(styleMap).forEach(key => {
        if (styles[key] && key !== 'paddingTop') {
          try {
            const cssProperty = styleMap[key];
            const camelCaseProperty = cssProperty.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            
            // 对于颜色相关样式，使用setProperty确保优先级
            if (key === 'color' || key === 'backgroundColor') {
              element.style.setProperty(cssProperty, styles[key], 'important');
              console.log(`应用重要样式 ${key}:`, styles[key]);
            } else {
              (element.style as any)[camelCaseProperty] = styles[key];
              console.log(`应用样式 ${key}:`, styles[key]);
            }
          } catch (e) {
            console.warn(`应用样式 ${key} 失败:`, e);
          }
        }
      });

      // 应用其他自定义样式
      Object.keys(styles).forEach(key => {
        if (!styleMap[key] && key !== 'fontFamily') {
          try {
            const cssProperty = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            element.style.setProperty(cssProperty, styles[key]);
            console.log(`应用自定义样式 ${key}:`, styles[key]);
          } catch (e) {
            console.warn(`应用自定义样式 ${key} 失败:`, e);
          }
        }
      });

      console.log('样式应用完成，最终元素样式:', element.style.cssText);
    } catch (error) {
      console.warn('应用样式时发生错误:', error);
    }
  }

  /**
   * 销毁编辑器实例
   */
destroy(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    
    // 清理定时器
    if (this.saveHistoryTimeout) {
      clearTimeout(this.saveHistoryTimeout);
      this.saveHistoryTimeout = null;
    }
    
    // 清理事件监听器
    this.eventListeners.clear();
  }/**
   * 添加事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  /**
   * 获取编辑器实例
   */
  getEditor(): EditorJS | null {
    return this.editor;
  }

  /**
   * 检查编辑器是否已初始化
   */
  isReady(): boolean {
    return this.editor !== null;
  }

  /**
   * 执行文档命令
   * @param {string} command - 命令名称
   * @param {any} value - 命令参数
   */
  execCommand(command: string, value?: any): boolean {
    try {
      if (command === 'undo') {
        return this.undo();
      } else if (command === 'redo') {
        return this.redo();
      } else if (command === 'foreColor' || command === 'backColor') {
        this.applyColorToCurrentBlock(command, value);
        return true;
      } else if (command === 'fontSize') {
        return this.applyFontSizeToCurrentBlock(value);
      } else if (command === 'italic') {
        return this.applyItalicToCurrentBlock();
      }
      return document.execCommand(command, false, value);
    } catch (error) {
      console.error('执行命令失败:', error);
      return false;
    }
  }

  /**
   * 应用字体大小到选中文本或当前位置
   * @param fontSize - 字体大小（支持px和pt单位，如 '16px' 或 '12pt'）
   * @returns 是否成功
   */
  private applyFontSizeToCurrentBlock(fontSize: string): boolean {
    if (!this.editor) {
      console.warn('编辑器未初始化');
      return false;
    }

    try {
      // 获取当前选择
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        console.warn('未找到文本选择');
        return false;
      }

      const range = selection.getRangeAt(0);
      console.log('设置字体大小:', fontSize);

      // 如果有选中文本，应用到选中文本
      if (!range.collapsed) {
        return this.applyFontSizeToSelectedText(fontSize, range);
      } else {
        // 如果没有选中文本，应用到光标位置的字符格式
        return this.applyFontSizeToCurrentPosition(fontSize, range);
      }
    } catch (error) {
      console.error('应用字体大小失败:', error);
      return false;
    }
  }

  /**
   * 应用字体大小到选中的文本
   * @param fontSize - 字体大小（支持px和pt单位）
   * @param range - 选择范围
   * @returns 是否成功
   */
  private applyFontSizeToSelectedText(fontSize: string, range: Range): boolean {
    try {
      console.log('应用字体大小到选中文本:', fontSize);
      
      // 处理字体大小单位，统一转换为CSS可用的格式
      let cssSize: string;
      if (fontSize.includes('pt')) {
        cssSize = fontSize; // pt单位直接使用
      } else if (fontSize.includes('px')) {
        cssSize = fontSize; // px单位直接使用
      } else {
        // 纯数字当作pt处理
        cssSize = fontSize + 'pt';
      }
      
      // 检查选中内容是否已经被字体大小的span包装
      const commonAncestor = range.commonAncestorContainer;
      let existingSpan: HTMLElement | null = null;
      
      // 如果选中的是整个span元素的内容
      if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
        const element = commonAncestor as HTMLElement;
        if (element.tagName === 'SPAN' && element.style.fontSize) {
          existingSpan = element;
        }
      }
      
      // 如果选中内容的父元素是带有fontSize的span
      if (!existingSpan && commonAncestor.parentElement) {
        const parent = commonAncestor.parentElement;
        if (parent.tagName === 'SPAN' && parent.style.fontSize) {
          // 检查是否选中了整个span的内容
          const spanRange = document.createRange();
          spanRange.selectNodeContents(parent);
          if (range.compareBoundaryPoints(Range.START_TO_START, spanRange) === 0 &&
              range.compareBoundaryPoints(Range.END_TO_END, spanRange) === 0) {
            existingSpan = parent;
          }
        }
      }
      
      if (existingSpan) {
        // 更新现有span的字体大小
        existingSpan.style.fontSize = cssSize;
        
        // 重新选择内容
        const newRange = document.createRange();
        newRange.selectNodeContents(existingSpan);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // 提取选中的内容并优化嵌套的span
        const selectedContent = range.extractContents();
        const optimizedContent = this.optimizeFontSizeSpans(selectedContent, fontSize);
        
        // 创建一个span元素来包装优化后的内容
        const span = document.createElement('span');
        span.style.fontSize = cssSize;
        span.appendChild(optimizedContent);
        
        // 将包装后的内容插入到原位置
        range.insertNode(span);
        
        // 重新选择修改后的内容
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      
      return true;
    } catch (error) {
      console.error('应用字体大小到选中文本失败:', error);
      return false;
    }
  }

  /**
   * 优化字体大小相关的span嵌套
   * @param content - 要优化的内容
   * @param fontSize - 目标字体大小
   * @returns 优化后的内容
   */
  private optimizeFontSizeSpans(content: DocumentFragment, fontSize: string): DocumentFragment {
    const optimized = document.createDocumentFragment();
    
    Array.from(content.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        if (element.tagName === 'SPAN' && element.style.fontSize) {
          // 如果是字体大小span，提取其内容并递归优化
          const innerContent = document.createDocumentFragment();
          Array.from(element.childNodes).forEach(child => {
            innerContent.appendChild(child.cloneNode(true));
          });
          
          // 递归优化内部内容
          const optimizedInner = this.optimizeFontSizeSpans(innerContent, fontSize);
          
          // 将优化后的内容直接添加到结果中（不再包装在span中）
          Array.from(optimizedInner.childNodes).forEach(child => {
            optimized.appendChild(child);
          });
        } else {
          // 对于其他元素，递归处理其子节点
          const clonedElement = element.cloneNode(false) as HTMLElement;
          const childContent = document.createDocumentFragment();
          
          Array.from(element.childNodes).forEach(child => {
            childContent.appendChild(child.cloneNode(true));
          });
          
          const optimizedChildren = this.optimizeFontSizeSpans(childContent, fontSize);
          Array.from(optimizedChildren.childNodes).forEach(child => {
            clonedElement.appendChild(child);
          });
          
          optimized.appendChild(clonedElement);
        }
      } else {
        // 文本节点直接复制
        optimized.appendChild(node.cloneNode(true));
      }
    });
    
    return optimized;
  }

  /**
   * 应用字体大小到当前光标位置
   * @param fontSize - 字体大小（支持px和pt单位）
   * @param range - 选择范围
   * @returns 是否成功
   */
  private applyFontSizeToCurrentPosition(fontSize: string, range: Range): boolean {
    try {
      console.log('应用字体大小到光标位置:', fontSize);
      
      // 处理字体大小单位，统一转换为CSS可用的格式
      let cssSize: string;
      if (fontSize.includes('pt')) {
        cssSize = fontSize; // pt单位直接使用
      } else if (fontSize.includes('px')) {
        cssSize = fontSize; // px单位直接使用
      } else {
        // 纯数字当作pt处理
        cssSize = fontSize + 'pt';
      }
      
      // 检查光标是否在现有的字体大小span内
       let currentNode: Node | null = range.startContainer;
       let fontSizeSpan: HTMLElement | null = null;
       
       // 向上查找是否存在字体大小span
       while (currentNode && currentNode !== range.commonAncestorContainer?.parentElement) {
         if (currentNode.nodeType === Node.ELEMENT_NODE) {
           const element = currentNode as HTMLElement;
           if (element.tagName === 'SPAN' && element.style.fontSize) {
             fontSizeSpan = element;
             break;
           }
         }
         currentNode = currentNode.parentNode;
       }
      
      if (fontSizeSpan) {
        // 如果已经在字体大小span内，直接更新字体大小
        fontSizeSpan.style.fontSize = cssSize;
        console.log('更新现有span的字体大小');
      } else {
        // 创建一个新的span元素用于设置字体大小
        const span = document.createElement('span');
        span.style.fontSize = cssSize;
        span.appendChild(document.createTextNode('\u200B')); // 零宽度空格
        
        // 在光标位置插入span
        range.insertNode(span);
        
        // 将光标移动到span内部
        const newRange = document.createRange();
        newRange.setStartAfter(span.firstChild!);
        newRange.collapse(true);
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      
      return true;
    } catch (error) {
      console.error('应用字体大小到光标位置失败:', error);
      return false;
    }
  }

  /**
   * 应用斜体样式到选中文本或当前位置
   * @returns 是否成功
   */
  private applyItalicToCurrentBlock(): boolean {
    if (!this.editor) {
      console.warn('编辑器未初始化');
      return false;
    }

    try {
      // 获取当前选择
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        console.warn('未找到文本选择');
        return false;
      }

      const range = selection.getRangeAt(0);
      console.log('应用斜体样式');

      // 如果有选中文本，应用到选中文本
      if (!range.collapsed) {
        return this.applyItalicToSelectedText(range);
      } else {
        // 如果没有选中文本，应用到光标位置的字符格式
        return this.applyItalicToCurrentPosition(range);
      }
    } catch (error) {
      console.error('应用斜体样式失败:', error);
      return false;
    }
  }

  /**
   * 应用斜体样式到选中的文本
   * @param range - 选择范围
   * @returns 是否成功
   */
  private applyItalicToSelectedText(range: Range): boolean {
    try {
      console.log('应用斜体样式到选中文本');
      
      // 检查选中文本是否已经是斜体
      const selectedContent = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(selectedContent);
      
      // 检查是否已经有斜体样式
      const hasItalic = this.checkItalicInContent(tempDiv);
      
      // 提取选中的内容
      const actualContent = range.extractContents();
      
      if (hasItalic) {
        // 如果已经是斜体，则移除斜体样式
        this.removeItalicFromContent(actualContent);
        range.insertNode(actualContent);
      } else {
        // 如果不是斜体，则添加斜体样式
        const span = document.createElement('span');
        span.style.fontStyle = 'italic';
        span.appendChild(actualContent);
        range.insertNode(span);
      }
      
      // 重新选择修改后的内容
      const newRange = document.createRange();
      newRange.selectNodeContents(range.commonAncestorContainer);
      const newSelection = window.getSelection();
      if (newSelection) {
        newSelection.removeAllRanges();
        newSelection.addRange(newRange);
      }
      
      return true;
    } catch (error) {
      console.error('应用斜体样式到选中文本失败:', error);
      return false;
    }
  }

  /**
   * 应用斜体样式到当前光标位置
   * @param range - 选择范围
   * @returns 是否成功
   */
  private applyItalicToCurrentPosition(range: Range): boolean {
    try {
      console.log('应用斜体样式到光标位置');
      
      // 创建一个span元素用于设置斜体样式
      const span = document.createElement('span');
      span.style.fontStyle = 'italic';
      span.appendChild(document.createTextNode('\u200B')); // 零宽度空格
      
      // 在光标位置插入span
      range.insertNode(span);
      
      // 将光标移动到span内部
      const newRange = document.createRange();
      newRange.setStartAfter(span.firstChild!);
      newRange.collapse(true);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      return true;
    } catch (error) {
      console.error('应用斜体样式到光标位置失败:', error);
      return false;
    }
  }

  /**
   * 检查内容中是否包含斜体样式
   * @param element - 要检查的元素
   * @returns 是否包含斜体样式
   */
  private checkItalicInContent(element: Element): boolean {
    // 检查当前元素的样式
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.fontStyle === 'italic') {
      return true;
    }
    
    // 检查内联样式
    if (element instanceof HTMLElement && element.style.fontStyle === 'italic') {
      return true;
    }
    
    // 检查是否是斜体标签
    if (element.tagName === 'I' || element.tagName === 'EM') {
      return true;
    }
    
    // 递归检查子元素
    for (let i = 0; i < element.children.length; i++) {
      if (this.checkItalicInContent(element.children[i])) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 从内容中移除斜体样式
   * @param content - 文档片段或元素
   */
  private removeItalicFromContent(content: DocumentFragment | Element): void {
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_ELEMENT,
      null
    );
    
    const elementsToProcess: Element[] = [];
    let node = walker.nextNode();
    while (node) {
      elementsToProcess.push(node as Element);
      node = walker.nextNode();
    }
    
    elementsToProcess.forEach(element => {
      if (element instanceof HTMLElement) {
        // 移除内联斜体样式
        if (element.style.fontStyle === 'italic') {
          element.style.fontStyle = '';
        }
        
        // 处理斜体标签
        if (element.tagName === 'I' || element.tagName === 'EM') {
          const parent = element.parentNode;
          if (parent) {
            while (element.firstChild) {
              parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
          }
        }
      }
    });
  }

  /**
   * 应用颜色到选中文本或当前位置
   * @param command - 命令类型 ('foreColor' 或 'backColor')
   * @param color - 颜色值
   * @returns 是否成功
   */
  private applyColorToCurrentBlock(command: string, color: string): boolean {
    if (!this.editor) {
      console.warn('编辑器未初始化');
      return false;
    }

    try {
      // 获取当前选择
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        console.warn('未找到文本选择');
        return false;
      }

      const range = selection.getRangeAt(0);
      console.log('当前选择范围:', {
        collapsed: range.collapsed,
        startContainer: range.startContainer,
        endContainer: range.endContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset
      });

      // 如果有选中文本，应用到选中文本
      if (!range.collapsed) {
        return this.applyColorToSelectedText(command, color, range);
      } else {
        // 如果没有选中文本，应用到光标位置的字符格式
        return this.applyColorToCurrentPosition(command, color, range);
      }
    } catch (error) {
      console.error('应用颜色失败:', error);
      return false;
    }
  }

  /**
   * 应用颜色到选中的文本
   * @param command - 命令类型
   * @param color - 颜色值
   * @param range - 选择范围
   * @returns 是否成功
   */
  private applyColorToSelectedText(command: string, color: string, range: Range): boolean {
    try {
      console.log('应用颜色到选中文本:', { command, color });
      
      // 提取选中的内容
      const selectedContent = range.extractContents();
      
      // 创建一个span元素来包装选中的内容
      const span = document.createElement('span');
      
      // 设置颜色样式
      if (command === 'foreColor') {
        span.style.color = color;
      } else if (command === 'backColor') {
        span.style.backgroundColor = color;
      }
      
      // 将选中的内容放入span中
      span.appendChild(selectedContent);
      
      // 将span插入到原来的位置
      range.insertNode(span);
      
      // 重新选择被包装的内容
      range.selectNodeContents(span);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      console.log('成功应用颜色到选中文本');
      return true;
    } catch (error) {
      console.error('应用颜色到选中文本失败:', error);
      return false;
    }
  }

  /**
   * 应用颜色到当前光标位置（为后续输入设置格式）
   * @param command - 命令类型
   * @param color - 颜色值
   * @param range - 当前范围
   * @returns 是否成功
   */
  private applyColorToCurrentPosition(command: string, color: string, range: Range): boolean {
    try {
      console.log('应用颜色到当前光标位置:', { command, color });
      
      // 创建一个不可见的span作为格式标记
      const span = document.createElement('span');
      span.style.display = 'inline';
      
      // 设置颜色样式
      if (command === 'foreColor') {
        span.style.color = color;
      } else if (command === 'backColor') {
        span.style.backgroundColor = color;
      }
      
      // 插入一个零宽度空格作为占位符
      span.textContent = '\u200B'; // 零宽度空格
      
      // 在光标位置插入span
      range.insertNode(span);
      
      // 将光标移动到span内部
      range.setStart(span, 1);
      range.setEnd(span, 1);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // 监听下一次输入，将格式应用到新输入的文本
      this.setupColorFormatting(span, command, color);
      
      console.log('成功设置光标位置的颜色格式');
      return true;
    } catch (error) {
      console.error('应用颜色到当前位置失败:', error);
      return false;
    }
  }

  /**
   * 设置颜色格式监听
   * @param formatSpan - 格式标记元素
   * @param command - 命令类型
   * @param color - 颜色值
   */
  private setupColorFormatting(formatSpan: HTMLElement, command: string, color: string): void {
    const handleInput = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && target.contains(formatSpan)) {
        // 移除零宽度空格
        if (formatSpan.textContent === '\u200B') {
          formatSpan.textContent = '';
        }
        
        // 确保新输入的文本继承颜色格式
        setTimeout(() => {
          if (formatSpan.textContent && formatSpan.textContent !== '\u200B') {
            if (command === 'foreColor') {
              formatSpan.style.color = color;
            } else if (command === 'backColor') {
              formatSpan.style.backgroundColor = color;
            }
          }
        }, 0);
      }
    };
    
    // 添加输入监听器
     const holder = typeof this.config.holder === 'string' 
       ? document.getElementById(this.config.holder)
       : this.config.holder;
     if (holder) {
       holder.addEventListener('input', handleInput, { once: true });
     }
  }

  /**
   * 防抖保存历史记录
   */
  private debouncedSaveToHistory(): void {
    if (this.saveHistoryTimeout) {
      clearTimeout(this.saveHistoryTimeout);
    }
    
    this.saveHistoryTimeout = setTimeout(() => {
      this.saveToHistory();
    }, 300); // 300ms 防抖延迟
  }

  /**
   * 保存当前编辑器状态到历史记录
   */
  private async saveToHistory(): Promise<void> {
    if (!this.editor) return;
    
    try {
      const currentData = await this.editor.save();
      
      // 确保数据格式符合 EditorData 类型
      const editorData: EditorData = {
        time: currentData.time || Date.now(),
        blocks: currentData.blocks || [],
        version: currentData.version || '2.0.0'
      };
      
      // 如果当前状态与历史记录中的最后一个状态相同，则不保存
      if (this.history.length > 0 && this.historyIndex >= 0) {
        const lastData = this.history[this.historyIndex];
        if (JSON.stringify(editorData) === JSON.stringify(lastData)) {
          return;
        }
      }
      
      // 如果当前不在历史记录的末尾，删除后面的记录
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      
      // 添加新的历史记录
      this.history.push(editorData);
      this.historyIndex = this.history.length - 1;
      
      // 限制历史记录大小
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.historyIndex--;
      }
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  /**
   * 撤销操作
   */
  private undo(): boolean {
    if (!this.editor || this.historyIndex <= 0) {
      return false;
    }
    
    try {
      this.isUndoRedoOperation = true;
      this.historyIndex--;
      const previousData = this.history[this.historyIndex];
      this.editor.render(previousData).then(() => {
        this.isUndoRedoOperation = false;
      }).catch(() => {
        this.isUndoRedoOperation = false;
      });
      return true;
    } catch (error) {
      console.error('撤销操作失败:', error);
      this.isUndoRedoOperation = false;
      return false;
    }
  }

  /**
   * 重做操作
   */
  private redo(): boolean {
    if (!this.editor || this.historyIndex >= this.history.length - 1) {
      return false;
    }
    
    try {
      this.isUndoRedoOperation = true;
      this.historyIndex++;
      const nextData = this.history[this.historyIndex];
      this.editor.render(nextData).then(() => {
        this.isUndoRedoOperation = false;
      }).catch(() => {
        this.isUndoRedoOperation = false;
      });
      return true;
    } catch (error) {
      console.error('重做操作失败:', error);
      this.isUndoRedoOperation = false;
      return false;
    }
  }

  /**
   * 获取当前选中的文本
   */
  getSelection(): Selection | null {
    return window.getSelection();
  }

  /**
   * 插入块级元素
   * @param {string} type - 块类型
   * @param {any} data - 块数据
   */
  async insertBlock(type: string, data: any = {}): Promise<void> {
    if (!this.editor) {
      throw new Error('编辑器未初始化');
    }
    
    try {
      const currentBlockIndex = await this.editor.blocks.getCurrentBlockIndex();
      await this.editor.blocks.insert(type, data, {}, currentBlockIndex + 1);
    } catch (error) {
      console.error('插入块失败:', error);
    }
  }

  /**
   * 获取当前块
   */
  getCurrentBlock(): any {
    if (!this.editor) {
      return null;
    }
    
    try {
      return this.editor.blocks.getBlockByIndex(this.editor.blocks.getCurrentBlockIndex());
    } catch (error) {
      console.error('获取当前块失败:', error);
      return null;
    }
  }
}