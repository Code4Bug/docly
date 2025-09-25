import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      /**
       * 设置字体族
       */
      setFontFamily: (fontFamily: string) => ReturnType
      /**
       * 取消字体族设置
       */
      unsetFontFamily: () => ReturnType
    }
  }
}

/**
 * 字体族扩展
 * 为 Tiptap 编辑器添加字体族设置功能
 */
export const FontFamily = Extension.create({
  name: 'fontFamily',

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
          fontFamily: {
            default: null,
            parseHTML: element => element.style.fontFamily?.replace(/['"]/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontFamily) {
                return {}
              }

              return {
                style: `font-family: ${attributes.fontFamily}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontFamily })
            .run()
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontFamily: null })
            .run()
        },
    }
  },
})