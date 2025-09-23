import { ref, computed, watch } from 'vue';
import type { EditorData } from '../types';

/**
 * 编辑器状态管理组合式函数
 * 管理编辑器的各种状态和数据
 */
export function useEditorState() {
  // 编辑器数据
  const editorData = ref<EditorData>({
    time: Date.now(),
    blocks: [],
    version: '1.0.0',
    comments: []
  });
  
  // 编辑器内容（HTML字符串）
  const editorContent = ref<string>('');
  
  // 保存状态
  const isSaved = ref<boolean>(true);
  const lastSavedTime = ref<Date | null>(null);
  
  // 只读模式
  const isReadOnly = ref<boolean>(false);
  
  // 撤销重做状态
  const canUndo = ref<boolean>(false);
  const canRedo = ref<boolean>(false);
  
  // 选中文本
  const selectedText = ref<string>('');
  const hasSelection = computed(() => selectedText.value.length > 0);
  
  // 文档统计
  const wordCount = computed(() => {
    if (!editorContent.value) return 0;
    // 移除HTML标签并计算单词数
    const text = editorContent.value.replace(/<[^>]*>/g, '').trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  });
  
  const characterCount = computed(() => {
    if (!editorContent.value) return 0;
    // 移除HTML标签并计算字符数
    const text = editorContent.value.replace(/<[^>]*>/g, '');
    return text.length;
  });
  
  const paragraphCount = computed(() => {
    if (!editorContent.value) return 0;
    // 计算段落数（通过换行符或段落标签）
    const text = editorContent.value.replace(/<[^>]*>/g, '').trim();
    if (!text) return 0;
    const paragraphs = text.split(/\n\s*\n|<\/p>|<br\s*\/?>/i).filter(p => p.trim());
    return Math.max(1, paragraphs.length);
  });
  
  // 监听内容变化，更新保存状态
  watch([editorContent, editorData], () => {
    isSaved.value = false;
  }, { deep: true });
  
  /**
   * 更新编辑器内容
   * @param {string} content - 新的内容
   */
  const updateContent = (content: string): void => {
    editorContent.value = content;
  };
  
  /**
   * 更新编辑器数据
   * @param {EditorData} data - 新的编辑器数据
   */
  const updateEditorData = (data: EditorData): void => {
    editorData.value = data;
  };
  
  /**
   * 设置选中文本
   * @param {string} text - 选中的文本
   */
  const setSelectedText = (text: string): void => {
    selectedText.value = text;
  };
  
  /**
   * 清空选中文本
   */
  const clearSelection = (): void => {
    selectedText.value = '';
  };
  
  /**
   * 标记为已保存
   */
  const markAsSaved = (): void => {
    isSaved.value = true;
    lastSavedTime.value = new Date();
  };
  
  /**
   * 标记为未保存
   */
  const markAsUnsaved = (): void => {
    isSaved.value = false;
  };
  
  /**
   * 设置只读模式
   * @param {boolean} readonly - 是否只读
   */
  const setReadOnly = (readonly: boolean): void => {
    isReadOnly.value = readonly;
  };
  
  /**
   * 更新撤销重做状态
   * @param {boolean} undo - 是否可以撤销
   * @param {boolean} redo - 是否可以重做
   */
  const updateUndoRedoState = (undo: boolean, redo: boolean): void => {
    canUndo.value = undo;
    canRedo.value = redo;
  };
  
  /**
   * 重置编辑器状态
   */
  const resetState = (): void => {
    editorData.value = {
      time: Date.now(),
      blocks: [],
      version: '1.0.0',
      comments: []
    };
    editorContent.value = '';
    selectedText.value = '';
    isSaved.value = true;
    lastSavedTime.value = null;
    canUndo.value = false;
    canRedo.value = false;
  };
  
  /**
   * 获取保存状态文本
   * @returns {string} 保存状态描述
   */
  const getSaveStatusText = (): string => {
    if (isSaved.value) {
      if (lastSavedTime.value) {
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastSavedTime.value.getTime()) / 1000);
        if (diff < 60) {
          return '刚刚保存';
        } else if (diff < 3600) {
          return `${Math.floor(diff / 60)}分钟前保存`;
        } else {
          return `${Math.floor(diff / 3600)}小时前保存`;
        }
      }
      return '已保存';
    }
    return '未保存';
  };
  
  return {
    // 状态数据
    editorData,
    editorContent,
    selectedText,
    isSaved,
    lastSavedTime,
    isReadOnly,
    canUndo,
    canRedo,
    
    // 计算属性
    hasSelection,
    wordCount,
    characterCount,
    paragraphCount,
    
    // 方法
    updateContent,
    updateEditorData,
    setSelectedText,
    clearSelection,
    markAsSaved,
    markAsUnsaved,
    setReadOnly,
    updateUndoRedoState,
    resetState,
    getSaveStatusText
  };
}