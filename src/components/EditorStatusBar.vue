<template>
  <div 
    class="editor-status-bar"
    :class="{ 'dark-theme': isDarkTheme }"
  >
    <div class="status-left">
      <!-- 保存状态 -->
      <div class="status-item save-status">
        <span 
          class="save-indicator"
          :class="{ 'saved': isSaved, 'unsaved': !isSaved }"
        >
          {{ isSaved ? '已保存' : '未保存' }}
        </span>
      </div>
      
      <!-- 字数统计 -->
      <div class="status-item word-count">
        <span class="label">字数:</span>
        <span class="value">{{ wordCount }}</span>
      </div>
      
      <!-- 字符数统计 -->
      <div class="status-item char-count">
        <span class="label">字符:</span>
        <span class="value">{{ characterCount }}</span>
      </div>
      
      <!-- 段落数统计 -->
      <div class="status-item paragraph-count">
        <span class="label">段落:</span>
        <span class="value">{{ paragraphCount }}</span>
      </div>
    </div>
    
    <div class="status-right">
      <!-- 只读/可编辑开关 -->
      <div class="status-item readonly-toggle">
        <button 
          class="toggle-button"
          :class="{ 'readonly': isReadOnly, 'editable': !isReadOnly }"
          @click="handleToggleReadOnly"
          :title="isReadOnly ? '切换到编辑模式' : '切换到只读模式'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="isReadOnly" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
            <path v-else d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
          </svg>
          <span>{{ isReadOnly ? '只读' : '编辑' }}</span>
        </button>
      </div>
      
      <!-- 批注模式指示 -->
      <div 
        v-if="isAnnotationMode" 
        class="status-item annotation-indicator"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9M10,16V19.08L13.08,16H20V4H4V16H10Z"/>
        </svg>
        <span>批注模式</span>
      </div>
      
      <!-- 导出状态 -->
      <div 
        v-if="isExporting" 
        class="status-item export-indicator"
      >
        <div class="loading-spinner"></div>
        <span>导出中...</span>
      </div>
      
      <!-- 当前时间 -->
      <div class="status-item current-time">
        <span>{{ currentTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Console } from '../utils/Console';

Console.debug('EditorStatusBar 组件初始化');

// Props
interface Props {
  isSaved: boolean;
  charCount: number;
  isReadOnly: boolean;
  isAnnotationMode: boolean;
  isExporting: boolean;
  isDarkTheme: boolean;
  editorContent?: string;
}

const props = withDefaults(defineProps<Props>(), {
  editorContent: ''
});

// Emits
const emit = defineEmits<{
  'toggle-readonly': [];
}>();

// 响应式数据
const currentTime = ref<string>('');
let timeInterval: ReturnType<typeof setInterval> | null = null;

// 计算属性
/**
 * 计算字数（中文字符和英文单词）
 */
const wordCount = computed(() => {
  if (!props.editorContent) return 0;
  
  // 移除HTML标签和实体编码
  const textContent = props.editorContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
  
  if (!textContent) return 0;
  
  // 统计中文字符（包括中文标点符号）
  const chineseChars = textContent.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
  
  // 统计英文单词（连续的字母组成一个单词）
  const englishText = textContent.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  const englishWords = englishText.match(/[a-zA-Z]+/g) || [];
  
  return chineseChars.length + englishWords.length;
});

/**
 * 计算字符数（所有可见字符）
 */
const characterCount = computed(() => {
  if (!props.editorContent) return 0;
  
  // 移除HTML标签和实体编码，但保留所有文本字符
  const textContent = props.editorContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
  
  // 移除首尾空白，但保留中间的空格和换行
  return textContent.trim().length;
});

/**
 * 计算段落数
 */
const paragraphCount = computed(() => {
  if (!props.editorContent) return 0;
  
  // 统计所有块级元素：p, h1-h6, li, div等
  const blockElements = props.editorContent.match(/<(p|h[1-6]|li|div)[^>]*>.*?<\/\1>/gi) || [];
  const selfClosingBlocks = props.editorContent.match(/<(br|hr)[^>]*\/?>/gi) || [];
  
  // 如果没有找到任何块级元素，但有内容，则至少算作1段
  const totalBlocks = blockElements.length + selfClosingBlocks.length;
  
  if (totalBlocks === 0) {
    // 检查是否有纯文本内容
    const textContent = props.editorContent.replace(/<[^>]*>/g, '').trim();
    return textContent ? 1 : 0;
  }
  
  return totalBlocks;
});

/**
 * 更新当前时间
 */
const updateTime = (): void => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 处理只读模式切换
 */
const handleToggleReadOnly = (): void => {
  emit('toggle-readonly');
};

// 生命周期钩子
onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000); // 每秒更新一次
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});
</script>

<script lang="ts">
export default {
  name: 'EditorStatusBar'
};
</script>

<style scoped>
.editor-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
  min-height: 32px;
  user-select: none;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* 保存状态样式 */
.save-status {
  font-weight: 500;
}

.save-indicator.saved {
  color: #28a745;
}

.save-indicator.unsaved {
  color: #dc3545;
}

/* 统计信息样式 */
.word-count,
.char-count,
.paragraph-count {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.label {
  color: #666;
}

.value {
  color: #333;
  font-weight: 500;
}

/* 指示器样式 */
.readonly-toggle .toggle-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.readonly-toggle .toggle-button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.readonly-toggle .toggle-button.readonly {
  color: #856404;
}

.readonly-toggle .toggle-button.readonly:hover {
  background: rgba(255, 193, 7, 0.1);
}

.readonly-toggle .toggle-button.editable {
  color: #0c5460;
}

.readonly-toggle .toggle-button.editable:hover {
  background: rgba(23, 162, 184, 0.1);
}

.annotation-indicator {
  color: #007bff;
  font-weight: 500;
}

.export-indicator {
  color: #17a2b8;
  font-weight: 500;
}

/* 加载动画 */
.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #17a2b8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 当前时间样式 */
.current-time {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #666;
}

/* 暗色主题样式 */
.editor-status-bar.dark-theme {
  background: #2d3748;
  border-color: #4a5568;
  color: #a0aec0;
}

.dark-theme .label {
  color: #a0aec0;
}

.dark-theme .value {
  color: #e2e8f0;
}

.dark-theme .current-time {
  color: #a0aec0;
}

.dark-theme .save-indicator.saved {
  color: #176cff;
}

.dark-theme .save-indicator.unsaved {
  color: #fc8181;
}

.dark-theme .readonly-toggle .toggle-button {
  color: #a0aec0;
}

.dark-theme .readonly-toggle .toggle-button:hover {
  background: rgba(255, 255, 255, 0.05);
}

.dark-theme .readonly-toggle .toggle-button.readonly {
  color: #f6e05e;
}

.dark-theme .readonly-toggle .toggle-button.readonly:hover {
  background: rgba(246, 224, 94, 0.1);
}

.dark-theme .readonly-toggle .toggle-button.editable {
  color: #4fd1c7;
}

.dark-theme .readonly-toggle .toggle-button.editable:hover {
  background: rgba(79, 209, 199, 0.1);
}

.dark-theme .annotation-indicator {
  color: #63b3ed;
}

.dark-theme .export-indicator {
  color: #4fd1c7;
}

.dark-theme .loading-spinner {
  border-color: #4a5568;
  border-top-color: #4fd1c7;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-status-bar {
    padding: 6px 12px;
    font-size: 11px;
  }
  
  .status-left,
  .status-right {
    gap: 12px;
  }
  
  /* 在小屏幕上隐藏一些不重要的信息 */
  .paragraph-count,
  .current-time {
    display: none;
  }
}

@media (max-width: 480px) {
  .status-left,
  .status-right {
    gap: 8px;
  }
  
  /* 在更小的屏幕上进一步简化 */
  .char-count {
    display: none;
  }
  
  .status-item {
    gap: 2px;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .editor-status-bar {
    border-top-width: 2px;
  }
  
  .save-indicator.saved {
    color: #0f5132;
  }
  
  .save-indicator.unsaved {
    color: #842029;
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
  
  .loading-spinner::after {
    content: '...';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>