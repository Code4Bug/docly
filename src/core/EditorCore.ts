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
          placeholder: '输入内容...'
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
    if (!this.editor) {
      throw new Error('编辑器未初始化');
    }

    // 调试：输出接收到的数据
    console.log('EditorCore接收到的数据:', JSON.stringify(data, null, 2));
    
    // 处理带样式的数据
    const processedData = this.processStyledData(data);
    
    // 调试：输出处理后的数据
    console.log('处理后的数据:', JSON.stringify(processedData, null, 2));

    await this.editor.render(processedData);
    
    // 渲染完成后应用样式
    this.applyBlockStyles(processedData);
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
   */
  private applyInlineStyles(text: string, styles: any): string {
    if (!styles) return text;
    
    let styledText = text;
    
    // 如果文本没有HTML标签，需要包装
    if (!text.includes('<') && !text.includes('>')) {
      let wrapperTag = 'span';
      let styleAttr = '';
      let classAttr = '';
      
      // 构建样式属性
      const styleRules: string[] = [];
      if (styles.color) styleRules.push(`color: ${styles.color}`);
      if (styles.backgroundColor) styleRules.push(`background-color: ${styles.backgroundColor}`);
      if (styles.fontSize) styleRules.push(`font-size: ${styles.fontSize}`);
      if (styles.fontFamily) {
        styleRules.push(`font-family: ${styles.fontFamily}`);
        
        // 检查是否为仿宋字体，添加特殊类名确保样式生效
        if (this.isFangSongFont(styles.fontFamily)) {
          classAttr = ' class="fangsong-font debug-fangsong"';
          console.log('检测到仿宋字体，添加特殊类名:', styles.fontFamily);
        }
      }
      if (styles.fontWeight) styleRules.push(`font-weight: ${styles.fontWeight}`);
      if (styles.fontStyle) styleRules.push(`font-style: ${styles.fontStyle}`);
      if (styles.textDecoration) styleRules.push(`text-decoration: ${styles.textDecoration}`);
      if (styles.textAlign) styleRules.push(`text-align: ${styles.textAlign}`);
      
      if (styleRules.length > 0) {
        styleAttr = ` style="${styleRules.join('; ')}"`;
      }
      
      styledText = `<${wrapperTag}${classAttr}${styleAttr}>${text}</${wrapperTag}>`;
    } else {
      // 如果文本已经包含HTML标签，需要处理现有的标签
      console.log('处理包含HTML标签的文本:', text, '样式:', styles);
      
      // 检查是否需要添加仿宋字体类名
      if (styles.fontFamily && this.isFangSongFont(styles.fontFamily)) {
        // 为现有的span标签添加仿宋字体类名
        if (text.includes('<span')) {
          styledText = text.replace(/<span([^>]*)>/g, (match, attrs) => {
            if (attrs.includes('class=')) {
              return match.replace(/class="([^"]*)"/, 'class="$1 fangsong-font debug-fangsong"');
            } else {
              return `<span${attrs} class="fangsong-font debug-fangsong">`;
            }
          });
        } else {
          // 包装整个文本
          styledText = `<span class="fangsong-font debug-fangsong" style="font-family: ${styles.fontFamily}">${text}</span>`;
        }
        console.log('为HTML文本添加仿宋字体类名:', styledText);
      }
    }
    
    return styledText;
  }

  /**
   * 检查是否为仿宋字体
   */
  private isFangSongFont(fontFamily: string): boolean {
    if (!fontFamily) return false;
    const fangsongKeywords = ['仿宋', 'FangSong', 'fangsong', 'FANGSONG', '仿宋_GB2312', 'FangSong_GB2312'];
    return fangsongKeywords.some(keyword => fontFamily.includes(keyword));
  }

  /**
   * 应用块级样式到DOM元素
   */
  private applyBlockStyles(data: EditorData): void {
    console.log('开始应用块级样式，数据:', data);
    
    // 使用更长的延迟确保DOM完全渲染
    setTimeout(() => {
      console.log('延迟后开始应用样式');
      
      data.blocks.forEach((block, index) => {
        if (block.data && block.data.styles) {
          console.log(`块${index + 1}的样式:`, block.data.styles);
          console.log(`块${index + 1}的样式详情:`, JSON.stringify(block.data.styles, null, 2));
          if (block.data.styles.fontFamily) {
            console.log(`块${index + 1}检测到字体族:`, block.data.styles.fontFamily);
          } else {
            console.log(`块${index + 1}未检测到字体族信息，设置默认中文字体`);
            block.data.styles.fontFamily = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif';
          }
          
          // 多种方式查找DOM元素
          let element = this.findBlockElement(index);
          
          if (!element) {
            console.warn(`方法1未找到块${index + 1}的DOM元素，尝试其他方法`);
            
            // 方法2：通过编辑器容器查找
            const editorElement = document.querySelector('.codex-editor');
            if (editorElement) {
              const blocks = editorElement.querySelectorAll('.ce-block');
              if (blocks[index]) {
                element = blocks[index] as HTMLElement;
                console.log(`方法2找到块${index + 1}的DOM元素:`, element);
              }
            }
          }
          
          if (!element) {
            // 方法3：通过holder查找
            const holderElement = typeof this.config.holder === 'string' 
              ? document.getElementById(this.config.holder)
              : this.config.holder;
            
            if (holderElement) {
              const blocks = holderElement.querySelectorAll('.ce-block');
              if (blocks[index]) {
                element = blocks[index] as HTMLElement;
                console.log(`方法3找到块${index + 1}的DOM元素:`, element);
              }
            }
          }
          
          if (element) {
            console.log(`成功找到块${index + 1}的DOM元素:`, element);
            
            // 查找内容元素
            const contentElement = element.querySelector('.ce-paragraph, .ce-header, .ce-list, .ce-quote, .ce-code, .ce-table, [contenteditable="true"]');
            
            if (contentElement) {
              console.log(`找到块${index + 1}的内容元素:`, contentElement);
              this.applyStylesToElement(contentElement as HTMLElement, block.data.styles);
            } else {
              console.log(`未找到内容元素，直接应用到块元素:`, element);
              this.applyStylesToElement(element, block.data.styles);
            }
          } else {
            console.error(`所有方法都未能找到块${index + 1}的DOM元素`);
          }
        }
      });
    }, 1000); // 增加延迟时间到1秒
  }

  /**
   * 查找块级元素
   */
  private findBlockElement(index: number): HTMLElement | null {
    const editorElement = this.config.holder;
    if (typeof editorElement === 'string') {
      const container = document.getElementById(editorElement);
      if (container) {
        const blocks = container.querySelectorAll('.ce-block');
        return blocks[index] as HTMLElement || null;
      }
    }
    return null;
  }

  /**
   * 应用样式到元素
   */
  private applyStylesToElement(element: HTMLElement, styles: any): void {
    if (!styles) return;
    
    console.log('开始应用样式到元素:', element, '样式:', styles);
    
    try {
      // 确保元素存在且可以应用样式
      if (!element || !element.style) {
        console.warn('元素无效或不支持样式:', element);
        return;
      }

      // 字体样式 - 特别处理仿宋字体
      if (styles.fontFamily) {
        element.style.fontFamily = styles.fontFamily;
        console.log('应用fontFamily:', styles.fontFamily);
        
        // 检查是否为仿宋字体，添加特殊类名确保样式生效
        if (this.isFangSongFont(styles.fontFamily)) {
          element.classList.add('fangsong-font', 'debug-fangsong');
          console.log('为仿宋字体元素添加特殊类名');
        }
      }
      if (styles.fontSize) {
        element.style.fontSize = styles.fontSize;
        console.log('应用fontSize:', styles.fontSize);
      }
      if (styles.fontWeight) {
        element.style.fontWeight = styles.fontWeight;
        console.log('应用fontWeight:', styles.fontWeight);
      }
      if (styles.fontStyle) {
        element.style.fontStyle = styles.fontStyle;
        console.log('应用fontStyle:', styles.fontStyle);
      }
      if (styles.textDecoration) {
        element.style.textDecoration = styles.textDecoration;
        console.log('应用textDecoration:', styles.textDecoration);
      }
      
      // 颜色样式
      if (styles.color) {
        element.style.color = styles.color;
        console.log('应用color:', styles.color);
      }
      if (styles.backgroundColor) {
        element.style.backgroundColor = styles.backgroundColor;
        console.log('应用backgroundColor:', styles.backgroundColor);
      }
      
      // 检查是否已经应用过样式，避免二次设置
      if (element.dataset.stylesApplied === 'true') {
        console.log('样式已应用，跳过重复设置:', element);
        return;
      }

      // 对齐方式 - 使用!important确保优先级
      if (styles.textAlign || styles['text-align']) {
        const textAlign = styles.textAlign || styles['text-align'];
        element.style.setProperty('text-align', textAlign, 'important');
        console.log('应用textAlign:', textAlign);
      }
      
      // 行间距和段落间距 - 使用!important确保优先级
      if (styles.lineHeight || styles['line-height']) {
        const lineHeight = styles.lineHeight || styles['line-height'];
        element.style.setProperty('line-height', lineHeight, 'important');
        console.log('应用lineHeight:', lineHeight);
      }
      
      // 间距样式 - 修复padding-top过大问题
      // 对于段落元素，优先使用margin而不是padding
      const isParagraph = element.classList.contains('ce-paragraph');
      
      if (styles.marginTop) {
        element.style.marginTop = styles.marginTop;
        console.log('应用marginTop:', styles.marginTop);
      }
      if (styles.marginBottom) {
        element.style.marginBottom = styles.marginBottom;
        console.log('应用marginBottom:', styles.marginBottom);
      }
      
      // 对于段落元素，限制paddingTop的最大值，避免过大
      if (styles.paddingTop) {
        let paddingValue = styles.paddingTop;
        
        if (isParagraph) {
          // 解析数值，限制段落的paddingTop最大为12px
          const numericValue = parseInt(paddingValue);
          if (numericValue > 12) {
            paddingValue = '12px';
            console.log('限制段落paddingTop最大值为12px，原值:', styles.paddingTop);
          }
        }
        
        element.style.paddingTop = paddingValue;
        console.log('应用paddingTop:', paddingValue);
      }
      if (styles.paddingBottom) {
        element.style.paddingBottom = styles.paddingBottom;
        console.log('应用paddingBottom:', styles.paddingBottom);
      }
      
      // 缩进
      if (styles.textIndent) {
        element.style.textIndent = styles.textIndent;
        console.log('应用textIndent:', styles.textIndent);
      }
      if (styles.marginLeft) {
        element.style.marginLeft = styles.marginLeft;
        console.log('应用marginLeft:', styles.marginLeft);
      }
      if (styles.marginRight) {
        element.style.marginRight = styles.marginRight;
        console.log('应用marginRight:', styles.marginRight);
      }
      if (styles.paddingLeft) {
        element.style.paddingLeft = styles.paddingLeft;
        console.log('应用paddingLeft:', styles.paddingLeft);
      }
      if (styles.paddingRight) {
        element.style.paddingRight = styles.paddingRight;
        console.log('应用paddingRight:', styles.paddingRight);
      }
      
      // 边框样式
      if (styles.border) {
        element.style.border = styles.border;
        console.log('应用border:', styles.border);
      }
      if (styles.borderTop) {
        element.style.borderTop = styles.borderTop;
        console.log('应用borderTop:', styles.borderTop);
      }
      if (styles.borderBottom) {
        element.style.borderBottom = styles.borderBottom;
        console.log('应用borderBottom:', styles.borderBottom);
      }
      if (styles.borderLeft) {
        element.style.borderLeft = styles.borderLeft;
        console.log('应用borderLeft:', styles.borderLeft);
      }
      if (styles.borderRight) {
        element.style.borderRight = styles.borderRight;
        console.log('应用borderRight:', styles.borderRight);
      }
      
      // 应用其他CSS属性
      Object.keys(styles).forEach(key => {
        if (!['fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 
              'color', 'backgroundColor', 'textAlign', 'text-align', 'lineHeight', 'line-height',
              'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom',
              'textIndent', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight',
              'border', 'borderTop', 'borderBottom', 'borderLeft', 'borderRight'].includes(key)) {
          try {
            // 转换驼峰命名为CSS属性名
            const cssProperty = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            element.style.setProperty(cssProperty, styles[key]);
            console.log(`应用${key}(${cssProperty}):`, styles[key]);
          } catch (e) {
            console.warn(`应用样式${key}失败:`, e);
          }
        }
      });

      // 标记样式已应用，避免重复设置
      element.dataset.stylesApplied = 'true';
      
      console.log('样式应用完成，元素最终样式:', element.style.cssText);
      
      // 强制重新渲染
      element.offsetHeight; // 触发重排
      
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