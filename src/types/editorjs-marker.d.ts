declare module '@editorjs/marker' {
  import { InlineTool } from '@editorjs/editorjs';
  
  /**
   * Marker工具类型声明
   * 用于文本高亮标记
   */
  export default class Marker implements InlineTool {
    /**
     * 构造函数
     * @param config - 工具配置
     */
    constructor(config?: any);
    
    /**
     * 渲染工具按钮
     * @returns HTML元素
     */
    render(): HTMLElement;
    
    /**
     * 包装选中的文本
     * @param range - 选中的范围
     * @returns 包装后的元素
     */
    surround(range: Range): HTMLElement;
    
    /**
     * 检查选中的文本是否已被包装
     * @param selection - 选中的内容
     * @returns 是否已被包装
     */
    checkState(selection: Selection): boolean;
    
    /**
     * 获取工具的快捷键
     * @returns 快捷键配置
     */
    static get shortcut(): string;
    
    /**
     * 获取工具是否为内联工具
     * @returns 是否为内联工具
     */
    static get isInline(): boolean;
    
    /**
     * 获取工具的标题
     * @returns 工具标题
     */
    static get title(): string;
  }
}