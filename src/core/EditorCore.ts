import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import List from '@editorjs/list';
import Table from '@editorjs/table';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import type { EditorConfig, EditorData, EditorInstance } from '../types';

/**
 * 编辑器核心类
 * 负责初始化和管理Editor.js实例
 */
export class EditorCore implements EditorInstance {
  private editor: EditorJS | null = null;
  private config: EditorConfig;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: EditorConfig) {
    this.config = config;
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
      }
    };

    this.editor = new EditorJS({
      holder: this.config.holder,
      tools,
      data: this.config.data,
      readOnly: this.config.readOnly || false,
      placeholder: this.config.placeholder || '开始编写文档...',
      onChange: () => {
        this.emit('change');
      }
    });

    await this.editor.isReady;
    this.emit('ready');
  }

  /**
   * 保存编辑器数据
   */
  async save(): Promise<EditorData> {
    if (!this.editor) {
      throw new Error('编辑器未初始化');
    }
    const outputData = await this.editor.save();
    return {
      time: outputData.time || Date.now(),
      blocks: outputData.blocks,
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
      // 处理带样式的数据
      console.log('处理带样式的数据...');
      const processedData = this.processStyledData(data);
      console.log('处理后的数据:', processedData);
      
      console.log('调用EditorJS的render方法...');
      await this.editor.render(processedData);
      console.log('EditorJS render完成');
      
      // 渲染完成后应用样式
      console.log('应用块样式...');
      this.applyBlockStyles(processedData);
      console.log('EditorCore.render 完成');
    } catch (error) {
      console.error('渲染数据失败:', error);
      throw error;
    }
  }

  /**
   * 处理带样式的数据
   */
  private processStyledData(data: EditorData): EditorData {
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
      console.log(`处理块 ${index}:`, block);
      if (block.data && block.data.styles) {
        console.log(`块 ${index} 有样式信息:`, block.data.styles);
        // 减少延迟时间，提高响应速度
        setTimeout(() => {
          const element = this.findBlockElement(index);
          console.log(`块 ${index} 找到的DOM元素:`, element);
          if (element) {
            const contentElement = element.querySelector('.ce-paragraph, .ce-header, .cdx-block') || element;
            console.log(`块 ${index} 内容元素:`, contentElement);
            this.applyStylesToElement(contentElement as HTMLElement, block.data.styles);
            console.log(`块 ${index} 样式应用完成`);
          } else {
            console.warn(`未找到块${index + 1}的DOM元素`);
          }
        }, 500);
      } else {
        console.log(`块 ${index} 没有样式信息`);
      }
    });
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
      if (!container) return null;

      // 尝试多种方法查找元素
      const methods = [
        () => container.querySelectorAll('.ce-block')[index] as HTMLElement,
        () => container.querySelectorAll('.cdx-block')[index] as HTMLElement,
        () => container.querySelectorAll('[data-cy="block"]')[index] as HTMLElement
      ];

      for (const method of methods) {
        try {
          const element = method();
          if (element) return element;
        } catch (e) {
          // 静默处理查找失败
        }
      }
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
            (element.style as any)[camelCaseProperty] = styles[key];
            console.log(`应用样式 ${key}:`, styles[key]);
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
    this.eventListeners.clear();
  }

  /**
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
      return document.execCommand(command, false, value);
    } catch (error) {
      console.error('执行命令失败:', error);
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