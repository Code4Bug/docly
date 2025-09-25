import type { EditorData, Block } from '../types'

/**
 * Tiptap 数据适配器
 * 负责在 Tiptap HTML 格式和 Editor.js 数据格式之间进行转换
 */
export class TiptapDataAdapter {
  /**
   * 将 Tiptap HTML 转换为 Editor.js 数据格式
   * @param html - Tiptap 编辑器的 HTML 内容
   * @returns Editor.js 数据格式
   */
  htmlToEditorData(html: string): EditorData {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const blocks: Block[] = []
    
    const elements = doc.body.children
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const block = this.elementToBlock(element, i)
      if (block) {
        blocks.push(block)
      }
    }
    
    return {
      time: Date.now(),
      blocks,
      version: '2.28.2',
      comments: []
    }
  }

  /**
   * 将 Editor.js 数据格式转换为 Tiptap HTML
   * @param editorData - Editor.js 数据格式
   * @returns Tiptap 可识别的 HTML 内容
   */
  editorDataToHtml(editorData: EditorData): string {
    if (!editorData.blocks || editorData.blocks.length === 0) {
      return '<p></p>'
    }

    return editorData.blocks.map(block => this.blockToHtml(block)).join('')
  }

  /**
   * 将 DOM 元素转换为 Editor.js 块
   * @param element - DOM 元素
   * @param index - 元素索引
   * @returns Editor.js 块数据
   */
  private elementToBlock(element: Element, index: number): Block | null {
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
            text: this.extractFormattedText(element),
            level: parseInt(tagName.charAt(1))
          }
        }
      
      case 'p':
        const text = this.extractFormattedText(element)
        if (!text.trim()) return null
        return {
          id,
          type: 'paragraph',
          data: {
            text: text
          }
        }
      
      case 'ul':
        return {
          id,
          type: 'list',
          data: {
            style: 'unordered',
            items: Array.from(element.querySelectorAll('li')).map(li => 
              this.extractFormattedText(li)
            )
          }
        }
      
      case 'ol':
        return {
          id,
          type: 'list',
          data: {
            style: 'ordered',
            items: Array.from(element.querySelectorAll('li')).map(li => 
              this.extractFormattedText(li)
            )
          }
        }
      
      case 'blockquote':
        return {
          id,
          type: 'quote',
          data: {
            text: this.extractFormattedText(element),
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
      
      default:
        // 对于其他元素，如果有文本内容，转换为段落
        const textContent = this.extractFormattedText(element)
        if (textContent.trim()) {
          return {
            id,
            type: 'paragraph',
            data: {
              text: textContent
            }
          }
        }
        return null
    }
  }

  /**
   * 将 Editor.js 块转换为 HTML
   * @param block - Editor.js 块数据
   * @returns HTML 字符串
   */
  private blockToHtml(block: Block): string {
    switch (block.type) {
      case 'header':
        const level = block.data?.level || 2
        const headerText = block.data?.text || ''
        return `<h${level}>${headerText}</h${level}>`
      
      case 'paragraph':
        const paragraphText = block.data?.text || ''
        return `<p>${paragraphText}</p>`
      
      case 'list':
        const tag = block.data?.style === 'ordered' ? 'ol' : 'ul'
        const items = (block.data?.items || [])
          .map((item: string) => `<li>${item}</li>`)
          .join('')
        return `<${tag}>${items}</${tag}>`
      
      case 'quote':
        const quoteText = block.data?.text || ''
        return `<blockquote><p>${quoteText}</p></blockquote>`
      
      case 'code':
        const codeText = block.data?.code || ''
        return `<pre><code>${this.escapeHtml(codeText)}</code></pre>`
      
      case 'image':
        const imageUrl = block.data?.file?.url || block.data?.url || ''
        const caption = block.data?.caption || ''
        if (imageUrl) {
          return `<figure><img src="${imageUrl}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`
        }
        return ''
      
      default:
        // 对于未知类型，尝试提取文本内容
        const text = block.data?.text || ''
        return text ? `<p>${text}</p>` : ''
    }
  }

  /**
   * 提取带格式的文本内容
   * @param element - DOM 元素
   * @returns 带 HTML 格式的文本
   */
  private extractFormattedText(element: Element): string {
    // 保留内联格式标签
    const allowedTags = ['strong', 'b', 'em', 'i', 'u', 'span', 'mark', 'code', 'a']
    
    let html = element.innerHTML
    
    // 清理不需要的标签，但保留允许的内联格式标签
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // 递归处理所有节点
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ''
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as Element
        const tagName = elem.tagName.toLowerCase()
        
        if (allowedTags.includes(tagName)) {
          const childContent = Array.from(elem.childNodes)
            .map(child => processNode(child))
            .join('')
          
          // 保留样式属性
          const style = elem.getAttribute('style')
          const styleAttr = style ? ` style="${style}"` : ''
          
          return `<${tagName}${styleAttr}>${childContent}</${tagName}>`
        } else {
          // 对于不允许的标签，只返回其文本内容
          return Array.from(elem.childNodes)
            .map(child => processNode(child))
            .join('')
        }
      }
      
      return ''
    }
    
    return Array.from(tempDiv.childNodes)
      .map(node => processNode(node))
      .join('')
  }

  /**
   * HTML 转义
   * @param text - 需要转义的文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * 获取纯文本内容（去除所有 HTML 标签）
   * @param html - HTML 内容
   * @returns 纯文本内容
   */
  getPlainText(html: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }

  /**
   * 统计字符数和单词数
   * @param html - HTML 内容
   * @returns 统计信息
   */
  getStats(html: string): { characters: number; words: number } {
    const plainText = this.getPlainText(html)
    const characters = plainText.length
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
    
    return { characters, words }
  }
}