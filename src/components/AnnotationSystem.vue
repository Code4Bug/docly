<template>
  <div class="annotation-system">
    <!-- 批注侧边栏 -->
    <div 
      v-if="showSidebar" 
      class="annotation-sidebar"
      :class="{ 'dark-theme': isDarkTheme }"
    >
      <div class="sidebar-header unselectable">
        <h4>批注列表</h4>
        <button 
          @click="$emit('close-sidebar')" 
          class="close-btn"
        >
          ×
        </button>
      </div>
      
      <div class="annotation-list-controls">
        <div class="sort-controls">
          <label>排序方式：</label>
          <select v-model="sortOrder" @change="updateSortOrder" class="sort-select">
            <option value="time-desc">时间倒序</option>
            <option value="time-asc">时间正序</option>
            <option value="document">文档顺序</option>
          </select>
        </div>
      </div>
      
      <div class="annotation-list">
        <div 
          v-for="annotation in sortedAnnotations" 
          :key="annotation.id"
          class="annotation-item"
          :class="{ 'resolved': annotation.resolved }"
        >
          <div class="annotation-header">
            <div class="author-info">
              <span class="annotation-author">{{ getAuthorDisplay(annotation) }}</span>
              <span v-if="annotation.initials" class="author-initials">{{ annotation.initials }}</span>
            </div>
            <div class="time-info">
              <span class="annotation-time" :title="getAbsoluteTime(annotation.timestamp)">
                {{ formatTime(annotation.timestamp) }}
              </span>
            </div>
          </div>
          
          <!-- 显示批注对应的原文 -->
          <div class="annotation-original-text" :class="{ 'no-original-text': !getOriginalText(annotation) }">
            <label>原文：</label>
            <div v-if="getOriginalText(annotation)" class="original-text-content">
              "{{ getOriginalText(annotation) }}"
            </div>
            <div v-else class="no-original-text-content">
              <span class="no-text-hint">原文内容未能提取</span>
              <span class="no-text-reason">可能是文档格式问题或批注范围标记缺失</span>
            </div>
          </div>
          
          <div class="annotation-content">
            <label>批注：</label>
            <div v-if="!annotation.editing" class="comment-text-content">
              {{ annotation.content }}
            </div>
            <textarea 
              v-else
              v-model="annotation.editContent"
              class="edit-textarea"
              @keydown.enter.ctrl="confirmEdit(annotation)"
              @keydown.esc="cancelEdit(annotation)"
            ></textarea>
          </div>
          
          <!-- 显示批注的回复 -->
          <div v-if="annotation.replies && annotation.replies.length > 0" class="annotation-replies">
            <div class="replies-header">
              <span class="replies-count">{{ annotation.replies.length }} 条回复</span>
            </div>
            <div 
              v-for="(reply, index) in annotation.replies" 
              :key="reply.id"
              class="reply-item"
              :class="{ 'last-reply': index === annotation.replies.length - 1 }"
            >
              <div class="reply-header">
                <div class="reply-author-info">
                  <span class="reply-author">{{ getAuthorDisplay(reply) }}</span>
                  <span v-if="reply.initials" class="reply-initials">{{ reply.initials }}</span>
                </div>
                <span class="reply-time" :title="getAbsoluteTime(reply.timestamp)">
                  {{ formatTime(reply.timestamp) }}
                </span>
              </div>
              <div class="reply-content">{{ reply.content }}</div>
            </div>
          </div>
          
          <div class="annotation-actions">
            <button 
              v-if="!annotation.resolved && !annotation.editing"
              @click="startEdit(annotation)"
              class="action-btn edit-btn"
            >
              编辑
            </button>
            
            <button 
              v-if="annotation.editing"
              @click="confirmEdit(annotation)"
              class="action-btn confirm-btn"
            >
              确认
            </button>
            
            <button 
              v-if="annotation.editing"
              @click="cancelEdit(annotation)"
              class="action-btn cancel-btn"
            >
              取消
            </button>
            
            <button 
              v-if="!annotation.resolved && !annotation.editing"
              @click="$emit('resolve-annotation', annotation.id)"
              class="action-btn resolve-btn"
            >
              解决
            </button>
            
            <button 
              @click="$emit('delete-annotation', annotation.id)"
              class="action-btn delete-btn"
            >
              删除
            </button>
          </div>
        </div>
        
        <div v-if="annotations.length === 0" class="empty-state unselectable">
          <p>暂无批注</p>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <button 
          @click="$emit('delete-resolved')"
          class="clear-btn"
          :disabled="!hasResolvedAnnotations"
        >
          清除已解决的批注
        </button>
      </div>
    </div>
    
    <!-- 批注创建弹窗 -->
    <div 
      v-if="showCreateModal" 
      class="annotation-modal-overlay"
      @click="$emit('cancel-annotation')"
    >
      <div 
        class="annotation-modal"
        :class="{ 'dark-theme': isDarkTheme }"
        @click.stop
      >
        <div class="modal-header">
          <h3>添加批注</h3>
          <button 
            @click="$emit('cancel-annotation')" 
            class="close-btn"
          >
            ×
          </button>
        </div>
        
        <div class="modal-body">
          <div class="selected-text" v-if="selectedText">
            <label>选中文本：</label>
            <p>{{ selectedText }}</p>
          </div>
          
          <div class="annotation-input">
            <label for="annotation-content">批注内容：</label>
            <textarea 
              id="annotation-content"
              v-model="annotationContent"
              placeholder="请输入批注内容..."
              class="content-textarea"
              @keydown.enter.ctrl="confirmAnnotation"
              @keydown.esc="$emit('cancel-annotation')"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            @click="$emit('cancel-annotation')" 
            class="btn cancel-btn"
          >
            取消
          </button>
          <button 
            @click="confirmAnnotation" 
            class="btn confirm-btn"
            :disabled="!annotationContent.trim()"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 接口定义
export interface Annotation {
  id: string;
  content: string;
  author: string;
  user: string; // 用户名，与author相同
  timestamp: number;
  resolved: boolean;
  editing?: boolean;
  editContent?: string;
  text?: string; // 批注对应的原文
  initials?: string; // 作者缩写
  range?: {
    startOffset: number;
    endOffset: number;
    text: string;
  };
  replies?: Annotation[]; // 批注回复
}

// Props
interface Props {
  showSidebar: boolean;
  showCreateModal: boolean;
  annotations: Annotation[];
  selectedText: string;
  isDarkTheme: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'close-sidebar': [];
  'resolve-annotation': [id: string];
  'delete-annotation': [id: string];
  'delete-resolved': [];
  'cancel-annotation': [];
  'confirm-annotation': [content: string];
  'update-annotation': [id: string, content: string];
}>();

// 响应式数据
const annotationContent = ref<string>('');
const sortOrder = ref<'time-desc' | 'time-asc' | 'document'>('time-desc');

// 计算属性
const hasResolvedAnnotations = computed(() => {
  return props.annotations.some(annotation => annotation.resolved);
});

/**
 * 排序后的批注列表
 */
const sortedAnnotations = computed(() => {
  const annotations = [...props.annotations];
  
  switch (sortOrder.value) {
    case 'time-asc':
      return annotations.sort((a, b) => a.timestamp - b.timestamp);
    case 'time-desc':
      return annotations.sort((a, b) => b.timestamp - a.timestamp);
    case 'document':
      // 按文档顺序排序（如果有range信息，按startOffset排序）
      return annotations.sort((a, b) => {
        if (a.range && b.range) {
          return a.range.startOffset - b.range.startOffset;
        }
        // 如果没有range信息，回退到时间排序
        return a.timestamp - b.timestamp;
      });
    default:
      return annotations;
  }
});

/**
 * 格式化时间显示 - 增强版本
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
const formatTime = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) {
    return '未知时间';
  }
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // 如果时间戳无效，返回默认值
  if (isNaN(date.getTime())) {
    return '未知时间';
  }
  
  // 相对时间显示
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  } else if (diff < 604800000) { // 7天内
    const days = Math.floor(diff / 86400000);
    return `${days}天前`;
  } else {
    // 超过7天显示具体日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * 获取绝对时间显示（用于tooltip）
 * @param {number} timestamp - 时间戳
 * @returns {string} 绝对时间字符串
 */
const getAbsoluteTime = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) {
    return '未知时间';
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return '未知时间';
  }
  
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 获取作者显示名称
 * @param {Annotation} annotation - 批注对象
 * @returns {string} 作者显示名称
 */
const getAuthorDisplay = (annotation: Annotation): string => {
  // 优先显示author，然后是user，最后是默认值
  return annotation.author || annotation.user || '匿名用户';
};

/**
 * 获取原文文本
 * @param {Annotation} annotation - 批注对象
 * @returns {string} 原文文本
 */
const getOriginalText = (annotation: Annotation): string => {
  // 优先使用range中的text，然后是直接的text属性
  if (annotation.range?.text && annotation.range.text.trim()) {
    const text = annotation.range.text.trim();
    // 过滤掉无效的原文文本
    if (text === '(原文内容未能提取)' || text.length < 2) {
      return '';
    }
    // 检查文本质量，避免显示格式标记或无意义字符
    const specialCharRatio = (text.match(/[^\w\s\u4e00-\u9fff]/g) || []).length / text.length;
    if (specialCharRatio > 0.7) {
      return '';
    }
    return text;
  }
  
  if (annotation.text && annotation.text.trim()) {
    const text = annotation.text.trim();
    // 过滤掉无效的原文文本
    if (text === '(原文内容未能提取)' || text.length < 2) {
      return '';
    }
    // 检查文本质量
    const specialCharRatio = (text.match(/[^\w\s\u4e00-\u9fff]/g) || []).length / text.length;
    if (specialCharRatio > 0.7) {
      return '';
    }
    return text;
  }
  
  return '';
};

/**
 * 更新排序顺序
 */
const updateSortOrder = (): void => {
  // 排序顺序改变时的处理逻辑（如果需要的话）
  // 目前由计算属性自动处理
};

/**
 * 开始编辑批注
 * @param {Annotation} annotation - 批注对象
 */
const startEdit = (annotation: Annotation): void => {
  annotation.editing = true;
  annotation.editContent = annotation.content;
};

/**
 * 确认编辑批注
 * @param {Annotation} annotation - 批注对象
 */
const confirmEdit = (annotation: Annotation): void => {
  if (annotation.editContent && annotation.editContent.trim()) {
    emit('update-annotation', annotation.id, annotation.editContent.trim());
    annotation.editing = false;
    annotation.editContent = '';
  }
};

/**
 * 取消编辑批注
 * @param {Annotation} annotation - 批注对象
 */
const cancelEdit = (annotation: Annotation): void => {
  annotation.editing = false;
  annotation.editContent = '';
};

/**
 * 确认创建批注
 */
const confirmAnnotation = (): void => {
  if (annotationContent.value.trim()) {
    emit('confirm-annotation', annotationContent.value.trim());
    annotationContent.value = '';
  }
};
</script>

<script lang="ts">
export default {
  name: 'AnnotationSystem'
};
</script>

<style scoped>
.annotation-system {
  position: relative;
}

/* 批注侧边栏样式 */
.annotation-sidebar {
  position: relative;
  top: 0;
  right: 0;
  width: 320px;
  height: calc(100%);
  background: #ffffff;
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  /* animation: slideIn 0.3s ease-out; */
}

.sidebar-header {
  padding: 4px 12px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.sidebar-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.annotation-list-controls {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-controls label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #007bff;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  /* color: #666; */
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
  /* 移除按钮默认样式 */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  outline: none;
}

.close-btn:hover {
  /* background: #e9ecef; */
  color: #c9c9c9;
}

.close-btn:active {
  border: none;
}

.dark-theme .close-btn {
  color: #595959;
}

.dark-theme .close-btn:hover {
  color: #c9c9c9;
}

.annotation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.annotation-item {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.annotation-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.annotation-item.resolved {
  opacity: 0.6;
  background: #f8f9fa;
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.annotation-author {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.author-initials {
  font-size: 10px;
  color: #666;
  background: #e9ecef;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 500;
}

.time-info {
  display: flex;
  align-items: center;
}

.annotation-time {
  font-size: 12px;
  color: #666;
  cursor: help;
}

.dark-theme .annotation-time {
  color: #999;
}

.annotation-original-text {
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.annotation-original-text label {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  text-align: left;
}

.dark-theme .annotation-original-text label {
  color: #999;
}

.original-text-content {
  margin: 0;
  line-height: 1.4;
  color: #555;
  font-size: 13px;
  font-style: italic;
  text-align: left;
}

.no-original-text-content {
  margin: 0;
  line-height: 1.4;
  text-align: left;
}

.no-text-hint {
  display: block;
  color: #999;
  font-size: 12px;
  font-style: italic;
  margin-bottom: 2px;
}

.no-text-reason {
  display: block;
  color: #bbb;
  font-size: 11px;
  font-style: normal;
}

.annotation-original-text.no-original-text {
  background: #f9f9f9;
  border-left-color: #ddd;
}

.annotation-content {
  margin-bottom: 12px;
}

.annotation-content label {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  text-align: left;
}

.comment-text-content {
  margin: 0;
  line-height: 1.5;
  color: #333;
  font-size: 14px;
  text-align: left;
}

.annotation-replies {
  margin-top: 12px;
  padding-left: 16px;
  border-left: 2px solid #e0e0e0;
}

.replies-header {
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e9ecef;
}

.replies-count {
  font-size: 11px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reply-item {
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  position: relative;
}

.reply-item.last-reply {
  margin-bottom: 0;
}

.reply-item::before {
  content: '';
  position: absolute;
  left: -17px;
  top: 12px;
  width: 8px;
  height: 1px;
  background: #e0e0e0;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.reply-author-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reply-author {
  font-weight: 600;
  font-size: 12px;
  color: #007bff;
}

.reply-initials {
  font-size: 9px;
  color: #666;
  background: #dee2e6;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 500;
}

.reply-time {
  font-size: 11px;
  color: #6c757d;
  cursor: help;
}

.reply-content {
  font-size: 13px;
  color: #495057;
  line-height: 1.4;
}

.edit-textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.annotation-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn {
  background: #007bff;
  color: white;
}

.edit-btn:hover {
  background: #0056b3;
}

.confirm-btn {
  background: #28a745;
  color: white;
}

.confirm-btn:hover {
  background: #1e7e34;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #545b62;
}

.resolve-btn {
  background: #ffc107;
  color: #212529;
}

.resolve-btn:hover {
  background: #e0a800;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
  
}

.clear-btn {
  width: 100%;
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover:not(:disabled) {
  background: #c82333;
}

.clear-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* 批注创建弹窗样式 */
.annotation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.annotation-modal {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.selected-text {
  margin-bottom: 16px;
}

.selected-text label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.selected-text p {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin: 0;
  border-left: 4px solid #007bff;
  font-style: italic;
}

.annotation-input label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.content-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.content-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8f9fa;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.cancel-btn {
  background: #6c757d;
  color: white;
}

.btn.cancel-btn:hover {
  background: #545b62;
}

.btn.confirm-btn {
  background: #007bff;
  color: white;
}

.btn.confirm-btn:hover:not(:disabled) {
  background: #0056b3;
}

.btn.confirm-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* 暗色主题样式 */
.annotation-sidebar.dark-theme,
.annotation-modal.dark-theme {
    background-color: #2d2d2d;
    border-color: #404040;
}

.dark-theme .sidebar-header,
.dark-theme .modal-header,
.dark-theme .sidebar-footer,
.dark-theme .modal-footer,
.dark-theme .annotation-list-controls {
    background-color: #2d2d2d;
    border-color: #404040;
}

.dark-theme .sort-controls label {
  color: #a0aec0;
}

.dark-theme .sort-select {
  background: #4a5568;
  border-color: #718096;
  color: #e2e8f0;
}

.dark-theme .author-initials {
  background: #4a5568;
  color: #a0aec0;
}

.dark-theme .replies-count {
  color: #a0aec0;
}

.dark-theme .reply-initials {
  background: #4a5568;
  color: #a0aec0;
}

.dark-theme .sidebar-header h4,
.dark-theme .modal-header h3,
.dark-theme .annotation-author,
.dark-theme .annotation-content p,
.dark-theme .annotation-content label,
.dark-theme .annotation-original-text label,
.dark-theme .annotation-original-text p,
.dark-theme .selected-text label,
.dark-theme .annotation-input label {
  color: #e2e8f0;
}

.dark-theme .annotation-item {
    background-color: #2d2d2d;
    border-color: #404040;
}

.dark-theme .annotation-item.resolved {
  background: #2d3748;
}

.dark-theme .selected-text p {
  background: #4a5568;
  color: #e2e8f0;
}

.dark-theme .annotation-original-text {
  background: #494a4c;
  border-left-color: #878787;
}

.dark-theme .original-text-content {
  color: #cbd5e0;
}

.dark-theme .no-text-hint {
  color: #a0aec0;
}

.dark-theme .no-text-reason {
  color: #718096;
}

.dark-theme .annotation-original-text.no-original-text {
  background: #2d3748;
  border-left-color: #4a5568;
}

.dark-theme .comment-text-content {
  color: #e2e8f0;
}

.dark-theme .annotation-replies {
  border-left-color: #718096;
}

.dark-theme .reply-item {
  background: #2d3748;
  border-color: #4a5568;
}

.dark-theme .reply-author {
  color: #63b3ed;
}

.dark-theme .reply-time {
  color: #a0aec0;
}

.dark-theme .reply-content {
  color: #cbd5e0;
}

.dark-theme .edit-textarea,
.dark-theme .content-textarea {
  background: #4a5568;
  border-color: #718096;
  color: #e2e8f0;
}

.dark-theme .edit-textarea:focus,
.dark-theme .content-textarea:focus {
  border-color: #63b3ed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .annotation-sidebar {
    width: 100%;
  }
  
  .annotation-modal {
    width: 95%;
    margin: 10px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .annotation-actions {
    justify-content: center;
  }
}
</style>