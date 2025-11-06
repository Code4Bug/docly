import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Comment, EditorInstance } from '../types';
import type { TiptapDocument } from '../converters/WordToTiptapConverter';
import { Console } from '../utils/Console';

/**
 * 编辑器状态管理
 */
export const useEditorStore = defineStore('editor', () => {
  // 状态
  const editorInstance = ref<EditorInstance | null>(null);
  const editorData = ref<TiptapDocument | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const hasUnsavedChanges = ref(false);
  const comments = ref<Comment[]>([]);
  const currentUser = ref<string>('');
  const isReadOnly = ref(false);

  // 计算属性 - 简化版本，基于Tiptap内容
  const wordCount = computed(() => {
    if (!editorInstance.value) return 0;
    
    try {
      // 从编辑器实例获取纯文本进行计数
      const text = editorInstance.value.getText?.() || '';
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    } catch {
      return 0;
    }
  });

  const commentCount = computed(() => {
    return comments.value.length;
  });

  // 操作方法
  
  /**
   * 设置编辑器实例
   */
  const setEditorInstance = (instance: EditorInstance) => {
    editorInstance.value = instance;
    
    // 监听编辑器变化
    instance.on('change', async () => {
      hasUnsavedChanges.value = true;
      
      // 自动同步编辑器数据
      try {
        const currentData = await instance.save();
        Console.debug('自动同步编辑器数据:', currentData);
        editorData.value = currentData;
      } catch (error) {
        console.warn('自动同步编辑器数据失败:', error);
      }
    });
  };

  /**
   * 更新编辑器数据
   */
  const updateEditorData = (data: TiptapDocument) => {
    Console.debug('updateEditorData 被调用，传入数据:', data);
    Console.debug('更新前 editorData.value:', editorData.value);
    editorData.value = data;
    Console.debug('更新后 editorData.value:', editorData.value);
    hasUnsavedChanges.value = false;
  };

  /**
   * 保存文档
   */
  const saveDocument = async (): Promise<void> => {
    if (!editorInstance.value) {
      Console.warn('编辑器实例不存在，无法保存');
      return;
    }

    try {
      isSaving.value = true;
      const data = await editorInstance.value.save();
      updateEditorData(data);
    } catch (error) {
      Console.error('保存文档失败:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * 加载文档
   */
  const loadDocument = async (data: TiptapDocument): Promise<void> => {
    Console.debug('editorStore.loadDocument 开始加载文档，数据:', data);
    Console.debug('检查编辑器实例状态:', {
      hasInstance: !!editorInstance.value,
      instanceType: typeof editorInstance.value,
      instanceValue: editorInstance.value
    });
    
    if (!editorInstance.value) {
      console.warn('编辑器实例不存在，无法加载');
      console.warn('editorInstance.value 为:', editorInstance.value);
      return;
    }

    try {
      isLoading.value = true;
      await editorInstance.value.render(data);
      updateEditorData(data);
    } catch (error) {
      Console.error('加载文档失败，详细错误信息:', error);
      Console.error('错误堆栈:', (error as Error).stack);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 添加批注
   */
  const addComment = (comment: Comment): void => {
    comments.value.push(comment);
    hasUnsavedChanges.value = true;
  };

  /**
   * 编辑批注
   */
  const editComment = (id: string, content: string): void => {
    const comment = comments.value.find(c => c.id === id);
    if (comment) {
      comment.content = content;
      comment.timestamp = Date.now();
      hasUnsavedChanges.value = true;
    }
  };

  /**
   * 删除批注
   */
  const deleteComment = (id: string): void => {
    const index = comments.value.findIndex(c => c.id === id);
    if (index > -1) {
      comments.value.splice(index, 1);
      hasUnsavedChanges.value = true;
    }
  };

  /**
   * 添加批注回复
   */
  const addCommentReply = (parentId: string, reply: Comment): void => {
    const parentComment = comments.value.find(c => c.id === parentId);
    if (parentComment) {
      if (!parentComment.replies) {
        parentComment.replies = [];
      }
      parentComment.replies.push(reply);
      hasUnsavedChanges.value = true;
    }
  };

  /**
   * 设置当前用户
   */
  const setCurrentUser = (user: string): void => {
    currentUser.value = user;
  };

  /**
   * 设置只读模式
   */
  const setReadOnly = (readOnly: boolean): void => {
    isReadOnly.value = readOnly;
  };

  /**
   * 清空所有数据
   */
  const clearAll = (): void => {
    editorInstance.value = null;
    editorData.value = null;
    comments.value = [];
    hasUnsavedChanges.value = false;
    isLoading.value = false;
    isSaving.value = false;
  };

  /**
   * 获取文档统计信息
   */
  const getDocumentStats = () => {
    return {
      wordCount: wordCount.value,
      commentCount: commentCount.value,
      hasContent: !!editorData.value
    };
  };

  return {
    // 状态
    editorInstance,
    editorData,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    comments,
    currentUser,
    isReadOnly,
    
    // 计算属性
    wordCount,
    commentCount,
    
    // 方法
    setEditorInstance,
    updateEditorData,
    saveDocument,
    loadDocument,
    addComment,
    editComment,
    deleteComment,
    addCommentReply,
    setCurrentUser,
    setReadOnly,
    clearAll,
    getDocumentStats
  };
});