/**
 * 编辑器插件接口定义
 */
export interface EditorPlugin {
  name: string;
  init(editor: EditorInstance): void;
  render?(blockData: any): HTMLElement;
  export?(blockData: any): any;
  import?(rawData: any): any;
  command?(cmd: string, args?: any): void;
}

/**
 * 批注插件接口定义
 */
export interface CommentPlugin extends EditorPlugin {
  addComment(range: TextRange, content: string, user: string): void;
  editComment(id: string, content: string): void;
  deleteComment(id: string): void;
  listComments(): Comment[];
}

/**
 * 文件处理接口定义
 */
export interface FileHandler {
  import(file: File): Promise<EditorData>;
  export(data: EditorData): Promise<File>;
  preview?(data: EditorData): HTMLElement;
}

/**
 * 编辑器实例接口
 */
export interface EditorInstance {
  save(): Promise<EditorData>;
  render(data: EditorData): Promise<void>;
  destroy(): void;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

/**
 * 编辑器数据结构
 */
export interface EditorData {
  time: number;
  blocks: Block[];
  version: string;
}

/**
 * 编辑器块数据结构
 */
export interface Block {
  id?: string;
  type: string;
  data: any;
}

/**
 * 文本范围定义
 */
export interface TextRange {
  startOffset: number;
  endOffset: number;
  text: string;
}

/**
 * 批注数据结构
 */
export interface Comment {
  id: string;
  content: string;
  user: string;
  timestamp: number;
  range: TextRange;
  replies?: Comment[];
}

/**
 * 插件配置接口
 */
export interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, any>;
}

/**
 * 编辑器配置接口
 */
export interface EditorConfig {
  holder: string | HTMLElement;
  plugins: PluginConfig[];
  data?: EditorData;
  readOnly?: boolean;
  placeholder?: string;
}