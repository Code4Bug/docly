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
import { EditorCore } from '../core/EditorCore';
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
const editorCore = ref<EditorCore>();
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

const isReadOnly = computed(() => editorStore.isReadOnly);

/**
 * 初始化编辑器
 */
const initEditor = async (): Promise<void> => {
  if (!editorRef.value) return;

  try {
    Console.info('开始初始化编辑器...');
    
    // 初始化插件管理器
    pluginManager.value = new PluginManager();
    Console.info('插件管理器初始化完成');
    
    // 初始化文件处理器
    wordHandler.value = new WordHandler();
    Console.info('文件处理器初始化完成');
    
    // 初始化编辑器核心
    Console.info('创建编辑器核心实例...');
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
    Console.info('编辑器核心实例创建完成');
    
    Console.info('调用编辑器核心初始化...');
    await editorCore.value.init();
    Console.info('编辑器核心初始化完成');
    
    Console.info('设置编辑器实例到 store...');
    editorStore.setEditorInstance(editorCore.value);
    Console.info('编辑器实例设置完成，当前实例:', editorStore.editorInstance);
    
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
    // 调试：直接从编辑器获取最新数据
    Console.info('=== 导出调试信息 ===');
    const currentEditorData = await editorCore.value.save();
    Console.info('直接从编辑器获取的数据:', currentEditorData);
    Console.info('编辑器数据块数量:', currentEditorData.blocks.length);
    
    // 先保存当前编辑器数据到 store
    await editorStore.saveDocument();
    Console.info('保存后store中的数据:', editorStore.editorData);
    Console.info('store数据块数量:', editorStore.editorData?.blocks.length || 0);
    
    // 比较两个数据是否一致
    const storeDataStr = JSON.stringify(editorStore.editorData);
    const editorDataStr = JSON.stringify(currentEditorData);
    Console.info('数据是否一致:', storeDataStr === editorDataStr);
    
    // 使用直接从编辑器获取的数据进行导出
    const dataToExport = currentEditorData;
    
    // 检查是否有数据可导出
    if (!dataToExport || !dataToExport.blocks || dataToExport.blocks.length === 0) {
      showMessage('没有内容可导出，请先添加一些内容', 'warning');
      return;
    }

    Console.info('准备导出的数据:', dataToExport);
    
    // 执行导出
    const fileResult = await wordHandler.value.export(dataToExport);
    
    // 创建下载链接
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
      // 重新初始化wordHandler
      wordHandler.value = new WordHandler();
    } catch (error) {
      Console.error('wordHandler初始化失败:', error);
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
    
    // 清空现有批注，避免重复累积
    annotations.value = [];
    Console.info('已清空现有批注');
    
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
      editorData.comments.forEach((comment: any, index: number) => {
        importedComments.push(createStandardComment(comment, index));
      });
    }
    
    // 然后从块中提取关联的批注（保持向后兼容）
    if (editorData.blocks) {
      editorData.blocks.forEach((block: any, blockIndex: number) => {
        if (block.comments && block.comments.length > 0) {
          block.comments.forEach((comment: any) => {
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
        Console.info('新增的批注:', newComments);
      } else {
        showMessage('文档导入成功，未发现新批注', 'success');
      }
    } else {
      showMessage('文档导入成功', 'success');
    }
    
    Console.info('准备调用 editorStore.loadDocument...');
    await editorStore.loadDocument(editorData);
    Console.info('editorStore.loadDocument 调用完成');
    Console.info('文档已加载到编辑器store，当前编辑器数据:', editorStore.editorData);
    
  } catch (error) {
    Console.error('导入失败，详细错误信息:', error);
    Console.error('错误类型:', typeof error);
    Console.error('错误堆栈:', (error as Error).stack);
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
const changeHeading = async (level: string): Promise<void> => {
  
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
    Console.error('更改标题级别失败:', error);
    showMessage('更改标题级别失败', 'error');
  }
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
    Console.error('插入表格失败:', error);
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
 * 设置文本颜色
 * @param {string} color - 颜色值
 */
const setTextColor = (color: string): void => {
  Console.info('DoclyEditor setTextColor 被调用:', color);
  if (!editorCore.value) {
    Console.error('编辑器未初始化');
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const success = editorCore.value.execCommand('foreColor', color);
  Console.info('execCommand foreColor 结果:', success);
  if (success) {
    currentTextColor.value = color;
    showMessage('文本颜色设置成功', 'success');
  } else {
    showMessage('文本颜色设置失败，请确保光标在编辑区域内', 'error');
  }
};

/**
 * 设置背景颜色
 * @param {string} color - 颜色值
 */
const setBgColor = (color: string): void => {
  Console.info('DoclyEditor setBgColor 被调用:', color);
  if (!editorCore.value) {
    Console.error('编辑器未初始化');
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const success = editorCore.value.execCommand('backColor', color);
  Console.info('execCommand backColor 结果:', success);
  if (success) {
    currentBgColor.value = color;
    showMessage('背景颜色设置成功', 'success');
  } else {
    showMessage('背景颜色设置失败，请确保光标在编辑区域内', 'error');
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
const exportFile = async (): Promise<void> => {
  await handleExport();
};

/**
 * 应用文本颜色
 * @param {string} color - 颜色值
 */
const applyTextColor = (color: string): void => {
  Console.info('DoclyEditor applyTextColor 被调用:', color);
  setTextColor(color);
};

/**
 * 应用背景颜色
 * @param {string} color - 颜色值
 */
const applyBgColor = (color: string): void => {
  Console.info('DoclyEditor applyBgColor 被调用:', color);
  setBgColor(color);
};

/**
 * 应用字体族
 * @param {string} fontFamily - 字体族
 */
const applyFontFamily = (fontFamily: string): void => {
  Console.info('DoclyEditor applyFontFamily 被调用:', fontFamily);
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要设置字体的文本', 'warning');
    return;
  }

  const success = editorCore.value.execCommand('fontName', fontFamily);
  if (success) {
    currentFontFamily.value = fontFamily;
    showMessage('字体设置成功', 'success');
  } else {
    showMessage('字体设置失败', 'error');
  }
};

/**
 * 应用字体大小
 * @param {string} fontSize - 字体大小（支持px和pt单位）
 */
const applyFontSize = (fontSize: string): void => {
  Console.info('DoclyEditor applyFontSize 被调用:', fontSize);
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要设置字体大小的文本', 'warning');
    return;
  }

  // 处理不同单位的字体大小
  let sizeValue: number;
  if (fontSize.includes('pt')) {
    // pt单位：直接使用数值
    sizeValue = parseFloat(fontSize.replace('pt', ''));
  } else if (fontSize.includes('px')) {
    // px单位：转换为pt（1px = 0.75pt）
    sizeValue = parseFloat(fontSize.replace('px', '')) * 0.75;
  } else {
    // 纯数字：当作pt处理
    sizeValue = parseFloat(fontSize);
  }

  const success = editorCore.value.execCommand('fontSize', sizeValue.toString());
  if (success) {
    currentFontSize.value = fontSize;
    showMessage('字体大小设置成功', 'success');
  } else {
    showMessage('字体大小设置失败', 'error');
  }
};

/**
 * 处理字体样式变化
 * @param {string} action - 操作类型
 */
const handleFontStyleChange = (action: string): void => {
  Console.info('DoclyEditor handleFontStyleChange 被调用:', action);
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  const selection = editorCore.value.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showMessage('请先选择要调整的文本', 'warning');
    return;
  }

  let success = false;
  let message = '';

  switch (action) {
    case 'increase-size':
      // 增大字体
      const currentSize = parseInt(currentFontSize.value.replace('px', ''));
      const newSize = Math.min(currentSize + 2, 48); // 最大48px
      success = editorCore.value.execCommand('fontSize', newSize.toString());
      if (success) {
        currentFontSize.value = `${newSize}px`;
        message = '字体已增大';
      }
      break;
    case 'decrease-size':
      // 减小字体
      const currentSizeDecrease = parseInt(currentFontSize.value.replace('px', ''));
      const newSizeDecrease = Math.max(currentSizeDecrease - 2, 10); // 最小10px
      success = editorCore.value.execCommand('fontSize', newSizeDecrease.toString());
      if (success) {
        currentFontSize.value = `${newSizeDecrease}px`;
        message = '字体已减小';
      }
      break;
    default:
      showMessage('不支持的字体操作', 'error');
      return;
  }

  if (success) {
    showMessage(message, 'success');
  } else {
    showMessage('字体操作失败', 'error');
  }
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

  const annotation: Annotation = {
    id: `annotation-${Date.now()}`,
    text: selectedText,
    content: content,
    author: '当前用户', // 可以从用户系统获取
    timestamp: Date.now(),
    user: '当前用户', // 可以从用户系统获取
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
    selectedText.value = annotation.text || '';
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
  Console.info('DoclyEditor onMounted 钩子被调用');
  
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

/* 编辑器容器样式 - 固定高度 */
.docly-editor-container {
  display: flex;
  flex: 1;
  height: 500px; /* 固定高度 */
  overflow: hidden;
  position: relative;
  padding: 0;
}

.docly-editor-container.with-sidebar {
  padding-right: 0px; /* 为侧边栏留出空间 */
}

/* 编辑器包装器 - 自动跟随内容撑开 */
.docly-elditor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-height: 0; /* 允许收缩 */
}

/* 编辑器内容区域 - 支持内容撑开 */
.docly-editor-holder {
  flex: 1;
  padding: 20px;
  background: #ffffff;
  min-height: 100%;
  outline: none;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
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

/* 快捷键面板样式 */
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
  z-index: 3000;
}

.shortcut-panel-container {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
}

.shortcut-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.shortcut-panel.dark-theme {
  background: #2d2d2d;
  color: #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.shortcut-panel.dark-theme .panel-header {
  background: #3d3d3d;
  border-bottom-color: #555;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.shortcut-panel.dark-theme .header-left h3 {
  color: #e0e0e0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.close-btn {
  padding: 8px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.shortcut-panel.dark-theme .close-btn {
  color: #aaa;
}

.shortcut-panel.dark-theme .close-btn:hover {
  background: #555;
  color: #e0e0e0;
}

.panel-content {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.shortcut-info p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.shortcut-panel.dark-theme .shortcut-info p {
  color: #aaa;
}

.shortcut-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.shortcut-info li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.shortcut-panel.dark-theme .shortcut-info li {
  border-bottom-color: #444;
}

.shortcut-info li:last-child {
  border-bottom: none;
}

kbd {
  display: inline-block;
  padding: 4px 8px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin: 0 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-panel.dark-theme kbd {
  background: #444;
  border-color: #666;
  color: #e0e0e0;
}
</style>