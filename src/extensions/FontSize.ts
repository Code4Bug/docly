import { Extension } from '@tiptap/core'
import '@tiptap/extension-text-style'

export type FontSizeOptions = {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * 设置字体大小
       * @param fontSize - 字体大小（如 '12pt', '16px'）
       */
      setFontSize: (fontSize: string) => ReturnType
      /**
       * 取消字体大小设置
       */
      unsetFontSize: () => ReturnType
    }
  }
}

/**
 * FontSize 扩展
 * 为 Tiptap 编辑器添加字体大小功能
 */
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run()
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontSize: null })
            .run()
        },
    }
  },
})