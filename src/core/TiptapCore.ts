import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import { createLowlight } from 'lowlight'
import { FontSize } from '../extensions/FontSize'
import { FontFamily } from '../extensions/FontFamily'
import TextAlign from '@tiptap/extension-text-align'
import type { EditorConfig, EditorInstance } from '../types'
import type { TiptapDocument } from '../converters/WordToTiptapConverter'
import { Console } from '../utils/Console'

/**
 * Tiptap 编辑器核心类
 * 负责初始化和管理 Tiptap 编辑器实例
 * 直接使用 TiptapDocument 格式，无数据转换
 */
export class TiptapCore implements EditorInstance {
  private editor: Editor | null = null
  private config: EditorConfig
  private eventListeners: Map<string, Function[]> = new Map()
  private history: TiptapDocument[] = []
  private historyIndex: number = -1
  private maxHistorySize: number = 50
  private saveHistoryTimeout: ReturnType<typeof setTimeout> | null = null
  private isUndoRedoOperation: boolean = false
  private documentImages: any[] = [] // 存储文档的图片信息
  private documentComments: any[] = [] // 存储文档的批注信息

  /**
   * 构造函数
   * @param config - 编辑器配置
   */
  constructor(config: EditorConfig) {
    this.config = config
  }

  /**
   * 初始化历史记录
   */
  private async initializeHistory(): Promise<void> {
    if (!this.editor) return
    
    try {
      const initialData = this.getTiptapDocument()
      this.history = [initialData]
      this.historyIndex = 0
    } catch (error) {
      Console.error('初始化历史记录失败:', error)
    }
  }

  /**
   * 获取当前 TiptapDocument
   */
  private getTiptapDocument(): TiptapDocument {
    if (!this.editor) {
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: []
        }]
      }
    }

    // 直接获取 Tiptap 的 JSON 格式
    const json = this.editor.getJSON() as TiptapDocument
    
    // 添加存储的图片和批注信息
    if (this.documentImages.length > 0) {
      json.images = this.documentImages
    }
    
    if (this.documentComments.length > 0) {
      json.comments = this.documentComments
    }
    
    return json
  }


  /**
   * 初始化编辑器
   */
  async init(): Promise<void> {
    // 创建 lowlight 实例
    const lowlight = createLowlight()

    const extensions = [
      StarterKit.configure({
        // 禁用 StarterKit 中的 CodeBlock，使用 CodeBlockLowlight 替代
        codeBlock: false,
        // 禁用 StarterKit 中的 History，使用自定义历史记录
        undoRedo: false,
        // 禁用 StarterKit 中的 Link，使用自定义配置的 Link
        link: false,
        underline: false,
      }),
      Underline,
      Strike,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ]

    // 准备初始内容
    let initialContent: string | TiptapDocument = '<p>开始编写您的文档...</p>'
    if (this.config.data) {
      // 如果传入的是 TiptapDocument 格式，直接使用 JSON 对象
      initialContent = this.config.data
    }

    this.editor = new Editor({
      element: this.config.holder as HTMLElement,
      extensions,
      content: initialContent,
      editable: !this.config.readOnly,
      onUpdate: () => {
        if (!this.isUndoRedoOperation) {
          this.debouncedSaveToHistory()
        }
        this.emit('change')
      },
      onCreate: () => {
        this.initializeHistory()
        this.emit('ready')
      }
    })

    Console.debug('Tiptap 编辑器初始化完成')
  }

  /**
   * 防抖保存历史记录
   */
  private debouncedSaveToHistory(): void {
    if (this.saveHistoryTimeout) {
      clearTimeout(this.saveHistoryTimeout)
    }
    
    this.saveHistoryTimeout = setTimeout(() => {
      this.saveToHistory()
    }, 500)
  }

  /**
   * 保存到历史记录
   */
  private saveToHistory(): void {
    try {
      const currentData = this.getTiptapDocument()
      
      // 移除当前位置之后的历史记录
      this.history = this.history.slice(0, this.historyIndex + 1)
      
      // 添加新的历史记录
      this.history.push(currentData)
      this.historyIndex++
      
      // 限制历史记录大小
      if (this.history.length > this.maxHistorySize) {
        this.history.shift()
        this.historyIndex--
      }
      
      Console.debug('保存历史记录成功，当前索引:', this.historyIndex)
    } catch (error) {
      Console.error('保存历史记录失败:', error)
    }
  }

  /**
   * 撤销操作
   */
  undo(): boolean {
    if (this.historyIndex <= 0) return false
    
    try {
      this.isUndoRedoOperation = true
      this.historyIndex--
      const data = this.history[this.historyIndex]
      // 直接设置 Tiptap JSON 内容
      this.editor?.commands.setContent(data)
      this.isUndoRedoOperation = false
      
      Console.debug('撤销成功，当前索引:', this.historyIndex)
      return true
    } catch (error) {
      this.isUndoRedoOperation = false
      Console.error('撤销失败:', error)
      return false
    }
  }

  /**
   * 重做操作
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false
    
    try {
      this.isUndoRedoOperation = true
      this.historyIndex++
      const data = this.history[this.historyIndex]
      // 直接设置 Tiptap JSON 内容
      this.editor?.commands.setContent(data)
      this.isUndoRedoOperation = false
      
      Console.debug('重做成功，当前索引:', this.historyIndex)
      return true
    } catch (error) {
      this.isUndoRedoOperation = false
      Console.error('重做失败:', error)
      return false
    }
  }

  /**
   * 设置只读模式
   */
  async setReadOnly(readOnly: boolean): Promise<void> {
    if (this.editor) {
      this.editor.setEditable(!readOnly)
    }
  }

  /**
   * 检查是否为只读模式
   */
  isReadOnly(): boolean {
    return this.editor ? !this.editor.isEditable : false
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.historyIndex > 0
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1
  }

  /**
   * 保存编辑器数据（返回 Tiptap JSON 格式）
   */
  async save(): Promise<TiptapDocument> {
    if (!this.editor) {
      throw new Error('编辑器未初始化')
    }
    
    return this.getTiptapDocument()
  }

  /**
   * 渲染编辑器数据
   */
  async render(data: TiptapDocument): Promise<void> {
    if (!this.editor) {
      throw new Error('编辑器未初始化')
    }
    
    // 保存图片和批注信息
    this.documentImages = data.images || []
    this.documentComments = data.comments || []
    
    console.log('TiptapCore 渲染文档，图片数量:', this.documentImages.length, '批注数量:', this.documentComments.length)
    
    // 直接设置 Tiptap JSON 内容
    this.editor.commands.setContent(data)
    
    // 更新历史记录
    this.history = [data]
    this.historyIndex = 0
  }

  /**
   * 渲染 Tiptap JSON 数据（别名方法）
   */
  async renderTiptapJson(data: TiptapDocument): Promise<void> {
    return this.render(data);
  }

  /**
   * 保存为 Tiptap JSON 格式（别名方法）
   */
  async saveTiptapJson(): Promise<TiptapDocument> {
    return this.save();
  }

  /**
   * 插入块
   */
  insertBlock(type: string, data: any): void {
    if (!this.editor) return
    
    switch (type) {
      case 'header':
        this.editor.chain().focus().toggleHeading({ level: data.level || 2 }).run()
        break
      case 'paragraph':
        this.editor.chain().focus().insertContent(`<p>${data.text || ''}</p>`).run()
        break
      case 'list':
        if (data.style === 'ordered') {
          this.editor.chain().focus().toggleOrderedList().run()
        } else {
          this.editor.chain().focus().toggleBulletList().run()
        }
        break
      case 'quote':
        this.editor.chain().focus().toggleBlockquote().run()
        break
      case 'code':
        this.editor.chain().focus().toggleCodeBlock().run()
        break
    }
  }

  /**
   * 格式化文本
   */
  formatText(format: string): void {
    if (!this.editor) return
    
    switch (format) {
      case 'bold':
        this.editor.chain().focus().toggleBold().run()
        break
      case 'italic':
        this.editor.chain().focus().toggleItalic().run()
        break
      case 'underline':
        this.editor.chain().focus().toggleUnderline().run()
        break
      case 'strike':
        this.editor.chain().focus().toggleStrike().run()
        break
      case 'superscript':
        this.editor.chain().focus().toggleSuperscript().run()
        break
      case 'subscript':
        this.editor.chain().focus().toggleSubscript().run()
        break
      case 'code':
        this.editor.chain().focus().toggleCode().run()
        break
      case 'highlight':
        this.editor.chain().focus().toggleHighlight().run()
        break
    }
  }

  /**
   * 设置字体大小
   * @param fontSize - 字体大小（如 '12pt', '16px'）
   */
  setFontSize(fontSize: string): void {
    if (!this.editor) return
    this.editor.chain().focus().setFontSize(fontSize).run()
  }

  /**
   * 取消字体大小设置
   */
  unsetFontSize(): void {
    if (!this.editor) return
    this.editor.chain().focus().unsetFontSize().run()
  }

  /**
   * 设置字体族
   * @param fontFamily - 字体族名称（如 'Arial', '宋体'）
   */
  setFontFamily(fontFamily: string): void {
    if (!this.editor) return
    this.editor.chain().focus().setFontFamily(fontFamily).run()
  }

  /**
   * 取消字体族设置
   */
  unsetFontFamily(): void {
    if (!this.editor) return
    this.editor.chain().focus().unsetFontFamily().run()
  }

  /**
   * 增大字体大小
   */
  increaseFontSize(): void {
    if (!this.editor) return
    
    // 获取当前选中文本的字体大小
    const currentSize = this.getCurrentFontSize()
    const newSize = this.calculateIncreasedSize(currentSize)
    
    if (newSize) {
      this.editor.chain().focus().setFontSize(newSize).run()
    }
  }

  /**
   * 减小字体大小
   */
  decreaseFontSize(): void {
    if (!this.editor) return
    
    // 获取当前选中文本的字体大小
    const currentSize = this.getCurrentFontSize()
    const newSize = this.calculateDecreasedSize(currentSize)
    
    if (newSize) {
      this.editor.chain().focus().setFontSize(newSize).run()
    }
  }

  /**
   * 获取当前字体大小
   */
  private getCurrentFontSize(): string {
    if (!this.editor) return '12pt'
    
    const { from, to } = this.editor.state.selection
    const selectedText = this.editor.state.doc.textBetween(from, to)
    
    // 如果有选中文本，获取选中文本的字体大小
    if (selectedText) {
      const attrs = this.editor.getAttributes('textStyle')
      return attrs.fontSize || '12pt'
    }
    
    // 如果没有选中文本，返回默认大小
    return '12pt'
  }

  /**
   * 计算增大后的字体大小
   */
  private calculateIncreasedSize(currentSize: string): string {
    const sizeMap = [
      '8pt', '9pt', '10pt', '10.5pt', '11pt', '12pt', '14pt', '16pt', 
      '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '36pt', '48pt', '72pt'
    ]
    
    const currentIndex = sizeMap.indexOf(currentSize)
    if (currentIndex >= 0 && currentIndex < sizeMap.length - 1) {
      return sizeMap[currentIndex + 1]
    }
    
    // 如果当前大小不在预设列表中，尝试解析数值并增加
    const match = currentSize.match(/^(\d+(?:\.\d+)?)(.*)$/)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2] || 'pt'
      return `${Math.min(value + 2, 72)}${unit}`
    }
    
    return currentSize
  }

  /**
   * 计算减小后的字体大小
   */
  private calculateDecreasedSize(currentSize: string): string {
    const sizeMap = [
      '8pt', '9pt', '10pt', '10.5pt', '11pt', '12pt', '14pt', '16pt', 
      '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '36pt', '48pt', '72pt'
    ]
    
    const currentIndex = sizeMap.indexOf(currentSize)
    if (currentIndex > 0) {
      return sizeMap[currentIndex - 1]
    }
    
    // 如果当前大小不在预设列表中，尝试解析数值并减少
    const match = currentSize.match(/^(\d+(?:\.\d+)?)(.*)$/)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2] || 'pt'
      return `${Math.max(value - 2, 8)}${unit}`
    }
    
    return currentSize
  }

  /**
   * 设置文本对齐方式
   * @param alignment - 对齐方式：'left', 'center', 'right', 'justify'
   */
  setTextAlign(alignment: string): void {
    if (!this.editor) {
      Console.error('编辑器实例不存在，无法设置对齐方式')
      return
    }
    
    Console.debug(`设置文本对齐: ${alignment}`)
    
    try {
      // 使用官方TextAlign扩展的API
      const result = this.editor.chain().focus().setTextAlign(alignment).run()
      Console.debug(`对齐命令执行结果: ${result}`)
      
      // 强制更新编辑器视图
      this.editor.view.updateState(this.editor.state)
      
      // 检查当前选中内容的对齐状态
      setTimeout(() => {
        const currentAlign = this.editor?.isActive({ textAlign: alignment })
        Console.debug(`对齐状态检查: ${alignment} - ${currentAlign}`)
      }, 100)
    } catch (error) {
      Console.error('设置对齐方式时出错:', error)
    }
  }

  /**
   * 取消文本对齐设置
   */
  unsetTextAlign(): void {
    if (!this.editor) return
    this.editor.chain().focus().unsetTextAlign().run()
    // 强制更新编辑器视图
    this.editor.view.updateState(this.editor.state)
  }

  /**
   * 设置文本颜色
   * @param color - 颜色值（如 '#ff0000', 'red'）
   */
  setTextColor(color: string): void {
    if (!this.editor) return
    this.editor.chain().focus().setColor(color).run()
  }

  /**
   * 取消文本颜色设置
   */
  unsetTextColor(): void {
    if (!this.editor) return
    this.editor.chain().focus().unsetColor().run()
  }

  /**
   * 设置背景颜色（高亮）
   * @param color - 颜色值（如 '#ffff00', 'yellow'）
   */
  setBackgroundColor(color: string): void {
    if (!this.editor) return
    this.editor.chain().focus().setHighlight({ color }).run()
  }

  /**
   * 取消背景颜色设置
   */
  unsetBackgroundColor(): void {
    if (!this.editor) return
    this.editor.chain().focus().unsetHighlight().run()
  }

  /**
   * 插入图片
   * @param src - 图片源（URL 或 base64）
   * @param alt - 图片替代文本
   * @param width - 图片宽度
   * @param height - 图片高度
   */
  insertImage(src: string, alt?: string, width?: number, height?: number): void {
    if (!this.editor) return
    
    const attrs: any = { src }
    if (alt) attrs.alt = alt
    if (width) attrs.width = width
    if (height) attrs.height = height
    
    this.editor.chain().focus().setImage(attrs).run()
  }

  /**
   * 更新图片属性
   * @param attrs - 图片属性
   */
  updateImage(attrs: { src?: string; alt?: string; width?: number; height?: number }): void {
    if (!this.editor) return
    this.editor.chain().focus().updateAttributes('image', attrs).run()
  }

  /**
   * 设置文档图片信息
   * @param images - 图片信息数组
   */
  setDocumentImages(images: any[]): void {
    this.documentImages = images || []
    console.log('TiptapCore 设置图片信息，数量:', this.documentImages.length)
  }

  /**
   * 获取文档图片信息
   */
  getDocumentImages(): any[] {
    return this.documentImages
  }

  /**
   * 设置文档批注信息
   * @param comments - 批注信息数组
   */
  setDocumentComments(comments: any[]): void {
    this.documentComments = comments || []
    console.log('TiptapCore 设置批注信息，数量:', this.documentComments.length)
  }

  /**
   * 获取文档批注信息
   */
  getDocumentComments(): any[] {
    return this.documentComments
  }

  /**
   * 销毁编辑器实例
   */
  destroy(): void {
    if (this.editor) {
      this.editor.destroy()
      this.editor = null
    }
    
    // 清理定时器
    if (this.saveHistoryTimeout) {
      clearTimeout(this.saveHistoryTimeout)
      this.saveHistoryTimeout = null
    }
    
    // 清理事件监听器
    this.eventListeners.clear()
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(event)
      return
    }
    
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(...args))
    }
  }

  /**
   * 获取编辑器实例
   */
  getEditor(): Editor | null {
    return this.editor
  }

  /**
   * 获取编辑器 HTML 内容
   */
  getHTML(): string {
    return this.editor?.getHTML() || ''
  }

  /**
   * 获取编辑器纯文本内容
   */
  getText(): string {
    return this.editor?.getText() || ''
  }

  /**
   * 设置编辑器内容
   */
  setContent(content: string): void {
    this.editor?.commands.setContent(content)
  }

  /**
   * 聚焦编辑器
   */
  focus(): void {
    this.editor?.commands.focus()
  }

  /**
   * 检查编辑器是否为空
   */
  isEmpty(): boolean {
    return this.editor?.isEmpty || true
  }
}