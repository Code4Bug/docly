<template>
  <div class="docly-editor" :class="{ 'dark-theme': isDarkMode }">
    <!-- 工具栏 -->
    <div class="docly-toolbar">
      <div class="toolbar-group">
        <!-- 文件操作区域 -->
        <div class="toolbar-section">
          <button 
            @click="importFile" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '导入文档')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>
            </svg>
          </button>
          <button 
            @click="exportFile" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '导出文档')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>
            </svg>
          </button>
        </div>

        <!-- 撤销重做区域 -->
        <div class="toolbar-section">
          <button 
            @click="undo" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '撤销')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z"/>
            </svg>
          </button>
          <button 
            @click="redo" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '重做')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.4,10.6C16.55,9 14.15,8 11.5,8C6.85,8 2.92,11.03 1.53,15.22L3.9,16C4.95,12.81 7.96,10.5 11.5,10.5C13.46,10.5 15.23,11.22 16.62,12.38L13,16H22V7L18.4,10.6Z"/>
            </svg>
          </button>
        </div>

        <!-- 文本格式化区域 -->
        <div class="toolbar-section">
          <select 
            v-model="currentHeading" 
            @change="changeHeading" 
            class="compact-select"
            @mouseenter="showTooltip($event, '标题级别')"
            @mouseleave="hideTooltip"
          >
            <option value="">正文</option>
            <option value="1">标题 1</option>
            <option value="2">标题 2</option>
            <option value="3">标题 3</option>
          </select>
          
          <div class="button-group">
            <button 
              @click="formatText('bold')" 
              class="toolbar-btn"
              :class="{ active: isFormatActive('bold') }"
              @mouseenter="showTooltip($event, '粗体')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5,15.5H10V12.5H13.5A1.5,1.5 0 0,1 15,14A1.5,1.5 0 0,1 13.5,15.5M10,6.5H13A1.5,1.5 0 0,1 14.5,8A1.5,1.5 0 0,1 13,9.5H10M15.6,10.79C16.57,10.11 17.25,9.02 17.25,8C17.25,5.74 15.5,4 13.25,4H7V18H14.04C16.14,18 17.75,16.3 17.75,14.21C17.75,12.69 16.89,11.39 15.6,10.79Z"/>
              </svg>
            </button>
            <button 
              @click="formatText('italic')" 
              class="toolbar-btn"
              :class="{ active: isFormatActive('italic') }"
              @mouseenter="showTooltip($event, '斜体')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H10Z"/>
              </svg>
            </button>
            <button 
              @click="formatText('underline')" 
              class="toolbar-btn"
              :class="{ active: isFormatActive('underline') }"
              @mouseenter="showTooltip($event, '下划线')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5,21H19V19H5V21M12,17A6,6 0 0,0 18,11V3H15.5V11A3.5,3.5 0 0,1 12,14.5A3.5,3.5 0 0,1 8.5,11V3H6V11A6,6 0 0,0 12,17Z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 对齐方式区域 -->
        <div class="toolbar-section">
          <div class="button-group">
            <button 
              @click="setAlignment('left')" 
              class="toolbar-btn"
              :class="{ active: currentAlignment === 'left' }"
              @mouseenter="showTooltip($event, '左对齐')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"/>
              </svg>
            </button>
            <button 
              @click="setAlignment('center')" 
              class="toolbar-btn"
              :class="{ active: currentAlignment === 'center' }"
              @mouseenter="showTooltip($event, '居中对齐')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3H21V5H3V3M7,7H17V9H7V7M3,11H21V13H3V11M7,15H17V17H7V15M3,19H21V21H3V19Z"/>
              </svg>
            </button>
            <button 
              @click="setAlignment('right')" 
              class="toolbar-btn"
              :class="{ active: currentAlignment === 'right' }"
              @mouseenter="showTooltip($event, '右对齐')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3H21V5H3V3M9,7H21V9H9V7M3,11H21V13H3V11M9,15H21V17H9V15M3,19H21V21H3V19Z"/>
              </svg>
            </button>
            <button 
              @click="setAlignment('justify')" 
              class="toolbar-btn"
              :class="{ active: currentAlignment === 'justify' }"
              @mouseenter="showTooltip($event, '两端对齐')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 样式区域 -->
        <div class="toolbar-section">
          <div class="color-picker-wrapper">
            <button 
              @click="showTextColorPicker = !showTextColorPicker" 
              class="toolbar-btn color-btn"
              @mouseenter="showTooltip($event, '文字颜色')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.62,12L12,5.67L14.38,12M11,3L5.5,17H7.75L8.87,14H15.13L16.25,17H18.5L13,3H11Z"/>
              </svg>
              <div class="color-indicator" :style="{ backgroundColor: currentTextColor }"></div>
            </button>
            <div v-if="showTextColorPicker" class="color-picker-panel">
              <div class="color-presets">
                <div 
                  v-for="color in ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500']"
                  :key="color"
                  class="color-preset"
                  :style="{ backgroundColor: color }"
                  @click="applyTextColor(color)"
                ></div>
              </div>
              <input 
                type="color" 
                v-model="customTextColor" 
                @change="applyTextColor(customTextColor)"
                class="custom-color-input"
              />
            </div>
          </div>
          
          <div class="color-picker-wrapper">
            <button 
              @click="showBgColorPicker = !showBgColorPicker" 
              class="toolbar-btn color-btn"
              @mouseenter="showTooltip($event, '背景颜色')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
              </svg>
              <div class="color-indicator bg-indicator" :style="{ backgroundColor: currentBgColor }"></div>
            </button>
            <div v-if="showBgColorPicker" class="color-picker-panel">
              <div class="color-presets">
                <div 
                  v-for="color in ['#ffffff', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ffa500', '#ff0000', '#0000ff']"
                  :key="color"
                  class="color-preset"
                  :style="{ backgroundColor: color }"
                  @click="applyBgColor(color)"
                ></div>
              </div>
              <input 
                type="color" 
                v-model="customBgColor" 
                @change="applyBgColor(customBgColor)"
                class="custom-color-input"
              />
            </div>
          </div>
        </div>

        <!-- 列表区域 -->
        <div class="toolbar-section">
          <button 
            @click="insertList('unordered')" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '无序列表')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"/>
            </svg>
          </button>
          <button 
            @click="insertList('ordered')" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '有序列表')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,13V11H21V13H7M7,19V17H21V19H7M7,7V5H21V7H7M3,8V5H2V4H4V8H3M2,17V16H5V20H2V19H4V18.5H3V17.5H4V17H2M4.25,10A0.75,0.75 0 0,1 5,10.75C5,10.95 4.92,11.14 4.79,11.27L3.12,13H5V14H2V13.08L4,11H2V10H4.25Z"/>
            </svg>
          </button>
        </div>

        <!-- 插入内容区域 -->
        <div class="toolbar-section">
          <button 
            @click="insertLink" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '插入链接')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
            </svg>
          </button>
          <button 
            @click="insertTable" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '插入表格')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,8V12H11V8H5M13,8V12H19V8H13M5,14V18H11V14H5M13,14V18H19V14H13Z"/>
            </svg>
          </button>
          <button 
            @click="insertQuote" 
            class="toolbar-btn"
            @mouseenter="showTooltip($event, '插入引用')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z"/>
            </svg>
          </button>
        </div>

        <!-- 批注功能区域 -->
        <div class="toolbar-section">
          <button 
            @click="toggleAnnotationMode" 
            class="toolbar-btn"
            :class="{ active: isAnnotationMode }"
            @mouseenter="showTooltip($event, '添加批注')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22H9M10,16V19.08L13.08,16H20V4H4V16H10M6,7H18V9H6V7M6,11H16V13H6V11Z"/>
            </svg>
          </button>
          <button 
            @click="showAnnotationList" 
            class="toolbar-btn"
            :class="{ active: showAnnotationPanel }"
            @mouseenter="showTooltip($event, showAnnotationPanel ? '隐藏批注列表' : '显示批注列表')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,20L1.5,16.5L2.91,15.09L5,17.17L9.59,12.59L11,14L5,20Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑器容器 -->
    <div class="docly-editor-container" :class="{ 'with-sidebar': showAnnotationPanel }">
      <div 
        class="docly-editor-holder" 
        ref="editorRef"
        @mouseup="handleTextSelection"
      ></div>
      
      <!-- 批注侧边栏 -->
      <div v-if="showAnnotationPanel" class="annotation-sidebar">
        <div class="annotation-sidebar-header">
           <h3>批注列表 ({{ annotations.length }})</h3>
           <div class="sidebar-actions">
             <button 
               @click="deleteResolvedAnnotations" 
               class="action-btn small"
               :disabled="annotations.filter(a => a.resolved).length === 0"
               title="清理已解决的批注"
             >
               清理已解决
             </button>
             <button 
               @click="exportAnnotations" 
               class="action-btn small"
               :disabled="annotations.length === 0"
               title="导出批注列表"
             >
               导出
             </button>
             <button @click="showAnnotationPanel = false" class="close-btn" title="关闭侧边栏">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
               </svg>
             </button>
           </div>
         </div>
        <div class="annotation-list">
          <div 
            v-for="annotation in annotations" 
            :key="annotation.id"
            class="annotation-item"
            :class="{ resolved: annotation.resolved }"
          >
            <div class="annotation-header">
              <span class="annotation-author">{{ annotation.author }}</span>
              <span class="annotation-time">{{ new Date(annotation.timestamp).toLocaleString() }}</span>
            </div>
            <div class="annotation-text">
              <strong>选中文本：</strong>{{ annotation.text }}
            </div>
            <div class="annotation-content">
              {{ annotation.content }}
            </div>
            <div class="annotation-actions">
               <button 
                 @click="editAnnotation(annotation.id)"
                 class="action-btn edit"
               >
                 编辑
               </button>
               <button 
                 @click="resolveAnnotation(annotation.id)"
                 class="action-btn"
                 :class="{ resolved: annotation.resolved }"
               >
                 {{ annotation.resolved ? '取消解决' : '标记解决' }}
               </button>
               <button 
                 @click="deleteAnnotation(annotation.id)"
                 class="action-btn delete"
               >
                 删除
               </button>
             </div>
          </div>
          <div v-if="annotations.length === 0" class="no-annotations">
            暂无批注
          </div>
        </div>
      </div>
    </div>

    <!-- 批注创建弹窗 -->
    <div v-if="isAnnotationMode && selectedText" class="annotation-modal">
      <div class="annotation-modal-content">
        <div class="annotation-modal-header">
          <h3>{{ selectedAnnotation ? '编辑批注' : '添加批注' }}</h3>
          <button @click="cancelAnnotation" class="close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>
        <div class="selected-text">
          <strong>选中文本：</strong>{{ selectedText }}
        </div>
        <textarea 
          v-model="annotationInput"
          placeholder="请输入批注内容..."
          class="annotation-textarea"
          rows="4"
        ></textarea>
        <div class="annotation-modal-actions">
          <button @click="cancelAnnotation" class="btn-cancel">取消</button>
          <button @click="confirmAnnotation" class="btn-confirm">
            {{ selectedAnnotation ? '更新' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="docly-statusbar">
      <div class="status-group">
        <span class="status-item">字数: {{ wordCount }}</span>
        <span class="status-item">字符: {{ charCount }}</span>
        <span v-if="!isSaved" class="status-item unsaved-indicator">未保存</span>
      </div>
    </div>

    <!-- 隐藏的文件输入元素 -->
    <input 
      ref="fileInputRef"
      type="file" 
      accept=".docx,.doc" 
      @change="handleImport"
      style="display: none;"
    />

    <!-- 自定义悬浮提示 -->
    <div 
      v-if="tooltip.visible" 
      class="custom-tooltip"
      :style="{ 
        left: tooltip.x + 'px', 
        top: tooltip.y + 'px' 
      }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { EditorCore } from '../core/EditorCore';
import { PluginManager } from '../plugins/PluginManager';
import { WordHandler } from '../fileHandlers/WordHandler';
import { useEditorStore } from '../stores/editorStore';
import type { EditorConfig } from '../types';

// Props
interface Props {
  config?: Partial<EditorConfig>;
  readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
});

// 响应式数据
const editorRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const editorCore = ref<EditorCore>();
const pluginManager = ref<PluginManager>();
const wordHandler = ref<WordHandler>();
const isExporting = ref(false);

// 新增的响应式数据
const currentAlignment = ref('left');
const currentHeading = ref('');
const isSaved = ref(true);
const charCount = ref(0);

// 颜色相关状态
const showTextColorPicker = ref(false);
const showBgColorPicker = ref(false);
const currentTextColor = ref('#000000');
const currentBgColor = ref('#ffffff');
const customTextColor = ref('#000000');
const customBgColor = ref('#ffffff');

// 颜色预设
const textColorPresets = ref([
  '#000000', '#333333', '#666666', '#999999',
  '#ff0000', '#ff6600', '#ffcc00', '#00ff00',
  '#0066ff', '#6600ff', '#ff0066', '#00ffff'
]);

const bgColorPresets = ref([
  '#ffffff', '#f5f5f5', '#e0e0e0', '#cccccc',
  '#ffeeee', '#fff0e6', '#fffacc', '#eeffee',
  '#e6f0ff', '#f0e6ff', '#ffe6f0', '#e6ffff'
]);

// 悬浮提示相关状态
const tooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0
});

// 批注相关状态
const isAnnotationMode = ref(false);
const annotations = ref<Array<{
  id: string;
  text: string;
  content: string;
  author: string;
  timestamp: number;
  position: {
    startOffset: number;
    endOffset: number;
    blockId: string;
  };
  resolved: boolean;
}>>([]);
const showAnnotationPanel = ref(false);
const selectedAnnotation = ref<string | null>(null);
const annotationInput = ref('');
const selectedText = ref('');

// Store
const editorStore = useEditorStore();

// 主题相关的响应式数据
const isDarkMode = ref(false);
const systemThemeQuery = ref<MediaQueryList | null>(null);

/**
 * 检测系统主题变化
 */
const detectSystemTheme = (): MediaQueryList | null => {
  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    isDarkMode.value = query.matches;
    return query;
  }
  return null;
};

/**
 * 处理系统主题变化
 * @param {MediaQueryListEvent} e - 媒体查询事件
 */
const handleThemeChange = (e: MediaQueryListEvent): void => {
  isDarkMode.value = e.matches;
  // 更新编辑器主题
  updateEditorTheme();
};

/**
 * 更新编辑器主题
 */
const updateEditorTheme = (): void => {
  if (editorCore.value) {
    // 这里可以添加编辑器内容区域的主题更新逻辑
    const editorElement = editorRef.value;
    if (editorElement) {
      if (isDarkMode.value) {
        editorElement.classList.add('dark-theme');
      } else {
        editorElement.classList.remove('dark-theme');
      }
    }
  }
};

// 计算属性
const isSaving = computed(() => editorStore.isSaving);
const isReadOnly = computed(() => editorStore.isReadOnly);
const wordCount = computed(() => editorStore.wordCount);
const blockCount = computed(() => editorStore.blockCount);
const commentCount = computed(() => editorStore.commentCount);
const hasUnsavedChanges = computed(() => editorStore.hasUnsavedChanges);

/**
 * 初始化编辑器
 */
const initEditor = async (): Promise<void> => {
  if (!editorRef.value) return;

  try {
    console.log('开始初始化编辑器...');
    
    // 初始化插件管理器
    pluginManager.value = new PluginManager();
    console.log('插件管理器初始化完成');
    
    // 初始化文件处理器
    wordHandler.value = new WordHandler();
    console.log('文件处理器初始化完成');
    
    // 初始化编辑器核心
    console.log('创建编辑器核心实例...');
    editorCore.value = new EditorCore({
      holder: editorRef.value,
      plugins: [],
      readOnly: props.readOnly,
      placeholder: '开始编写您的文档...',
      data: {
        time: Date.now(),
        blocks: [
          {
            id: 'initial-block',
            type: 'paragraph',
            data: {
              text: '欢迎使用 Docly 编辑器！开始编写您的文档...'
            }
          }
        ],
        version: '2.0.0'
      },
      ...props.config
    });
    console.log('编辑器核心实例创建完成');
    
    console.log('调用编辑器核心初始化...');
    await editorCore.value.init();
    console.log('编辑器核心初始化完成');
    
    console.log('设置编辑器实例到 store...');
    editorStore.setEditorInstance(editorCore.value);
    console.log('编辑器实例设置完成，当前实例:', editorStore.editorInstance);
    
    // 应用初始主题
    updateEditorTheme();
    
    // 初始化完成后立即保存数据到 store
    setTimeout(async () => {
      try {
        await editorStore.saveDocument();
      } catch (error) {
        console.warn('初始数据保存失败:', error);
      }
    }, 1000);
    
  } catch (error) {
    console.error('编辑器初始化失败，详细错误:', error);
    console.error('错误堆栈:', error.stack);
    showMessage('编辑器初始化失败', 'error');
  }
};

/**
 * 处理保存
 */
const handleSave = async (): Promise<void> => {
  try {
    await editorStore.saveDocument();
    showMessage('文档保存成功', 'success');
  } catch (error) {
    showMessage('文档保存失败', 'error');
  }
};

/**
 * 处理导出
 */
const handleExport = async (): Promise<void> => {
  // 检查编辑器是否已初始化
  if (!editorCore.value) {
    showMessage('编辑器未初始化，请稍后再试', 'error');
    return;
  }

  // 检查文件处理器是否已初始化
  if (!wordHandler.value) {
    showMessage('文件处理器未初始化，请稍后再试', 'error');
    return;
  }

  isExporting.value = true;
  try {
    // 先保存当前编辑器数据到 store
    await editorStore.saveDocument();
    
    // 检查是否有数据可导出
    if (!editorStore.editorData || !editorStore.editorData.blocks || editorStore.editorData.blocks.length === 0) {
      showMessage('没有内容可导出，请先添加一些内容', 'warning');
      return;
    }

    // 执行导出
    const file = await wordHandler.value.export(editorStore.editorData);
    
    // 创建下载链接
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('文档导出成功', 'success');
  } catch (error) {
    console.error('导出失败:', error);
    showMessage(`文档导出失败: ${error.message || '未知错误'}`, 'error');
  } finally {
    isExporting.value = false;
  }
};

/**
 * 触发文件选择
 */
const triggerFileInput = (): void => {
  fileInputRef.value?.click();
};

/**
 * 处理文件导入
 */
const handleImport = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) {
    showMessage('请选择一个文件', 'error');
    return;
  }

  if (!wordHandler.value) {
    try {
      // 重新初始化wordHandler
      wordHandler.value = new WordHandler();
    } catch (error) {
      console.error('wordHandler初始化失败:', error);
      showMessage('文件处理器初始化失败', 'error');
      return;
    }
  }

  // 检查文件类型
  if (!file.name.toLowerCase().endsWith('.docx')) {
    showMessage('仅支持 .docx 格式的Word文件', 'error');
    return;
  }

  // 检查文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showMessage('文件大小不能超过10MB', 'error');
    return;
  }

  try {
    showMessage('正在导入文档，请稍候...', 'info');
    
    const editorData = await wordHandler.value.import(file);
    console.log('导入的文档数据:', editorData);
    
    // 清空现有批注，避免重复累积
    annotations.value = [];
    console.log('已清空现有批注');
    
    // 处理导入的批注数据
    const importedComments: any[] = [];
    
    /**
     * 创建标准化的批注对象
     * @param comment 原始批注数据
     * @param index 批注索引
     * @param blockIndex 关联的块索引，-1表示独立批注
     * @param blockText 关联块的文本内容
     * @returns 标准化的批注对象
     */
    const createStandardComment = (comment: any, index: number, blockIndex: number = -1, blockText?: string) => {
      // 优先使用批注的原始选中文本，避免使用批注内容作为选中文本
      let selectedText = '';
      
      if (comment.range?.text && comment.range.text !== comment.content) {
        // 如果 range.text 存在且不等于批注内容，使用它
        selectedText = comment.range.text;
      } else if (blockText && blockIndex >= 0) {
        // 如果有关联的块文本，尝试从中提取相关文本
        selectedText = blockText.substring(0, 50);
      } else if (comment.content) {
        // 最后才使用批注内容的前50个字符作为占位符
        selectedText = `"${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`;
      } else {
        selectedText = '未知文本';
      }
      
      return {
        id: comment.id || `imported_${Date.now()}_${index}`,
        content: comment.content,
        author: comment.author || comment.user || '文档作者',
        text: selectedText,
        timestamp: typeof comment.timestamp === 'number' ? comment.timestamp : Date.now(),
        resolved: false,
        blockIndex: blockIndex
      };
    };
    
    // 首先从 EditorData.comments 中读取批注（新的存储方式）
    if (editorData.comments && editorData.comments.length > 0) {
      editorData.comments.forEach((comment, index) => {
        importedComments.push(createStandardComment(comment, index));
      });
    }
    
    // 然后从块中提取关联的批注（保持向后兼容）
    if (editorData.blocks) {
      editorData.blocks.forEach((block, blockIndex) => {
        if (block.comments && block.comments.length > 0) {
          block.comments.forEach(comment => {
            // 避免重复添加已经在 EditorData.comments 中的批注
            const existingComment = importedComments.find(c => c.id === comment.id);
            if (!existingComment) {
              importedComments.push(createStandardComment(comment, blockIndex, blockIndex, block.data.text));
            }
          });
        }
      });
    }
    
    // 合并导入的批注到现有批注列表，避免重复
    if (importedComments.length > 0) {
      // 过滤掉已经存在的批注，避免重复添加
      const newComments = importedComments.filter(importedComment => 
        !annotations.value.some(existingComment => existingComment.id === importedComment.id)
      );
      
      if (newComments.length > 0) {
        annotations.value.push(...newComments);
        showMessage(`文档导入成功，新增 ${newComments.length} 个批注`, 'success');
        console.log('新增的批注:', newComments);
      } else {
        showMessage('文档导入成功，未发现新批注', 'success');
      }
    } else {
      showMessage('文档导入成功', 'success');
    }
    
    console.log('准备调用 editorStore.loadDocument...');
    await editorStore.loadDocument(editorData);
    console.log('editorStore.loadDocument 调用完成');
    console.log('文档已加载到编辑器store，当前编辑器数据:', editorStore.editorData);
    
  } catch (error) {
    console.error('导入失败，详细错误信息:', error);
    console.error('错误类型:', typeof error);
    console.error('错误堆栈:', error.stack);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showMessage(`文档导入失败: ${errorMessage}`, 'error');
  } finally {
    // 清空文件输入
    if (target) {
      target.value = '';
    }
  }
};

/**
 * 显示消息提示
 * @param {string} text - 消息文本
 * @param {string} type - 消息类型 ('success' | 'error' | 'warning' | 'info')
 */
const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
  // 清除之前的消息
  const existingMessages = document.querySelectorAll('.docly-message');
  existingMessages.forEach(msg => msg.remove());
  
  // 创建消息元素
  const messageEl = document.createElement('div');
  messageEl.className = `docly-message message-${type}`;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: opacity 0.3s ease;
  `;
  
  // 根据类型设置背景色
  const colors = {
    success: '#52c41a',
    error: '#ff4d4f',
    warning: '#faad14',
    info: '#1890ff'
  };
  messageEl.style.backgroundColor = colors[type] || colors.info;
  messageEl.textContent = text;
  
  // 添加到页面
  document.body.appendChild(messageEl);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.parentNode.removeChild(messageEl);
    }
  }, 3000);
};

/**
 * 格式化文本
 * @param {string} format - 格式类型 ('bold' | 'italic' | 'underline')
 */
const formatText = (format: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要格式化的文本', 'warning');
    return;
  }

  const formatNames = {
    bold: '粗体',
    italic: '斜体',
    underline: '下划线'
  };

  const success = editorCore.value.execCommand(format);
  const formatName = formatNames[format as keyof typeof formatNames] || format;
  
  if (success) {
    showMessage(`已应用${formatName}格式`, 'success');
  } else {
    showMessage(`${formatName}格式应用失败`, 'error');
  }
};

/**
 * 改变标题级别
 * @param {Event} event - 选择事件
 */
const changeHeading = async (event: Event): Promise<void> => {
  const target = event.target as HTMLSelectElement;
  const level = target.value;
  
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }
  
  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例不可用', 'error');
      return;
    }

    if (level) {
      // 获取当前块的索引
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const currentBlock = editor.blocks.getBlockByIndex(currentBlockIndex);
      
      if (currentBlock) {
         // 获取当前块的文本内容
         const blockData = await currentBlock.save();
         const text = (blockData as any)?.text || '';
         
         // 删除当前块
         editor.blocks.delete(currentBlockIndex);
         
         // 插入新的标题块
         await editor.blocks.insert('header', {
           text: text,
           level: parseInt(level)
         }, {}, currentBlockIndex);
         
         showMessage(`已设置为H${level}标题`, 'success');
       } else {
        // 如果没有当前块，直接插入新的标题块
        await editorCore.value.insertBlock('header', {
          text: '',
          level: parseInt(level)
        });
        showMessage(`已插入H${level}标题`, 'success');
      }
    } else {
      // 转换为正文段落
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const currentBlock = editor.blocks.getBlockByIndex(currentBlockIndex);
      
      if (currentBlock) {
         const blockData = await currentBlock.save();
         const text = (blockData as any)?.text || '';
         
         editor.blocks.delete(currentBlockIndex);
         
         await editor.blocks.insert('paragraph', {
           text: text
         }, {}, currentBlockIndex);
         
         showMessage('已设置为正文', 'success');
       }
    }
  } catch (error) {
    console.error('更改标题级别失败:', error);
    showMessage('更改标题级别失败', 'error');
  }
  
  // 重置选择器
  target.value = '';
};

/**
 * 插入列表
 * @param {string} type - 列表类型 ('ordered' | 'unordered')
 */
const insertList = async (type: string): Promise<void> => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例不可用', 'error');
      return;
    }

    // 获取当前块的索引
    const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
    const currentBlock = editor.blocks.getBlockByIndex(currentBlockIndex);
    
    if (currentBlock) {
      // 获取当前块的文本内容
      const blockData = await currentBlock.save();
      const text = (blockData as any)?.text || '';
      
      // 删除当前块
      editor.blocks.delete(currentBlockIndex);
      
      // 插入新的列表块
      await editor.blocks.insert('list', {
        style: type,
        items: text ? [text] : ['']
      }, {}, currentBlockIndex);
      
      const listTypeName = type === 'ordered' ? '有序列表' : '无序列表';
      showMessage(`已插入${listTypeName}`, 'success');
    } else {
      // 如果没有当前块，直接插入新的列表块
      await editorCore.value.insertBlock('list', {
        style: type,
        items: ['']
      });
      
      const listTypeName = type === 'ordered' ? '有序列表' : '无序列表';
      showMessage(`已插入${listTypeName}`, 'success');
    }
  } catch (error) {
    console.error('插入列表失败:', error);
    showMessage('插入列表失败', 'error');
  }
};

/**
 * 插入链接
 */
const insertLink = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要添加链接的文本', 'warning');
    return;
  }

  const selectedText = selection.toString();
  if (!selectedText) {
    showMessage('请先选择要添加链接的文本', 'warning');
    return;
  }

  const url = prompt('请输入链接地址:', 'https://');
  if (url && url.trim()) {
    const success = editorCore.value.execCommand('createLink', url.trim());
    if (success) {
      showMessage('链接已添加', 'success');
    } else {
      showMessage('添加链接失败', 'error');
    }
  }
};

/**
 * 插入表格
 */
const insertTable = async (): Promise<void> => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    await editorCore.value.insertBlock('table', {
      content: [
        ['', '', ''],
        ['', '', '']
      ]
    });
    showMessage('已插入表格', 'success');
  } catch (error) {
    console.error('插入表格失败:', error);
    showMessage('插入表格失败', 'error');
  }
};

/**
 * 插入引用
 */
const insertQuote = async (): Promise<void> => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例不可用', 'error');
      return;
    }

    // 获取当前块的索引
    const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
    const currentBlock = editor.blocks.getBlockByIndex(currentBlockIndex);
    
    if (currentBlock) {
      // 获取当前块的文本内容
      const blockData = await currentBlock.save();
      const text = (blockData as any)?.text || '';
      
      // 删除当前块
      editor.blocks.delete(currentBlockIndex);
      
      // 插入新的引用块
      await editor.blocks.insert('quote', {
        text: text || '输入引用内容...',
        caption: ''
      }, {}, currentBlockIndex);
      
      showMessage('已插入引用', 'success');
    } else {
      // 如果没有当前块，直接插入新的引用块
      await editorCore.value.insertBlock('quote', {
        text: '输入引用内容...',
        caption: ''
      });
      showMessage('已插入引用', 'success');
    }
  } catch (error) {
    console.error('插入引用失败:', error);
    showMessage('插入引用失败', 'error');
  }
};

/**
 * 撤销操作
 */
const undo = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const success = editorCore.value.execCommand('undo');
  if (success) {
    showMessage('已撤销', 'success');
  } else {
    showMessage('无法撤销', 'warning');
  }
};

/**
 * 重做操作
 */
const redo = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const success = editorCore.value.execCommand('redo');
  if (success) {
    showMessage('已重做', 'success');
  } else {
    showMessage('无法重做', 'warning');
  }
};

/**
 * 设置文本对齐方式
 * @param {string} alignment - 对齐方式 ('left' | 'center' | 'right' | 'justify')
 */
const setAlignment = (alignment: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要对齐的文本', 'warning');
    return;
  }

  const alignmentCommands = {
    left: 'justifyLeft',
    center: 'justifyCenter',
    right: 'justifyRight',
    justify: 'justifyFull'
  };

  const alignmentNames = {
    left: '左对齐',
    center: '居中对齐',
    right: '右对齐',
    justify: '两端对齐'
  };

  const command = alignmentCommands[alignment as keyof typeof alignmentCommands];
  const alignmentName = alignmentNames[alignment as keyof typeof alignmentNames] || alignment;

  if (command) {
    const success = editorCore.value.execCommand(command);
    if (success) {
      showMessage(`已设置为${alignmentName}`, 'success');
    } else {
      showMessage(`${alignmentName}设置失败`, 'error');
    }
  } else {
    showMessage('不支持的对齐方式', 'error');
  }
};

/**
 * 切换只读模式
 */
const toggleReadOnly = (): void => {
  const newReadOnly = !isReadOnly.value;
  editorStore.setReadOnly(newReadOnly);
  showMessage(newReadOnly ? '已切换到只读模式' : '已切换到编辑模式', 'info');
};

/**
 * 切换颜色选择器显示状态
 * @param {string} type - 颜色类型 ('text' | 'background')
 */
const toggleColorPicker = (type: string): void => {
  if (type === 'text') {
    showTextColorPicker.value = !showTextColorPicker.value;
    showBgColorPicker.value = false;
  } else if (type === 'background') {
    showBgColorPicker.value = !showBgColorPicker.value;
    showTextColorPicker.value = false;
  }
};

/**
 * 设置文本颜色
 * @param {string} color - 颜色值
 */
const setTextColor = (color: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要设置颜色的文本', 'warning');
    return;
  }

  const success = editorCore.value.execCommand('foreColor', color);
  if (success) {
    currentTextColor.value = color;
    showMessage('文本颜色设置成功', 'success');
    showTextColorPicker.value = false;
  } else {
    showMessage('文本颜色设置失败', 'error');
  }
};

/**
 * 设置背景颜色
 * @param {string} color - 颜色值
 */
const setBgColor = (color: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要设置背景颜色的文本', 'warning');
    return;
  }

  const success = editorCore.value.execCommand('backColor', color);
  if (success) {
    currentBgColor.value = color;
    showMessage('背景颜色设置成功', 'success');
    showBgColorPicker.value = false;
  } else {
    showMessage('背景颜色设置失败', 'error');
  }
};

/**
 * 获取颜色名称
 * @param {string} color - 颜色值
 * @returns {string} 颜色名称
 */
const getColorName = (color: string): string => {
  const colorNames: Record<string, string> = {
    '#000000': '黑色',
    '#ffffff': '白色',
    '#ff0000': '红色',
    '#00ff00': '绿色',
    '#0000ff': '蓝色',
    '#ffff00': '黄色',
    '#ff00ff': '紫色',
    '#00ffff': '青色',
    '#ffa500': '橙色',
    '#ffc0cb': '粉色',
    '#808080': '灰色',
    '#800000': '深红',
    '#008000': '深绿',
    '#000080': '深蓝',
    '#808000': '橄榄',
    '#800080': '紫红',
    '#008080': '深青',
    '#c0c0c0': '银色',
    '#fff0e6': '浅橙',
    '#fffacc': '浅黄',
    '#eeffee': '浅绿',
    '#e6f0ff': '浅蓝',
    '#f0e6ff': '浅紫',
    '#ffe6f0': '浅粉',
    '#e6ffff': '浅青'
  };
  return colorNames[color] || color;
};

/**
 * 导入文件
 */
const importFile = (): void => {
  fileInputRef.value?.click();
};

/**
 * 导出文件
 */
const exportFile = async (): Promise<void> => {
  await handleExport();
};

/**
 * 检查格式是否激活
 * @param {string} format - 格式类型
 * @returns {boolean} 是否激活
 */
const isFormatActive = (format: string): boolean => {
  if (!editorCore.value) return false;
  
  try {
    return document.queryCommandState(format);
  } catch (error) {
    return false;
  }
};

/**
 * 应用文本颜色
 * @param {string} color - 颜色值
 */
const applyTextColor = (color: string): void => {
  setTextColor(color);
};

/**
 * 应用背景颜色
 * @param {string} color - 颜色值
 */
const applyBgColor = (color: string): void => {
  setBgColor(color);
};

/**
 * 显示悬浮提示
 * @param event - 鼠标事件
 * @param text - 提示文本
 */
const showTooltip = (event: MouseEvent, text: string): void => {
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  
  tooltip.value = {
    visible: true,
    text,
    x: rect.left + rect.width / 2,
    y: rect.bottom + 8
  };
};

/**
 * 隐藏悬浮提示
 */
const hideTooltip = (): void => {
  tooltip.value.visible = false;
};

/**
 * 切换批注模式
 */
const toggleAnnotationMode = (): void => {
  isAnnotationMode.value = !isAnnotationMode.value;
  if (isAnnotationMode.value) {
    showMessage('批注模式已开启，请选择文本添加批注', 'info');
  } else {
    showMessage('批注模式已关闭', 'info');
  }
};

/**
 * 显示批注列表
 */
const showAnnotationList = (): void => {
  showAnnotationPanel.value = !showAnnotationPanel.value;
  if (showAnnotationPanel.value) {
    showMessage('批注列表已打开', 'info');
  } else {
    showMessage('批注列表已关闭', 'info');
  }
};

/**
 * 创建批注
 * @param {string} selectedText - 选中的文本
 * @param {string} content - 批注内容
 */
const createAnnotation = (selectedText: string, content: string): void => {
  if (!selectedText.trim() || !content.trim()) {
    showMessage('请选择文本并输入批注内容', 'warning');
    return;
  }

  const annotation = {
    id: `annotation-${Date.now()}`,
    text: selectedText,
    content: content,
    author: '当前用户', // 可以从用户系统获取
    timestamp: Date.now(),
    position: {
      startOffset: 0, // 需要根据实际选择位置计算
      endOffset: selectedText.length,
      blockId: 'current-block' // 需要获取当前块ID
    },
    resolved: false
  };

  annotations.value.push(annotation);
  showMessage('批注已添加', 'success');
  
  // 关闭批注模式
  isAnnotationMode.value = false;
};

/**
 * 删除批注
 * @param {string} annotationId - 批注ID
 */
const deleteAnnotation = (annotationId: string): void => {
  const index = annotations.value.findIndex(a => a.id === annotationId);
  if (index > -1) {
    annotations.value.splice(index, 1);
    showMessage('批注已删除', 'success');
  }
};

/**
  * 标记批注为已解决
  * @param {string} annotationId - 批注ID
  */
 const resolveAnnotation = (annotationId: string): void => {
   const annotation = annotations.value.find(a => a.id === annotationId);
   if (annotation) {
     annotation.resolved = !annotation.resolved;
     showMessage(annotation.resolved ? '批注已标记为已解决' : '批注已标记为未解决', 'success');
   }
 };

/**
  * 取消批注创建/编辑
  */
 const cancelAnnotation = (): void => {
   selectedText.value = '';
   annotationInput.value = '';
   selectedAnnotation.value = null;
   isAnnotationMode.value = false;
 };

/**
  * 确认创建批注
  */
 const confirmAnnotation = (): void => {
   if (selectedText.value && annotationInput.value.trim()) {
     if (selectedAnnotation.value) {
       // 更新现有批注
       updateAnnotation(selectedAnnotation.value, annotationInput.value);
       selectedAnnotation.value = null;
     } else {
       // 创建新批注
       createAnnotation(selectedText.value, annotationInput.value);
     }
     selectedText.value = '';
     annotationInput.value = '';
   } else {
     showMessage('请输入批注内容', 'warning');
   }
 };

/**
  * 处理文本选择事件
  */
 const handleTextSelection = (): void => {
   if (!isAnnotationMode.value) return;
   
   const selection = window.getSelection();
   if (selection && selection.toString().trim()) {
     selectedText.value = selection.toString().trim();
   }
 };

/**
 * 编辑批注
 * @param {string} annotationId - 批注ID
 */
const editAnnotation = (annotationId: string): void => {
  const annotation = annotations.value.find(a => a.id === annotationId);
  if (annotation) {
    selectedAnnotation.value = annotationId;
    annotationInput.value = annotation.content;
    selectedText.value = annotation.text;
    isAnnotationMode.value = true;
    showMessage('编辑模式已开启', 'info');
  }
};

/**
 * 更新批注内容
 * @param {string} annotationId - 批注ID
 * @param {string} newContent - 新的批注内容
 */
const updateAnnotation = (annotationId: string, newContent: string): void => {
  const annotation = annotations.value.find(a => a.id === annotationId);
  if (annotation && newContent.trim()) {
    annotation.content = newContent.trim();
    annotation.timestamp = Date.now(); // 更新时间戳
    showMessage('批注已更新', 'success');
  }
};

/**
 * 批量删除已解决的批注
 */
const deleteResolvedAnnotations = (): void => {
  const resolvedCount = annotations.value.filter(a => a.resolved).length;
  if (resolvedCount === 0) {
    showMessage('没有已解决的批注', 'info');
    return;
  }
  
  annotations.value = annotations.value.filter(a => !a.resolved);
  showMessage(`已删除 ${resolvedCount} 个已解决的批注`, 'success');
};

/**
 * 导出批注数据
 */
const exportAnnotations = (): void => {
  if (annotations.value.length === 0) {
    showMessage('没有批注可导出', 'info');
    return;
  }
  
  const exportData = {
    annotations: annotations.value,
    exportTime: new Date().toISOString(),
    totalCount: annotations.value.length,
    resolvedCount: annotations.value.filter(a => a.resolved).length
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `annotations-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showMessage('批注数据已导出', 'success');
};

// 生命周期
onMounted(() => {
  console.log('DoclyEditor onMounted 钩子被调用');
  
  // 初始化系统主题检测
  systemThemeQuery.value = detectSystemTheme();
  if (systemThemeQuery.value) {
    systemThemeQuery.value.addEventListener('change', handleThemeChange);
  }
  
  initEditor();
});

onUnmounted(() => {
  // 清理主题监听器
  if (systemThemeQuery.value) {
    systemThemeQuery.value.removeEventListener('change', handleThemeChange);
  }
  
  if (editorCore.value) {
    editorCore.value.destroy();
  }
  editorStore.clearAll();
});
</script>

<style scoped>
.docly-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.docly-toolbar {
  padding: 6px 12px;
  background: linear-gradient(to bottom, #f8f9fa 0%, #f1f3f4 100%);
  border-bottom: 1px solid #dadce0;
  overflow-x: auto;
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-height: 42px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

/* 工具栏区域布局优化 */
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  border-right: 1px solid #e8eaed;
  padding-right: 6px;
  margin-right: 6px;
  overflow: visible;
}

.toolbar-section:last-child {
  border-right: none;
  padding-right: 0;
  margin-right: 0;
}

/* 按钮组布局优化 */
.button-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 1px;
  align-items: center;
  border: 1px solid #dadce0;
  border-radius: 3px;
  overflow: hidden;
}

.button-group .toolbar-btn {
  border: none;
  border-radius: 0;
  border-right: 1px solid #e8eaed;
}

.button-group .toolbar-btn:last-child {
  border-right: none;
}

.button-group .toolbar-btn:hover {
  background: rgba(26, 115, 232, 0.08);
  border-color: transparent;
}

.button-group .toolbar-btn.active {
  background: rgba(26, 115, 232, 0.12);
  color: #1a73e8;
  border-color: transparent;
}

/* 颜色选择器特殊处理 */
.color-picker-wrapper {
  position: relative;
  flex-shrink: 0;
}

.color-btn {
  position: relative;
  padding: 5px 8px;
  min-width: 32px;
}

.color-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 3px;
  border-radius: 1px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.bg-indicator {
  bottom: 4px;
  height: 2px;
}

/* 选择框样式优化 */
.compact-select {
  padding: 4px 20px 4px 8px;
  border: 1px solid #dadce0;
  border-radius: 3px;
  background-color: white;
  color: #3c4043;
  font-size: 12px;
  height: 28px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  min-width: 80px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: calc(100% - 6px) center;
  background-size: 12px 12px;
  background-attachment: scroll;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.compact-select:hover {
  border-color: #1a73e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.compact-select:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

/* 响应式布局优化 */
@media (max-width: 1200px) {
  .docly-toolbar {
    padding: 5px 10px;
    gap: 5px;
  }
  
  .toolbar-section {
    gap: 2px;
    padding-right: 5px;
    margin-right: 5px;
  }
  
  .compact-select {
    min-width: 75px;
    font-size: 11px;
  }
}

@media (max-width: 992px) {
  .docly-toolbar {
    padding: 4px 8px;
    gap: 4px;
    min-height: 40px;
  }
  
  .toolbar-section {
    gap: 2px;
    padding-right: 4px;
    margin-right: 4px;
  }
  
  .toolbar-btn {
    padding: 4px 6px;
    font-size: 11px;
    min-width: 26px;
    height: 26px;
  }
  
  .compact-select {
    font-size: 11px;
    height: 26px;
    padding: 3px 18px 3px 6px;
    min-width: 70px;
  }
}

@media (max-width: 768px) {
  .docly-toolbar {
    padding: 4px 8px;
    gap: 4px;
    flex-wrap: wrap;
    min-height: 38px;
  }
  
  .toolbar-section {
    gap: 2px;
    padding-right: 4px;
    margin-right: 4px;
    border-right: none;
    margin-bottom: 2px;
  }
  
  .toolbar-btn {
    padding: 3px 6px;
    font-size: 11px;
    min-width: 24px;
    height: 24px;
  }
  
  .compact-select {
    font-size: 11px;
    height: 24px;
    padding: 2px 16px 2px 6px;
    min-width: 70px;
  }
  
  .color-indicator {
    width: 14px;
    height: 2px;
  }
  
  /* 移动端隐藏部分功能 */
  .toolbar-section:nth-child(n+6) {
    display: none;
  }
}

@media (max-width: 576px) {
  .docly-toolbar {
    padding: 3px 6px;
    gap: 3px;
    min-height: 36px;
    flex-wrap: wrap;
  }
  
  .toolbar-section {
    gap: 1px;
    padding-right: 3px;
    margin-right: 3px;
    border-right: none;
    margin-bottom: 2px;
  }
  
  .toolbar-btn {
    padding: 2px 4px;
    font-size: 10px;
    min-width: 22px;
    height: 22px;
  }
  
  .toolbar-btn svg {
    width: 12px;
    height: 12px;
  }
  
  .compact-select {
    font-size: 10px;
    height: 22px;
    padding: 1px 14px 1px 4px;
    min-width: 60px;
  }
  
  .color-indicator {
    width: 12px;
    height: 2px;
  }
  
  /* 小屏幕只显示核心功能 */
  .toolbar-section:nth-child(n+5) {
    display: none;
  }
}

@media (max-width: 480px) {
  .docly-toolbar {
    padding: 3px 6px;
    gap: 3px;
    min-height: 36px;
  }
  
  .toolbar-section {
    gap: 1px;
    padding-right: 3px;
    margin-right: 3px;
  }
  
  .toolbar-btn {
    padding: 2px 4px;
    font-size: 10px;
    min-width: 22px;
    height: 22px;
  }
  
  .toolbar-btn svg {
    width: 12px;
    height: 12px;
  }
  
  .compact-select {
    font-size: 10px;
    height: 22px;
    padding: 1px 14px 1px 4px;
    min-width: 60px;
  }
  
  /* 超小屏幕只显示最核心功能 */
  .toolbar-section:nth-child(n+4) {
    display: none;
  }
}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .docly-toolbar {
    padding: 2px 8px;
    min-height: 32px;
  }
  
  .toolbar-btn {
    padding: 2px 4px;
    height: 20px;
    min-width: 20px;
  }
  
  .compact-select {
    height: 20px;
    font-size: 10px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .toolbar-btn {
    min-width: 32px;
    height: 32px;
    padding: 6px;
  }
  
  .toolbar-btn:hover {
    background: rgba(26, 115, 232, 0.08);
  }
  
  .toolbar-btn:active {
    background: rgba(26, 115, 232, 0.16);
    transform: scale(0.95);
  }
  
  .compact-select {
    height: 32px;
    padding: 6px 24px 6px 8px;
    font-size: 12px;
  }
  
  .color-preset {
    width: 28px;
    height: 28px;
  }
}

/* 高分辨率屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .toolbar-btn svg {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  
  .color-indicator {
    border-width: 0.5px;
  }
}

/* 暗色模式支持 - 优化版本 */
.docly-editor.dark-theme {
  background: #1e1e1e;
  border-color: #404040;
  color: #e0e0e0;
}

.docly-editor.dark-theme .docly-toolbar {
  background: linear-gradient(to bottom, #2d2d2d 0%, #262626 100%);
  border-bottom-color: #404040;
  color: #e0e0e0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.docly-editor.dark-theme .toolbar-section {
  border-right-color: #404040;
}

.docly-editor.dark-theme .toolbar-btn {
  color: #e0e0e0;
  border-color: #404040;
  background: transparent;
}

.docly-editor.dark-theme .toolbar-btn:hover {
  background: rgba(66, 133, 244, 0.15);
  border-color: #4285f4;
  color: #ffffff;
}

.docly-editor.dark-theme .toolbar-btn.active {
  background: rgba(66, 133, 244, 0.25);
  color: #4285f4;
  border-color: #4285f4;
}

.docly-editor.dark-theme .button-group {
  border-color: #404040;
}

.docly-editor.dark-theme .button-group .toolbar-btn {
  border-right-color: #404040;
}

.docly-editor.dark-theme .button-group .toolbar-btn:hover {
  background: rgba(66, 133, 244, 0.15);
  border-color: transparent;
}

.docly-editor.dark-theme .button-group .toolbar-btn.active {
  background: rgba(66, 133, 244, 0.25);
  color: #4285f4;
  border-color: transparent;
}

.docly-editor.dark-theme .compact-select {
  background-color: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23e0e0e0' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: calc(100% - 6px) center;
  background-size: 12px 12px;
  background-attachment: scroll;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.docly-editor.dark-theme .compact-select:hover {
  border-color: #4285f4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.docly-editor.dark-theme .compact-select:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
}

.docly-editor.dark-theme .color-picker-panel {
  background: #2d2d2d;
  border-color: #404040;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.docly-editor.dark-theme .color-preset {
  border-color: #404040;
}

.docly-editor.dark-theme .color-preset:hover {
  border-color: #4285f4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.docly-editor.dark-theme .custom-color-input {
  border-color: #404040;
  background: #2d2d2d;
}

.docly-editor.dark-theme .custom-color-input:hover {
  border-color: #4285f4;
}

.docly-editor.dark-theme .docly-editor-container {
  background: #1e1e1e;
}

.docly-editor.dark-theme .docly-statusbar {
  background: #2d2d2d;
  border-top-color: #404040;
  color: #e0e0e0;
}

.docly-editor.dark-theme .status-item {
  color: #e0e0e0;
}

.docly-editor.dark-theme .unsaved-indicator {
  color: #ff6b6b;
}

/* 工具提示在暗色模式下的样式 */
.docly-editor.dark-theme .toolbar-btn[title]:hover::after {
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
}

/* 颜色指示器在暗色模式下的样式 */
.docly-editor.dark-theme .color-indicator {
  border-color: rgba(255, 255, 255, 0.2);
}

/* 编辑器内容区域暗色模式 */
.docly-editor.dark-theme .docly-editor-holder {
  background: #1e1e1e;
  color: #e0e0e0;
}

/* 滚动条在暗色模式下的样式 */
.docly-editor.dark-theme .docly-toolbar::-webkit-scrollbar {
  height: 6px;
}

.docly-editor.dark-theme .docly-toolbar::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.docly-editor.dark-theme .docly-toolbar::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 3px;
}

.docly-editor.dark-theme .docly-toolbar::-webkit-scrollbar-thumb:hover {
  background: #4285f4;
}

@media (prefers-color-scheme: dark) {
  .docly-toolbar {
    background: linear-gradient(to bottom, #2d2d2d 0%, #262626 100%);
    border-bottom-color: #404040;
    color: #e0e0e0;
  }
  
  .toolbar-section {
    border-right-color: #404040;
  }
  
  .toolbar-btn {
    color: #e0e0e0;
    border-color: #404040;
  }
  
  .toolbar-btn:hover {
    background: rgba(66, 133, 244, 0.12);
    border-color: #4285f4;
  }
  
  .compact-select {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }
  
  .color-picker-panel {
    background: #2d2d2d;
    border-color: #404040;
  }
}

/* 减少动画效果（用户偏好） */
@media (prefers-reduced-motion: reduce) {
  .toolbar-btn,
  .compact-select,
  .color-preset,
  .custom-color-input {
    transition: none;
  }
  
  .toolbar-btn[title]:hover::after {
    animation: none;
  }
}

/* 颜色选择器面板优化 */
.color-picker-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  margin-top: 2px;
}

.color-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
  position: relative;
  z-index: 9999;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid #dadce0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-preset:hover {
  transform: scale(1.05);
  border-color: #1a73e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.custom-color-input {
  width: 100%;
  height: 32px;
  border: 1px solid #dadce0;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.custom-color-input:hover {
  border-color: #1a73e8;
}

.custom-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.custom-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}
/* 工具提示样式 */
.toolbar-btn[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: -32px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 按钮交互反馈 */
.toolbar-btn {
  position: relative;
  overflow: hidden;
}

.toolbar-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(26, 115, 232, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
  pointer-events: none;
}

.toolbar-btn:active::before {
  width: 100px;
  height: 100px;
}

/* 选择框交互反馈 */
.compact-select {
  position: relative;
  overflow: hidden;
}

.compact-select::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(26, 115, 232, 0.1), transparent);
  transition: left 0.5s ease;
}

.compact-select:focus::after {
  left: 100%;
}

/* 颜色选择器交互反馈 */
.color-picker-wrapper {
  position: relative;
}

.color-picker-wrapper::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #1a73e8, #4285f4, #1a73e8);
  border-radius: 4px;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.color-picker-wrapper:hover::before {
  opacity: 0.3;
}

/* 状态指示器 */
.toolbar-btn.loading {
  pointer-events: none;
  opacity: 0.6;
}

.toolbar-btn.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 2px solid transparent;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 成功状态反馈 */
.toolbar-btn.success {
  background: rgba(52, 168, 83, 0.1);
  border-color: #34a853;
  color: #34a853;
}

.toolbar-btn.success::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: bold;
  animation: checkmark 0.5s ease-in-out;
}

@keyframes checkmark {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 错误状态反馈 */
.toolbar-btn.error {
  background: rgba(234, 67, 53, 0.1);
  border-color: #ea4335;
  color: #ea4335;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* 焦点指示器 */
.toolbar-btn:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.2);
}

.compact-select:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.2);
}

/* 禁用状态 */
.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.compact-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: #f5f5f5;
}

/* 工具栏分组动画 */
.toolbar-section {
  transition: all 0.3s ease;
}

.toolbar-section:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 颜色选择器面板动画 */
.color-picker-panel {
  transform: translateY(-10px);
  opacity: 0;
  animation: slideDown 0.2s ease forwards;
}

@keyframes slideDown {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 颜色预设悬停效果 */
.color-preset {
  position: relative;
}

.color-preset::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid transparent;
  border-radius: 5px;
  transition: border-color 0.2s ease;
}

.color-preset:hover::before {
  border-color: #1a73e8;
}

/* 键盘导航支持 */
.toolbar-btn:focus,
.compact-select:focus {
  z-index: 1;
}

/* 自定义悬浮提示样式 */
.custom-tooltip {
  position: fixed;
  background: #666;
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  transform: translateX(-50%);
  margin-top: 8px;
}

/* 暗色模式下的悬浮提示 */
.docly-editor.dark-theme .custom-tooltip {
  background: #999;
  color: #333;
}

/* 批注侧边栏样式 */
.annotation-sidebar {
  position: fixed;
  right: 0;
  top: 60px;
  width: 350px;
  height: calc(100vh - 100px);
  background: white;
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateX(0);
  transition: transform 0.3s ease;
}

.annotation-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.annotation-sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.sidebar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn.small {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.small:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #ccc;
}

.action-btn.small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.annotation-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.annotation-item {
  padding: 16px;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  margin-bottom: 12px;
  background: white;
  transition: all 0.2s ease;
}

.annotation-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #dadce0;
}

.annotation-item.resolved {
  opacity: 0.7;
  background: #f8f9fa;
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.annotation-author {
  font-weight: 600;
  font-size: 13px;
  color: #1a73e8;
}

.annotation-time {
  font-size: 11px;
  color: #666;
}

.annotation-text {
  font-size: 12px;
  color: #333;
  margin-bottom: 8px;
  padding: 8px;
  background: #f1f3f4;
  border-radius: 6px;
  border-left: 3px solid #1a73e8;
}

.annotation-content {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 12px;
}

.annotation-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f8f9fa;
}

.action-btn.resolved {
  background: #e8f0fe;
  color: #1a73e8;
  border-color: #1a73e8;
}

.action-btn.delete {
  color: #d93025;
  border-color: #d93025;
}

.action-btn.delete:hover {
  background: #fce8e6;
}

.no-annotations {
  text-align: center;
  color: #666;
  font-size: 14px;
  padding: 40px 20px;
  font-style: italic;
}

/* 批注创建弹窗样式 */
.annotation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.annotation-modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.annotation-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.annotation-modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.selected-text {
  padding: 16px 20px;
  background: #f1f3f4;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  color: #333;
}

.annotation-textarea {
  width: 100%;
  padding: 16px 20px;
  border: none;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  min-height: 100px;
}

.annotation-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: white;
  color: #333;
}

.btn-cancel:hover {
  background: #f8f9fa;
}

.btn-confirm {
  background: #1a73e8;
  color: white;
  border-color: #1a73e8;
}

.btn-confirm:hover {
  background: #1557b0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .annotation-panel {
    right: 10px;
    width: 280px;
    top: 80px;
  }
  
  .annotation-modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>