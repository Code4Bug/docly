import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      /**
       * 设置文本对齐方式
       */
      setTextAlign: (alignment: string) => ReturnType
      /**
       * 取消文本对齐设置
       */
      unsetTextAlign: () => ReturnType
    }
  }
}

/**
 * 文本对齐扩展
 * 为 Tiptap 编辑器添加文本对齐功能
 */
export const TextAlign = Extension.create({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element: HTMLElement) => element.style.textAlign || this.options.defaultAlignment,
            renderHTML: (attributes: any) => {
              if (!attributes.textAlign) {
                return {
                  style: `text-align: ${this.options.defaultAlignment}`,
                }
              }

              return {
                style: `text-align: ${attributes.textAlign}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign: (alignment: string) => ({ commands }: any) => {
        if (!this.options.alignments.includes(alignment)) {
          return false
        }

        return this.options.types.every((type: string) => commands.updateAttributes(type, { textAlign: alignment }))
      },

      unsetTextAlign: () => ({ commands }: any) => {
        return this.options.types.every((type: string) => commands.resetAttributes(type, 'textAlign'))
      },
    }
  },
})