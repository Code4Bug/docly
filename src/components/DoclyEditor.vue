<template>
  <div class="docly-editor" :class="{ 'dark-theme': isDarkMode }">
    <!-- 工具栏组件 -->
    <EditorToolbar
      :current-heading="currentHeading"
      :current-alignment="currentAlignment"
      :current-text-color="currentTextColor"
      :current-bg-color="currentBgColor"
      :is-exporting="isExporting"
      :annotation-mode="isAnnotationMode"
      :show-annotation-panel="showAnnotationPanel"
      :read-only="readOnly"
      @import-file="importFile"
      @export-file="exportFile"
      @undo="undo"
      @redo="redo"
      @change-heading="changeHeading"
      @format-text="formatText"
      @set-alignment="setAlignment"
      @text-color-change="applyTextColor"
      @bg-color-change="applyBgColor"
      :current-font-family="currentFontFamily"
      :current-font-size="currentFontSize"
      @font-family-change="applyFontFamily"
      @font-size-change="applyFontSize"
      @font-style-change="handleFontStyleChange"
      @insert-list="insertList"
      @insert-link="insertLink"
      @insert-table="insertTable"
      @insert-quote="insertQuote"
      @toggle-annotation-mode="toggleAnnotationMode"
      @show-annotation-list="showAnnotationList"
    />

    <!-- 编辑器容器 -->
    <div class="docly-editor-container" :class="{ 'with-sidebar': showAnnotationPanel }">
      <div class="docly-elditor-wrapper">
        <div 
          class="docly-editor-holder" 
          ref="editorRef"
          @mouseup="handleTextSelection"
        ></div>
      </div>
      
      <!-- 批注系统 -->
      <AnnotationSystem
        :show-sidebar="showAnnotationPanel"
        :show-create-modal="isAnnotationMode && !!selectedText"
        :annotations="annotations"
        :selected-text="selectedText"
        :is-dark-theme="isDarkTheme"
        @close-sidebar="showAnnotationPanel = false"
        @delete-resolved="deleteResolvedAnnotations"
        @export-annotations="exportAnnotations"
        @edit-annotation="editAnnotation"
        @resolve-annotation="resolveAnnotation"
        @delete-annotation="deleteAnnotation"
        @cancel-annotation="cancelAnnotation"
        @confirm-annotation="confirmAnnotation"
      />
    </div>

    <!-- 状态栏 -->
    <EditorStatusBar
      :is-saved="isSaved"
      :char-count="charCount"
      :is-read-only="isReadOnly"
      :is-annotation-mode="isAnnotationMode"
      :is-exporting="isExporting"
      :is-dark-theme="isDarkTheme"
      :editor-content="editorContent"
      @toggle-readonly="toggleReadOnly"
    />

    <!-- 隐藏的文件输入元素 -->
    <input 
      ref="fileInputRef"
      type="file" 
      accept=".docx,.doc" 
      @change="handleImport"
      style="display: none;"
    />

    <!-- 快捷键面板 -->
    <Teleport to="body">
      <div 
        v-if="isShortcutPanelVisible" 
        class="shortcut-panel-overlay"
        @click.self="hideShortcutPanel"
      >
        <div class="shortcut-panel-container">
          <div class="shortcut-panel" :class="{ 'dark-theme': isDarkTheme }">
            <!-- 面板头部 -->
            <div class="panel-header">
              <div class="header-left">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12M22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12M10,17L6,13L7.41,11.58L10,14.17L16.59,7.58L18,9L10,17Z" />
                </svg>
                <h3>快捷键设置</h3>
              </div>
              <div class="header-actions">
                <button @click="hideShortcutPanel" class="close-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
            </div>
            <!-- 简化的快捷键列表 -->
            <div class="panel-content">
              <div class="shortcut-info">
                <p>按 <kbd>Ctrl</kbd> + <kbd>/</kbd> 显示/隐藏此面板</p>
                <p>快捷键系统已启用，您可以使用以下快捷键：</p>
                <ul>
                  <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - 保存文档</li>
                  <li><kbd>Ctrl</kbd> + <kbd>O</kbd> - 导入文档</li>
                  <li><kbd>Ctrl</kbd> + <kbd>E</kbd> - 导出文档</li>
                  <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - 撤销</li>
                  <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> - 重做</li>
                  <li><kbd>Ctrl</kbd> + <kbd>B</kbd> - 粗体</li>
                  <li><kbd>Ctrl</kbd> + <kbd>I</kbd> - 斜体</li>
                  <li><kbd>Ctrl</kbd> + <kbd>K</kbd> - 插入链接</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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
import { TiptapCore } from '../core/TiptapCore';
import { PluginManager } from '../plugins/PluginManager';
import { WordHandler } from '../fileHandlers/WordHandler';
import { useEditorStore } from '../stores/editorStore';
import { useShortcuts } from '../composables/useShortcuts';
import EditorToolbar from './EditorToolbar.vue';
import AnnotationSystem from './AnnotationSystem.vue';
import EditorStatusBar from './EditorStatusBar.vue';
import type { EditorConfig } from '../types';
import { showMessage } from '../utils/Message';
import { Annotation } from './AnnotationSystem.vue';
import { Console } from '../utils/Console';

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
const editorCore = ref<TiptapCore>();
const pluginManager = ref<PluginManager>();
const wordHandler = ref<WordHandler>();
const isExporting = ref(false);

// 新增的响应式数据
const currentAlignment = ref('left');
const currentHeading = ref('');
const isSaved = ref(true);
const charCount = ref(0);

const currentTextColor = ref('#000000');
const currentBgColor = ref('#ffffff');
const currentFontFamily = ref('Arial, sans-serif');
const currentFontSize = ref('10.5pt');

// 悬浮提示相关状态
const tooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0
});

// 批注相关状态
const isAnnotationMode = ref(false);
const annotations = ref<Array<Annotation>>([]);
const showAnnotationPanel = ref(false);
const selectedAnnotation = ref<string | null>(null);
const annotationInput = ref('');
const selectedText = ref('');

// Store
const editorStore = useEditorStore();

// 快捷键系统
const {
  isShortcutPanelVisible,
  registerEditorShortcuts,
  hideShortcutPanel,
  showShortcutPanel,
  toggleShortcutPanel
} = useShortcuts();

// 主题相关的响应式数据
const isDarkMode = ref(false);
const systemThemeQuery = ref<MediaQueryList | null>(null);

// 编辑器内容和导出状态
const editorContent = ref('');

// 计算属性
const isDarkTheme = computed(() => isDarkMode.value);

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
  updateEditorTheme();
};

/**
 * 更新编辑器主题
 */
const updateEditorTheme = (): void => {
  if (editorCore.value) {
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

const isReadOnly = computed(() => editorStore.isReadOnly);

/**
 * 初始化编辑器
 */
const initEditor = async (): Promise<void> => {
  if (!editorRef.value) return;

  try {
    Console.debug('开始初始化编辑器...');
    
    // 初始化插件管理器
    pluginManager.value = new PluginManager();
    Console.debug('插件管理器初始化完成');
    
    // 初始化文件处理器
    wordHandler.value = new WordHandler();
    Console.debug('文件处理器初始化完成');
    
    // 初始化编辑器核心
    Console.debug('创建编辑器核心实例...');
    editorCore.value = new TiptapCore({
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
    Console.debug('编辑器核心实例创建完成');
    
    Console.debug('调用编辑器核心初始化...');
    await editorCore.value.init();
    Console.debug('编辑器核心初始化完成');
    
    // 监听编辑器内容变化
    editorCore.value.on('change', async () => {
      try {
        Console.debug('编辑器内容发生变化，开始更新统计数据...');
        const data = await editorCore.value!.save();
        Console.debug('获取到编辑器数据:', data);
        
        // 将编辑器数据转换为HTML内容用于统计
        let htmlContent = '';
        data.blocks.forEach(block => {
          Console.debug('处理块:', block);
          if (block.type === 'paragraph' && block.data?.text) {
            htmlContent += `<p>${block.data.text}</p>`;
          } else if (block.type === 'header' && block.data?.text) {
            const level = block.data.level || 1;
            htmlContent += `<h${level}>${block.data.text}</h${level}>`;
          } else if (block.type === 'list' && block.data?.items) {
            const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
            htmlContent += `<${tag}>`;
            block.data.items.forEach((item: string) => {
              htmlContent += `<li>${item}</li>`;
            });
            htmlContent += `</${tag}>`;
          } else if (block.data?.text) {
            htmlContent += `<div>${block.data.text}</div>`;
          }
        });
        
        Console.debug('生成的HTML内容:', htmlContent);
        editorContent.value = htmlContent;
        
        // 更新字符数统计
        const textContent = htmlContent.replace(/<[^>]*>/g, '');
        charCount.value = textContent.length;
        Console.debug('更新后的统计数据 - editorContent:', editorContent.value, 'charCount:', charCount.value);
        
        // 标记为未保存
        isSaved.value = false;
      } catch (error) {
        Console.error('更新编辑器内容失败:', error);
      }
    });
    
    Console.debug('设置编辑器实例到 store...');
    editorStore.setEditorInstance(editorCore.value);
    Console.debug('编辑器实例设置完成，当前实例:', editorStore.editorInstance);
    
    // 应用初始主题
    updateEditorTheme();
    
    // 注册编辑器快捷键
    registerEditorShortcuts({
      importFile,
      exportFile: handleExport,
      save: () => editorStore.saveDocument(),
      undo,
      redo,
      bold: () => formatText('bold'),
      italic: () => formatText('italic'),
      underline: () => formatText('underline'),
      insertLink,
      insertTable,
      insertList,
      insertQuote,
      toggleTheme: () => {
        isDarkMode.value = !isDarkMode.value;
        updateEditorTheme();
      },
      toggleAnnotationMode,
      showAnnotationList
    });
    
    // 初始化完成后立即保存数据到 store
    setTimeout(async () => {
      try {
        await editorStore.saveDocument();
      } catch (error) {
        console.warn('初始数据保存失败:', error);
      }
    }, 1000);
    
  } catch (error) {
    Console.error('编辑器初始化失败，详细错误:', error);
    Console.error('错误堆栈:', (error as Error).stack);
    showMessage('编辑器初始化失败', 'error');
  }
};

/**
 * 处理导出
 */
const handleExport = async (): Promise<void> => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化，请稍后再试', 'error');
    return;
  }

  if (!wordHandler.value) {
    showMessage('文件处理器未初始化，请稍后再试', 'error');
    return;
  }

  isExporting.value = true;
  try {
    const currentEditorData = await editorCore.value.save();
    Console.debug('准备导出的数据:', currentEditorData);
    
    if (!currentEditorData || !currentEditorData.blocks || currentEditorData.blocks.length === 0) {
      showMessage('没有内容可导出，请先添加一些内容', 'warn');
      return;
    }
    
    const fileResult = await wordHandler.value.export(currentEditorData);
    
    const url = URL.createObjectURL(fileResult.blob); 
    const a = document.createElement('a');
    a.href = url;
    a.download = fileResult.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('文档导出成功', 'success');
  } catch (error) {
    Console.error('导出失败:', error);
    showMessage(`文档导出失败: ${(error as Error).message || '未知错误'}`, 'error');
  } finally {
    isExporting.value = false;
  }
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
      wordHandler.value = new WordHandler();
    } catch (error) {
      Console.error('wordHandler初始化失败:', error);
      showMessage('文件处理器初始化失败', 'error');
      return;
    }
  }

  if (!file.name.toLowerCase().endsWith('.docx')) {
    showMessage('仅支持 .docx 格式的Word文件', 'error');
    return;
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showMessage('文件大小不能超过10MB', 'error');
    return;
  }

  try {
    showMessage('正在导入文档，请稍候...', 'info');
    
    const editorData = await wordHandler.value.import(file);
    
    annotations.value = [];
    Console.debug('已清空现有批注');
    
    if (editorData.comments && editorData.comments.length > 0) {
      editorData.comments.forEach((comment: any, index: number) => {
        annotations.value.push({
          id: comment.id || `imported_${Date.now()}_${index}`,
          content: comment.content,
          author: comment.author || comment.user || '文档作者',
          user: comment.user || comment.author || '文档作者',
          text: comment.range?.text || comment.content.substring(0, 50),
          timestamp: typeof comment.timestamp === 'number' ? comment.timestamp : Date.now(),
          resolved: false,
          range: comment.range || { startOffset: 0, endOffset: 0, text: comment.content.substring(0, 50) }
        });
      });
    }
    
    if (editorCore.value) {
      await editorCore.value.render(editorData);
      showMessage('文档导入成功', 'success');
    }
    
    target.value = '';
  } catch (error) {
    Console.error('导入失败:', error);
    showMessage(`文档导入失败: ${(error as Error).message || '未知错误'}`, 'error');
  }
};

/**
 * 格式化文本
 * @param {string} format - 格式类型
 */
const formatText = (format: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    editorCore.value.formatText(format);
    const formatNames = {
      bold: '粗体',
      italic: '斜体',
      underline: '下划线',
      strike: '删除线',
      code: '代码',
      highlight: '高亮'
    };
    const formatName = formatNames[format as keyof typeof formatNames] || format;
    showMessage(`已应用${formatName}格式`, 'success');
  } catch (error) {
    Console.error('格式化文本失败:', error);
    showMessage('格式化文本失败', 'error');
  }
};

/**
 * 改变标题级别
 * @param {string} level - 标题级别
 */
const changeHeading = (level: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }
  
  try {
    if (level) {
      editorCore.value.insertBlock('header', {
        level: parseInt(level)
      });
      showMessage(`已设置为H${level}标题`, 'success');
    } else {
      editorCore.value.insertBlock('paragraph', {
        text: ''
      });
      showMessage('已设置为正文', 'success');
    }
  } catch (error) {
    Console.error('更改标题级别失败:', error);
    showMessage('更改标题级别失败', 'error');
  }
};

/**
 * 插入列表
 * @param {string} type - 列表类型
 */
const insertList = (type: string): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    editorCore.value.insertBlock('list', {
      style: type,
      items: ['']
    });
    
    const listTypeName = type === 'ordered' ? '有序列表' : '无序列表';
    showMessage(`已插入${listTypeName}`, 'success');
  } catch (error) {
    Console.error('插入列表失败:', error);
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

  const url = prompt('请输入链接地址:');
  if (url && url.trim()) {
    try {
      const editor = editorCore.value.getEditor();
      if (editor) {
        editor.chain().focus().setLink({ href: url.trim() }).run();
        showMessage('链接插入成功', 'success');
      }
    } catch (error) {
      Console.error('插入链接失败:', error);
      showMessage('插入链接失败', 'error');
    }
  }
};

/**
 * 插入表格
 */
const insertTable = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      showMessage('表格插入成功', 'success');
    }
  } catch (error) {
    Console.error('插入表格失败:', error);
    showMessage('插入表格失败', 'error');
  }
};

/**
 * 插入引用
 */
const insertQuote = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    editorCore.value.insertBlock('quote', {});
    showMessage('引用块插入成功', 'success');
  } catch (error) {
    Console.error('插入引用失败:', error);
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

  try {
    const success = editorCore.value.undo();
    if (success) {
      showMessage('撤销成功', 'success');
    } else {
      showMessage('没有可撤销的操作', 'warn');
    }
  } catch (error) {
    Console.error('撤销失败:', error);
    showMessage('撤销失败', 'error');
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

  try {
    const success = editorCore.value.redo();
    if (success) {
      showMessage('重做成功', 'success');
    } else {
      showMessage('没有可重做的操作', 'warn');
    }
  } catch (error) {
    Console.error('重做失败:', error);
    showMessage('重做失败', 'error');
  }
};

/**
 * 设置对齐方式
 */
const setAlignment = (alignment: string): void => {
  currentAlignment.value = alignment;
  
  // 调用编辑器核心的对齐方法
  if (editorCore.value) {
    editorCore.value.setTextAlign(alignment);
  }
  
  showMessage(`已设置${alignment}对齐`, 'success');
};

/**
 * 应用文本颜色
 */
const applyTextColor = (color: string): void => {
  currentTextColor.value = color;
  showMessage('文本颜色已应用', 'success');
};

/**
 * 应用背景颜色
 */
const applyBgColor = (color: string): void => {
  currentBgColor.value = color;
  showMessage('背景颜色已应用', 'success');
};

/**
 * 应用字体
 */
const applyFontFamily = (fontFamily: string): void => {
  currentFontFamily.value = fontFamily;
  if (editorCore.value) {
    editorCore.value.setFontFamily(fontFamily);
  }
  showMessage('字体已应用', 'success');
};

/**
 * 应用字体大小
 */
const applyFontSize = (fontSize: string): void => {
  currentFontSize.value = fontSize;
  if (editorCore.value) {
    editorCore.value.setFontSize(fontSize);
  }
  showMessage('字体大小已应用', 'success');
};

/**
 * 处理字体样式变化
 */
const handleFontStyleChange = (style: any): void => {
  Console.debug('字体样式变化:', style);
  
  if (!editorCore.value) return;
  
  switch (style) {
    case 'increase-size':
      editorCore.value.increaseFontSize();
      showMessage('字体已增大', 'success');
      break;
    case 'decrease-size':
      editorCore.value.decreaseFontSize();
      showMessage('字体已减小', 'success');
      break;
    default:
      Console.debug('未知的字体样式操作:', style);
  }
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
const exportFile = (): void => {
  handleExport();
};

/**
 * 切换批注模式
 */
const toggleAnnotationMode = (): void => {
  isAnnotationMode.value = !isAnnotationMode.value;
  showMessage(isAnnotationMode.value ? '批注模式已开启' : '批注模式已关闭', 'info');
};

/**
 * 显示批注列表
 */
const showAnnotationList = (): void => {
  showAnnotationPanel.value = !showAnnotationPanel.value;
};

/**
 * 处理文本选择
 */
const handleTextSelection = (): void => {
  if (isAnnotationMode.value) {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      selectedText.value = selection.toString().trim();
    } else {
      selectedText.value = '';
    }
  }
};

/**
 * 删除已解决的批注
 */
const deleteResolvedAnnotations = (): void => {
  annotations.value = annotations.value.filter(annotation => !annotation.resolved);
  showMessage('已删除所有已解决的批注', 'success');
};

/**
 * 导出批注
 */
const exportAnnotations = (): void => {
  const annotationsData = JSON.stringify(annotations.value, null, 2);
  const blob = new Blob([annotationsData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'annotations.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showMessage('批注导出成功', 'success');
};

/**
 * 编辑批注
 */
const editAnnotation = (annotation: Annotation): void => {
  Console.debug('编辑批注:', annotation);
};

/**
 * 解决批注
 */
const resolveAnnotation = (annotationId: string): void => {
  const annotation = annotations.value.find(a => a.id === annotationId);
  if (annotation) {
    annotation.resolved = true;
    showMessage('批注已标记为已解决', 'success');
  }
};

/**
 * 删除批注
 */
const deleteAnnotation = (annotationId: string): void => {
  annotations.value = annotations.value.filter(a => a.id !== annotationId);
  showMessage('批注已删除', 'success');
};

/**
 * 取消批注
 */
const cancelAnnotation = (): void => {
  selectedText.value = '';
  isAnnotationMode.value = false;
};

/**
 * 确认批注
 */
const confirmAnnotation = (content: string): void => {
  if (selectedText.value && content.trim()) {
    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      author: '当前用户',
      user: '当前用户',
      text: selectedText.value,
      timestamp: Date.now(),
      resolved: false,
      range: { startOffset: 0, endOffset: selectedText.value.length, text: selectedText.value }
    };
    
    annotations.value.push(newAnnotation);
    selectedText.value = '';
    showMessage('批注添加成功', 'success');
  }
};

/**
 * 切换只读模式
 */
const toggleReadOnly = (): void => {
  editorStore.setReadOnly(!editorStore.isReadOnly);
  showMessage(editorStore.isReadOnly ? '已开启只读模式' : '已关闭只读模式', 'info');
};

// 生命周期钩子
onMounted(async () => {
  // 检测系统主题
  systemThemeQuery.value = detectSystemTheme();
  if (systemThemeQuery.value) {
    systemThemeQuery.value.addEventListener('change', handleThemeChange);
  }
  
  // 初始化编辑器
  await initEditor();
});

onUnmounted(() => {
  // 清理系统主题监听器
  if (systemThemeQuery.value) {
    systemThemeQuery.value.removeEventListener('change', handleThemeChange);
  }
  
  // 销毁编辑器实例
  if (editorCore.value) {
    editorCore.value.destroy();
  }
});
</script>

<style scoped>
.docly-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color, #ffffff);
  color: var(--text-color, #333333);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.docly-editor.dark-theme {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --border-color: #333333;
}

.docly-editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.dark-theme.docly-editor-container {
  background: var(--bg-color, #1a1a1a);

}

.docly-editor-container.with-sidebar {
  /* margin-right: 300px; */
}

.docly-elditor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
}

.dark-theme .docly-elditor-wrapper {
  background: var(--bg-color, #1a1a1a);
}

.docly-editor-holder {
  flex: 1;
  padding: 20px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  margin: 10px;
  background: var(--editor-bg, #ffffff);
}

.docly-editor-holder.dark-theme {
  --editor-bg: #2a2a2a;
  --border-color: #444444;
}

.shortcut-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.shortcut-panel-container {
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.shortcut-panel {
  background: var(--bg-color, #ffffff);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.shortcut-panel.dark-theme {
  --bg-color: #2a2a2a;
  --text-color: #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background: var(--header-bg, #f8f9fa);
}

.panel-header.dark-theme {
  --header-bg: #333333;
  --border-color: #444444;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  color: var(--text-color, #666666);
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: var(--hover-bg, #f0f0f0);
}

.panel-content {
  padding: 20px;
}

.shortcut-info p {
  margin: 0 0 15px 0;
  line-height: 1.6;
}

.shortcut-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.shortcut-info li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}

.shortcut-info li:last-child {
  border-bottom: none;
}

kbd {
  background: var(--kbd-bg, #f8f9fa);
  border: 1px solid var(--kbd-border, #d0d7de);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 12px;
  color: var(--kbd-color, #24292f);
}

.dark-theme kbd {
  --kbd-bg: #444444;
  --kbd-border: #666666;
  --kbd-color: #e0e0e0;
}

.custom-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}
</style>