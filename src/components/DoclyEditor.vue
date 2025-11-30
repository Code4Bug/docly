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
      :current-font-family="currentFontFamily"
      :current-font-size="currentFontSize"
      :editor-instance="editorCore"
      @import-file="importFile"
      @export-file="exportFile"
      @undo="undo"
      @redo="redo"
      @change-heading="changeHeading"
      @format-text="formatText"
      @set-alignment="setAlignment"
      @text-color-change="applyTextColor"
      @bg-color-change="applyBgColor"
      @font-family-change="applyFontFamily"
      @font-size-change="applyFontSize"
      @font-style-change="handleFontStyleChange"
      @insert-list="insertList"
      @insert-link="insertLink"
      @insert-table="insertTable"
      @insert-quote="insertQuote"
      @add-column-before="addColumnBefore"
      @add-column-after="addColumnAfter"
      @delete-column="deleteColumn"
      @add-row-before="addRowBefore"
      @add-row-after="addRowAfter"
      @delete-row="deleteRow"
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
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
import { ErrorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler';

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
      // 传入符合 TiptapDocument 类型的初始内容
      data: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '欢迎使用 Docly 编辑器！开始编写您的文档...'
              }
            ]
          }
        ]
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
        
        // 将 TiptapDocument 转换为HTML内容用于统计
        let htmlContent = '';
        if (data.content && Array.isArray(data.content)) {
          htmlContent = convertTiptapNodesToHtml(data.content);
        }
        
        // Console.debug('生成的HTML内容:', htmlContent);
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
      strikethrough: () => formatText('strike'),
      superscript: () => formatText('superscript'),
      subscript: () => formatText('subscript'),
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
 * 将 TiptapNode 数组转换为 HTML 字符串用于统计
 */
const convertTiptapNodesToHtml = (nodes: any[]): string => {
  let html = '';
  
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      html += '<p>';
      if (node.content) {
        html += convertTiptapNodesToHtml(node.content);
      }
      html += '</p>';
    } else if (node.type === 'text') {
      html += node.text || '';
    } else if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      html += `<h${level}>`;
      if (node.content) {
        html += convertTiptapNodesToHtml(node.content);
      }
      html += `</h${level}>`;
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      const tag = node.type === 'bulletList' ? 'ul' : 'ol';
      html += `<${tag}>`;
      if (node.content) {
        html += convertTiptapNodesToHtml(node.content);
      }
      html += `</${tag}>`;
    } else if (node.type === 'listItem') {
      html += '<li>';
      if (node.content) {
        html += convertTiptapNodesToHtml(node.content);
      }
      html += '</li>';
    } else if (node.type === 'blockquote') {
      html += '<blockquote>';
      if (node.content) {
        html += convertTiptapNodesToHtml(node.content);
      }
      html += '</blockquote>';
    } else if (node.type === 'codeBlock') {
      html += '<pre><code>';
      if (node.content) {
        html += convertTiptapNodesToHtml(node.content);
      }
      html += '</code></pre>';
    } else if (node.type === 'hardBreak') {
      html += '<br>';
    } else if (node.content) {
      // 对于其他有内容的节点，递归处理内容
      html += convertTiptapNodesToHtml(node.content);
    }
  }
  
  return html;
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
    // 使用新的 Tiptap JSON 导出方法
    const tiptapJson = await editorCore.value.saveTiptapJson();
    Console.debug('准备导出的 Tiptap JSON 数据:', tiptapJson);
    Console.debug('当前批注数据:', annotations.value);
    
    if (!tiptapJson || !tiptapJson.content || tiptapJson.content.length === 0) {
      showMessage('没有内容可导出，请先添加一些内容', 'warn');
      return;
    }
    
    // 将当前的批注数据更新到编辑器核心中
    if (annotations.value && annotations.value.length > 0) {
      Console.debug('更新批注数据到编辑器核心中，批注数量:', annotations.value.length);
      
      // 转换批注格式以匹配TiptapDocument.comments的类型
      const commentsData = annotations.value.map(annotation => ({
        id: annotation.id,
        content: annotation.content,
        author: annotation.author,
        user: annotation.user || annotation.author,
        timestamp: annotation.timestamp,
        range: annotation.range
      }));
      
      editorCore.value.setDocumentComments(commentsData);
      Console.debug('批注数据更新完成');
    } else {
      Console.debug('没有批注数据需要导出');
      editorCore.value.setDocumentComments([]);
    }
    
    // 重新获取包含所有信息的 TiptapDocument
    const completeTiptapJson = await editorCore.value.saveTiptapJson();
    Console.debug('完整的导出数据:', {
      contentNodes: completeTiptapJson.content?.length || 0,
      images: completeTiptapJson.images?.length || 0,
      comments: completeTiptapJson.comments?.length || 0
    });
    
    const fileResult = await wordHandler.value.exportFromTiptapJson(completeTiptapJson);
    
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
    // 显示导入进度提示
    showMessage('正在读取文档文件...', 'info');
    
    // 清空现有批注数据
    annotations.value = [];
    Console.debug('已清空现有批注数据，准备导入新文档');
    
    // 更新进度提示
    showMessage('正在解析文档内容...', 'info');
    
    // 使用 WordHandler 导入文档，包含批注数据和错误信息
    const importResult = await wordHandler.value.importToTiptap(file);
    Console.debug('文档解析完成，TiptapDocument:', importResult);
    
    // 处理导入警告和错误
    if (importResult.importWarnings && importResult.importWarnings.length > 0) {
      Console.warn('导入警告:', importResult.importWarnings);
      // 显示重要警告给用户
      const criticalWarnings = importResult.importWarnings.filter(warning => 
        warning.includes('解析失败') || 
        warning.includes('数据丢失') || 
        warning.includes('格式错误')
      );
      if (criticalWarnings.length > 0) {
        showMessage(`导入警告: ${criticalWarnings[0]}`, 'warn');
      }
    }
    
    if (importResult.importErrors && importResult.importErrors.length > 0) {
      Console.error('导入错误:', importResult.importErrors);
      showMessage(`导入错误: ${importResult.importErrors[0]}`, 'error');
    }
    
    const tiptapJson = importResult;
    
    // 处理批注数据集成
    let importedCommentsCount = 0;
    if (tiptapJson.comments && tiptapJson.comments.length > 0) {
      Console.debug('开始处理批注数据，共', tiptapJson.comments.length, '条批注');
      showMessage(`正在处理 ${tiptapJson.comments.length} 条批注...`, 'info');
      
      try {
        tiptapJson.comments.forEach((comment: any, index: number) => {
          // 验证批注数据完整性
          if (!comment.content || typeof comment.content !== 'string') {
            Console.warn(`批注 ${index + 1} 内容无效，跳过处理`);
            return;
          }
          
          // 转换为 AnnotationSystem 期望的格式
          // 处理原文文本 - 优先使用range中的text，如果为空则尝试其他方式
          let originalText = '';
          if (comment.range?.text && comment.range.text.trim()) {
            const rangeText = comment.range.text.trim();
            // 验证原文质量，避免显示无意义的文本
            if (rangeText.length >= 2 && !rangeText.includes('(原文内容未能提取)')) {
              originalText = rangeText;
            }
          } else if (comment.text && comment.text.trim()) {
            const commentText = comment.text.trim();
            // 验证原文质量
            if (commentText.length >= 2 && !commentText.includes('(原文内容未能提取)')) {
              originalText = commentText;
            }
          }
          
          // 如果没有有效的原文，记录警告但不设置错误提示文本
          if (!originalText) {
            Console.warn(`批注 ${index + 1} (ID: ${comment.id}) 缺少有效的原文文本`);
          }
          
          const annotation: Annotation = {
            id: comment.id || `imported_${Date.now()}_${index}`,
            content: comment.content.trim(),
            author: comment.author || comment.user || '文档作者',
            user: comment.user || comment.author || '文档作者',
            text: originalText,
            timestamp: typeof comment.timestamp === 'number' && comment.timestamp > 0 ? comment.timestamp : Date.now(),
            resolved: false,
            range: {
              startOffset: comment.range?.startOffset || 0,
              endOffset: comment.range?.endOffset || 0,
              text: originalText
            }
          };
          
          // 处理批注回复（如果存在）
          if (comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0) {
            annotation.replies = comment.replies.map((reply: any, replyIndex: number) => ({
              id: reply.id || `reply_${Date.now()}_${index}_${replyIndex}`,
              content: reply.content || '',
              author: reply.author || reply.user || '回复者',
              user: reply.user || reply.author || '回复者',
              timestamp: typeof reply.timestamp === 'number' && reply.timestamp > 0 ? reply.timestamp : Date.now(),
              resolved: false
            }));
          }
          
          annotations.value.push(annotation);
          importedCommentsCount++;
          
          Console.debug(`批注 ${index + 1} 处理完成:`, {
            id: annotation.id,
            author: annotation.author,
            contentLength: annotation.content.length,
            hasReplies: !!(annotation.replies && annotation.replies.length > 0)
          });
        });
        
        Console.debug('批注数据处理完成，成功导入', importedCommentsCount, '条批注');
      } catch (commentError) {
        Console.error('处理批注数据时发生错误:', commentError);
        showMessage('批注数据处理出现问题，但文档主体内容已成功导入', 'warn');
      }
    } else {
      Console.debug('文档中未包含批注数据');
    }
    
    // 渲染文档内容
    if (editorCore.value) {
      showMessage('正在渲染文档内容...', 'info');
      await editorCore.value.renderTiptapJson(tiptapJson);
      
      // 显示导入成功消息
      let successMessage = '文档导入成功';
      if (importedCommentsCount > 0) {
        successMessage += `，包含 ${importedCommentsCount} 条批注`;
      }
      showMessage(successMessage, 'success');
      
      Console.debug('文档导入完成，批注数据已集成到UI组件:', {
        totalAnnotations: annotations.value.length,
        documentNodes: tiptapJson.content?.length || 0
      });
    } else {
      throw new Error('编辑器核心未初始化');
    }
    
    // 清空文件输入
    target.value = '';
    
  } catch (error) {
    Console.error('文档导入失败:', error);
    Console.error('错误详情:', error instanceof Error ? error.stack : '未知错误类型');
    
    // 使用ErrorHandler记录和处理错误
    let errorType = ErrorType.IMPORT_PROCESS;
    let errorMessage = '文档导入失败';
    let context = `文件: ${file.name}`;
    let suggestion = '请重试或检查文件格式';
    
    if (error instanceof Error) {
      // 检查是否有导入警告和错误信息
      const enhancedError = error as any;
      let additionalInfo: string[] = [];
      
      if (enhancedError.importWarnings && Array.isArray(enhancedError.importWarnings)) {
        additionalInfo.push(...enhancedError.importWarnings);
      }
      if (enhancedError.importErrors && Array.isArray(enhancedError.importErrors)) {
        additionalInfo.push(...enhancedError.importErrors);
      }
      
      // 根据错误类型提供具体的错误信息和建议
      if (error.message.includes('文件验证失败')) {
        errorType = ErrorType.FILE_VALIDATION;
        errorMessage = '文件格式或大小不符合要求';
        suggestion = '请选择有效的.docx文件，确保文件大小在50MB以内';
      } else if (error.message.includes('主文档解析失败')) {
        errorType = ErrorType.XML_PARSING;
        errorMessage = '文档内容解析错误';
        context += ', 可能文件损坏';
        suggestion = '请检查文件是否损坏，或尝试重新保存文档';
      } else if (error.message.includes('批注解析')) {
        errorType = ErrorType.COMMENT_PARSING;
        errorMessage = '批注数据处理失败';
        suggestion = '主要内容可能正常，批注功能可能受影响';
      } else if (error.message.includes('XML')) {
        errorType = ErrorType.XML_PARSING;
        errorMessage = '文档内部结构错误';
        context += ', XML格式问题';
        suggestion = '文件可能损坏或格式不兼容，请尝试其他文档';
      } else if (error.message.includes('大小')) {
        errorType = ErrorType.FILE_VALIDATION;
        errorMessage = '文件大小问题';
        suggestion = '请检查文件大小是否超出限制或文件是否为空';
      } else {
        errorMessage = error.message;
        context += `, 错误类型: ${error.constructor.name}`;
      }
      
      // 记录错误到ErrorHandler
      const errorDetail = ErrorHandler.logError(
        errorType,
        ErrorSeverity.ERROR,
        errorMessage,
        context,
        suggestion
      );
      
      // 显示用户友好的错误消息
      ErrorHandler.showUserFriendlyError(errorDetail);
      
      // 如果有额外的详细信息，显示重要的警告
      if (additionalInfo.length > 0) {
        const criticalInfo = additionalInfo.filter(info => 
          info.includes('失败') || 
          info.includes('错误') || 
          info.includes('无效') ||
          info.includes('丢失')
        );
        
        if (criticalInfo.length > 0) {
          setTimeout(() => {
            ErrorHandler.logError(
              ErrorType.IMPORT_PROCESS,
              ErrorSeverity.WARNING,
              criticalInfo[0],
              '导入过程详细信息',
              '这可能影响部分功能的正常使用'
            );
            showMessage(`详细信息: ${criticalInfo[0]}`, 'warn');
          }, 2000);
        }
      }
    } else {
      // 处理非Error类型的异常
      const errorDetail = ErrorHandler.logError(
        ErrorType.UNKNOWN,
        ErrorSeverity.ERROR,
        '发生未知类型的错误',
        `错误对象类型: ${typeof error}, 文件: ${file.name}`,
        '请重试，如果问题持续存在请联系技术支持'
      );
      
      ErrorHandler.showUserFriendlyError(errorDetail);
    }
    
    // 清空文件输入以允许重新选择
    target.value = '';
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
 * @param {object} size - 表格尺寸 {rows: number, cols: number}
 */
const insertTable = (size?: { rows: number; cols: number }): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (editor) {
      // 使用传入的尺寸或默认尺寸
      const tableSize = size || { rows: 3, cols: 3 };
      editor.chain().focus().insertTable({ 
        rows: tableSize.rows, 
        cols: tableSize.cols, 
        withHeaderRow: true 
      }).run();
      showMessage(`${tableSize.rows}×${tableSize.cols} 表格插入成功`, 'success');
    }
  } catch (error) {
    Console.error('插入表格失败:', error);
    showMessage('插入表格失败', 'error');
  }
};

/**
 * 在当前列之前添加列
 */
const addColumnBefore = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例获取失败', 'error');
      return;
    }
    editor.chain().focus().addColumnBefore().run();
    showMessage('列添加成功', 'success');
  } catch (error) {
    Console.error('添加列失败:', error);
    showMessage('添加列失败', 'error');
  }
};

/**
 * 在当前列之后添加列
 */
const addColumnAfter = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例获取失败', 'error');
      return;
    }
    editor.chain().focus().addColumnAfter().run();
    showMessage('列添加成功', 'success');
  } catch (error) {
    Console.error('添加列失败:', error);
    showMessage('添加列失败', 'error');
  }
};

/**
 * 删除当前列
 */
const deleteColumn = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例获取失败', 'error');
      return;
    }
    editor.chain().focus().deleteColumn().run();
    showMessage('列删除成功', 'success');
  } catch (error) {
    Console.error('删除列失败:', error);
    showMessage('删除列失败', 'error');
  }
};

/**
 * 在当前行之前添加行
 */
const addRowBefore = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例获取失败', 'error');
      return;
    }
    editor.chain().focus().addRowBefore().run();
    showMessage('行添加成功', 'success');
  } catch (error) {
    Console.error('添加行失败:', error);
    showMessage('添加行失败', 'error');
  }
};

/**
 * 在当前行之后添加行
 */
const addRowAfter = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例获取失败', 'error');
      return;
    }
    editor.chain().focus().addRowAfter().run();
    showMessage('行添加成功', 'success');
  } catch (error) {
    Console.error('添加行失败:', error);
    showMessage('添加行失败', 'error');
  }
};

/**
 * 删除当前行
 */
const deleteRow = (): void => {
  if (!editorCore.value) {
    showMessage('编辑器未初始化', 'error');
    return;
  }

  try {
    const editor = editorCore.value.getEditor();
    if (!editor) {
      showMessage('编辑器实例获取失败', 'error');
      return;
    }
    editor.chain().focus().deleteRow().run();
    showMessage('行删除成功', 'success');
  } catch (error) {
    Console.error('删除行失败:', error);
    showMessage('删除行失败', 'error');
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
  if (editorCore.value) {
    editorCore.value.setTextColor(color);
  }
  showMessage('文本颜色已应用', 'success');
};

/**
 * 应用背景颜色
 */
const applyBgColor = (color: string): void => {
  currentBgColor.value = color;
  if (editorCore.value) {
    editorCore.value.setBackgroundColor(color);
  }
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

// 监听只读状态变化
watch(isReadOnly, (newReadOnly: boolean) => {
  if (editorCore.value) {
    editorCore.value.setReadOnly(newReadOnly);
    Console.debug('只读模式已更新:', newReadOnly);
  }
}, { immediate: true });

// 生命周期钩子
onMounted(async () => {
  // 检测系统主题
  systemThemeQuery.value = detectSystemTheme();
  if (systemThemeQuery.value) {
    systemThemeQuery.value.addEventListener('change', handleThemeChange);
  }
  
  // 注册撤销和重做快捷键
  registerEditorShortcuts({
    undo,
    redo
  });
  
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