import { ref, computed } from 'vue';
import type { Comment, TextRange } from '../types';

/**
 * 注释系统组合式函数
 * 管理文档注释的创建、编辑、删除等功能
 */
export function useAnnotations() {
  // 注释列表
  const annotations = ref<Comment[]>([]);
  
  // 当前选中的注释
  const selectedAnnotation = ref<Comment | null>(null);
  
  // 注释侧边栏显示状态
  const showSidebar = ref<boolean>(false);
  
  // 创建注释模态框显示状态
  const showCreateModal = ref<boolean>(false);
  
  // 注释模式状态
  const isAnnotationMode = ref<boolean>(false);
  
  // 计算属性
  const hasAnnotations = computed(() => annotations.value.length > 0);
  const hasResolvedAnnotations = computed(() => 
    annotations.value.some(annotation => annotation.resolved)
  );
  const pendingAnnotations = computed(() => 
    annotations.value.filter(annotation => !annotation.resolved)
  );
  const resolvedAnnotations = computed(() => 
    annotations.value.filter(annotation => annotation.resolved)
  );
  
  /**
   * 生成唯一ID
   * @returns {string} 唯一标识符
   */
  const generateId = (): string => {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  /**
   * 创建新注释
   * @param {string} content - 注释内容
   * @param {string} user - 用户名
   * @param {TextRange} range - 文本范围
   * @returns {Comment} 创建的注释
   */
  const createAnnotation = (content: string, user: string, range: TextRange): Comment => {
    const annotation: Comment = {
      id: generateId(),
      content,
      user,
      timestamp: Date.now(),
      range,
      author: user,
      date: new Date().toISOString(),
      initials: user.substring(0, 2).toUpperCase(),
      resolved: false,
      replies: []
    };
    
    annotations.value.push(annotation);
    return annotation;
  };
  
  /**
   * 编辑注释
   * @param {string} id - 注释ID
   * @param {string} content - 新内容
   */
  const editAnnotation = (id: string, content: string): void => {
    const annotation = annotations.value.find(a => a.id === id);
    if (annotation) {
      annotation.content = content;
      annotation.timestamp = Date.now();
      annotation.date = new Date().toISOString();
    }
  };
  
  /**
   * 删除注释
   * @param {string} id - 注释ID
   */
  const deleteAnnotation = (id: string): void => {
    const index = annotations.value.findIndex(a => a.id === id);
    if (index !== -1) {
      annotations.value.splice(index, 1);
    }
    
    // 如果删除的是当前选中的注释，清空选中状态
    if (selectedAnnotation.value?.id === id) {
      selectedAnnotation.value = null;
    }
  };
  
  /**
   * 解决注释
   * @param {string} id - 注释ID
   */
  const resolveAnnotation = (id: string): void => {
    const annotation = annotations.value.find(a => a.id === id);
    if (annotation) {
      annotation.resolved = true;
      annotation.timestamp = Date.now();
      annotation.date = new Date().toISOString();
    }
  };
  
  /**
   * 重新打开注释
   * @param {string} id - 注释ID
   */
  const reopenAnnotation = (id: string): void => {
    const annotation = annotations.value.find(a => a.id === id);
    if (annotation) {
      annotation.resolved = false;
      annotation.timestamp = Date.now();
      annotation.date = new Date().toISOString();
    }
  };
  
  /**
   * 添加回复
   * @param {string} parentId - 父注释ID
   * @param {string} content - 回复内容
   * @param {string} user - 用户名
   */
  const addReply = (parentId: string, content: string, user: string): void => {
    const parentAnnotation = annotations.value.find(a => a.id === parentId);
    if (parentAnnotation) {
      if (!parentAnnotation.replies) {
        parentAnnotation.replies = [];
      }
      
      const reply: Comment = {
        id: generateId(),
        content,
        user,
        timestamp: Date.now(),
        range: parentAnnotation.range, // 回复使用父注释的范围
        author: user,
        date: new Date().toISOString(),
        initials: user.substring(0, 2).toUpperCase(),
        parentId,
        resolved: false
      };
      
      parentAnnotation.replies.push(reply);
    }
  };
  
  /**
   * 选中注释
   * @param {Comment} annotation - 要选中的注释
   */
  const selectAnnotation = (annotation: Comment): void => {
    selectedAnnotation.value = annotation;
  };
  
  /**
   * 清空选中的注释
   */
  const clearSelection = (): void => {
    selectedAnnotation.value = null;
  };
  
  /**
   * 切换侧边栏显示状态
   */
  const toggleSidebar = (): void => {
    showSidebar.value = !showSidebar.value;
  };
  
  /**
   * 显示创建注释模态框
   */
  const showCreateAnnotationModal = (): void => {
    showCreateModal.value = true;
  };
  
  /**
   * 隐藏创建注释模态框
   */
  const hideCreateAnnotationModal = (): void => {
    showCreateModal.value = false;
  };
  
  /**
   * 切换注释模式
   */
  const toggleAnnotationMode = (): void => {
    isAnnotationMode.value = !isAnnotationMode.value;
  };
  
  /**
   * 根据文本范围查找注释
   * @param {TextRange} range - 文本范围
   * @returns {Comment[]} 匹配的注释列表
   */
  const findAnnotationsByRange = (range: TextRange): Comment[] => {
    return annotations.value.filter(annotation => {
      const aRange = annotation.range;
      return (
        aRange.startOffset <= range.endOffset &&
        aRange.endOffset >= range.startOffset
      );
    });
  };
  
  /**
   * 格式化时间显示
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的时间字符串
   */
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 24小时内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else { // 超过24小时
      const date = new Date(timestamp);
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };
  
  /**
   * 清空所有注释
   */
  const clearAllAnnotations = (): void => {
    annotations.value = [];
    selectedAnnotation.value = null;
  };
  
  /**
   * 设置注释列表
   * @param {Comment[]} newAnnotations - 新的注释列表
   */
  const setAnnotations = (newAnnotations: Comment[]): void => {
    annotations.value = newAnnotations;
  };
  
  return {
    // 状态数据
    annotations,
    selectedAnnotation,
    showSidebar,
    showCreateModal,
    isAnnotationMode,
    
    // 计算属性
    hasAnnotations,
    hasResolvedAnnotations,
    pendingAnnotations,
    resolvedAnnotations,
    
    // 方法
    createAnnotation,
    editAnnotation,
    deleteAnnotation,
    resolveAnnotation,
    reopenAnnotation,
    addReply,
    selectAnnotation,
    clearSelection,
    toggleSidebar,
    showCreateAnnotationModal,
    hideCreateAnnotationModal,
    toggleAnnotationMode,
    findAnnotationsByRange,
    formatTime,
    clearAllAnnotations,
    setAnnotations
  };
}