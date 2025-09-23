<template>
  <div class="annotation-system">
    <!-- 批注侧边栏 -->
    <div 
      v-if="showSidebar" 
      class="annotation-sidebar"
      :class="{ 'dark-theme': isDarkTheme }"
    >
      <div class="sidebar-header">
        <h3>批注列表</h3>
        <button 
          @click="$emit('close-sidebar')" 
          class="close-btn"
        >
          ×
        </button>
      </div>
      
      <div class="annotation-list">
        <div 
          v-for="annotation in annotations" 
          :key="annotation.id"
          class="annotation-item"
          :class="{ 'resolved': annotation.resolved }"
        >
          <div class="annotation-header">
            <span class="annotation-author">{{ annotation.author }}</span>
            <span class="annotation-time">{{ formatTime(annotation.timestamp) }}</span>
          </div>
          
          <!-- 显示批注对应的原文 -->
          <div v-if="annotation.text || annotation.range?.text" class="annotation-original-text">
            <label>原文：</label>
            <p>{{ annotation.text || annotation.range?.text }}</p>
          </div>
          
          <div class="annotation-content">
            <label>批注：</label>
            <p v-if="!annotation.editing">{{ annotation.content }}</p>
            <textarea 
              v-else
              v-model="annotation.editContent"
              class="edit-textarea"
              @keydown.enter.ctrl="confirmEdit(annotation)"
              @keydown.esc="cancelEdit(annotation)"
            ></textarea>
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
        
        <div v-if="annotations.length === 0" class="empty-state">
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
interface Annotation {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  resolved: boolean;
  editing?: boolean;
  editContent?: string;
  text?: string; // 批注对应的原文
  range?: {
    startOffset: number;
    endOffset: number;
    text: string;
  };
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

// 计算属性
const hasResolvedAnnotations = computed(() => {
  return props.annotations.some(annotation => annotation.resolved);
});

/**
 * 格式化时间显示
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString();
  }
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
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e9ecef;
  color: #333;
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

.annotation-author {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.annotation-time {
  font-size: 12px;
  color: #666;
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

.annotation-original-text p {
  margin: 0;
  line-height: 1.4;
  color: #555;
  font-size: 13px;
  font-style: italic;
  text-align: left;
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

.annotation-content p {
  margin: 0;
  line-height: 1.5;
  color: #333;
  font-size: 14px;
  text-align: left;
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
  background: #2d3748;
  border-color: #4a5568;
}

.dark-theme .sidebar-header,
.dark-theme .modal-header,
.dark-theme .sidebar-footer,
.dark-theme .modal-footer {
  background: #1a202c;
  border-color: #4a5568;
}

.dark-theme .sidebar-header h3,
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
  background: #4a5568;
  border-color: #718096;
}

.dark-theme .annotation-item.resolved {
  background: #2d3748;
}

.dark-theme .selected-text p {
  background: #4a5568;
  color: #e2e8f0;
}

.dark-theme .annotation-original-text {
  background: #4a5568;
  border-left-color: #63b3ed;
}

.dark-theme .annotation-original-text p {
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