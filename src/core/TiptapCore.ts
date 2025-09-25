import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import { createLowlight } from 'lowlight'
import { FontSize } from '../extensions/FontSize'
import { FontFamily } from '../extensions/FontFamily'
import { TextAlign } from '../extensions/TextAlign'
import type { EditorConfig, EditorData, EditorInstance } from '../types'
import { Console } from '../utils/Console'

/**
 * Tiptap 编辑器核心类
 * 负责初始化和管理 Tiptap 编辑器实例
 */
export class TiptapCore implements EditorInstance {
  private editor: Editor | null = null
  private config: EditorConfig
  private eventListeners: Map<string, Function[]> = new Map()
  private history: EditorData[] = []
  private historyIndex: number = -1
  private maxHistorySize: number = 50
  private saveHistoryTimeout: ReturnType<typeof setTimeout> | null = null
  private isUndoRedoOperation: boolean = false

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
      const initialData = this.convertToEditorData()
      this.history = [initialData]
      this.historyIndex = 0
    } catch (error) {
      Console.error('初始化历史记录失败:', error)
    }
  }

  /**
   * 将 Tiptap 内容转换为 EditorData 格式
   */
  private convertToEditorData(): EditorData {
    if (!this.editor) {
      return {
        time: Date.now(),
        blocks: [],
        version: '2.0.0'
      }
    }

    const html = this.editor.getHTML()
    const blocks = this.parseHTMLToBlocks(html)
    
    return {
      time: Date.now(),
      blocks,
      version: '2.0.0'
    }
  }

  /**
   * 解析 HTML 为块格式
   */
  private parseHTMLToBlocks(html: string): any[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const blocks: any[] = []
    
    const elements = doc.body.children
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const block = this.elementToBlock(element, i)
      if (block) {
        blocks.push(block)
      }
    }
    
    return blocks
  }

  /**
   * 将 DOM 元素转换为块数据
   */
  private elementToBlock(element: Element, index: number): any | null {
    const tagName = element.tagName.toLowerCase()
    const id = `block-${Date.now()}-${index}`
    
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return {
          id,
          type: 'header',
          data: {
            text: element.textContent || '',
            level: parseInt(tagName.charAt(1))
          }
        }
      
      case 'p':
        return {
          id,
          type: 'paragraph',
          data: {
            text: element.innerHTML || ''
          }
        }
      
      case 'ul':
      case 'ol':
        const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '')
        return {
          id,
          type: 'list',
          data: {
            style: tagName === 'ul' ? 'unordered' : 'ordered',
            items
          }
        }
      
      case 'blockquote':
        return {
          id,
          type: 'quote',
          data: {
            text: element.textContent || '',
            caption: ''
          }
        }
      
      case 'pre':
        const code = element.querySelector('code')
        return {
          id,
          type: 'code',
          data: {
            code: code ? code.textContent || '' : element.textContent || ''
          }
        }
      
      case 'table':
        const rows = Array.from(element.querySelectorAll('tr')).map(tr => {
          return Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent || '')
        })
        return {
          id,
          type: 'table',
          data: {
            content: rows
          }
        }
      
      default:
        // 对于其他元素，作为段落处理
        if (element.textContent?.trim()) {
          return {
            id,
            type: 'paragraph',
            data: {
              text: element.innerHTML || ''
            }
          }
        }
        return null
    }
  }

  /**
   * 将 EditorData 转换为 HTML
   */
  private convertFromEditorData(data: EditorData): string {
    if (!data.blocks || data.blocks.length === 0) {
      return '<p>开始编写您的文档...</p>'
    }

    return data.blocks.map(block => {
      switch (block.type) {
        case 'header':
          const level = block.data?.level || 2
          return `<h${level}>${block.data?.text || ''}</h${level}>`
        
        case 'paragraph':
          return `<p>${block.data?.text || ''}</p>`
        
        case 'list':
          const tag = block.data?.style === 'ordered' ? 'ol' : 'ul'
          const items = (block.data?.items || []).map((item: string) => `<li>${item}</li>`).join('')
          return `<${tag}>${items}</${tag}>`
        
        case 'quote':
          return `<blockquote>${block.data?.text || ''}</blockquote>`
        
        case 'code':
          return `<pre><code>${block.data?.code || ''}</code></pre>`
        
        case 'table':
          const rows = (block.data?.content || []).map((row: string[]) => {
            const cells = row.map(cell => `<td>${cell}</td>`).join('')
            return `<tr>${cells}</tr>`
          }).join('')
          return `<table><tbody>${rows}</tbody></table>`
        
        default:
          return `<p>${block.data?.text || ''}</p>`
      }
    }).join('')
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
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      TextAlign,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
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
      Highlight,
    ]

    // 准备初始内容
    let initialContent = '<p>开始编写您的文档...</p>'
    if (this.config.data && this.config.data.blocks && this.config.data.blocks.length > 0) {
      initialContent = this.convertFromEditorData(this.config.data)
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
      const currentData = this.convertToEditorData()
      
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
      const html = this.convertFromEditorData(data)
      this.editor?.commands.setContent(html)
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
      const html = this.convertFromEditorData(data)
      this.editor?.commands.setContent(html)
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
   * 保存编辑器数据
   */
  async save(): Promise<EditorData> {
    if (!this.editor) {
      throw new Error('编辑器未初始化')
    }
    
    return this.convertToEditorData()
  }

  /**
   * 渲染编辑器数据
   */
  async render(data: EditorData): Promise<void> {
    if (!this.editor) {
      throw new Error('编辑器未初始化')
    }
    
    const html = this.convertFromEditorData(data)
    this.editor.commands.setContent(html)
    
    // 更新历史记录
    this.history = [data]
    this.historyIndex = 0
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
    if (!this.editor) return
    this.editor.chain().focus().setTextAlign(alignment).run()
  }

  /**
   * 取消文本对齐设置
   */
  unsetTextAlign(): void {
    if (!this.editor) return
    this.editor.chain().focus().unsetTextAlign().run()
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