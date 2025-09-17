<template>
  <div class="docly-editor">
    <!-- 工具栏 -->
    <div class="docly-toolbar">
      <!-- 基础格式区域 -->
      <div class="toolbar-section format-section">
        <!-- 文本格式化工具 -->
        <div class="button-group">
          <button 
            @click="formatText('bold')" 
            class="btn btn-outline format-btn compact-btn"
            title="粗体"
          >
            <strong>B</strong>
          </button>
          <button 
            @click="formatText('italic')" 
            class="btn btn-outline format-btn compact-btn"
            title="斜体"
          >
            <em>I</em>
          </button>
          <button 
            @click="formatText('underline')" 
            class="btn btn-outline format-btn compact-btn"
            title="下划线"
          >
            <u>U</u>
          </button>
        </div>

        <!-- 文本对齐工具 -->
        <div class="button-group">
          <button 
            @click="setAlignment('left')" 
            class="btn btn-outline align-btn compact-btn"
            title="左对齐"
          >
            ⬅
          </button>
          <button 
            @click="setAlignment('center')" 
            class="btn btn-outline align-btn compact-btn"
            title="居中对齐"
          >
            ↔
          </button>
          <button 
            @click="setAlignment('right')" 
            class="btn btn-outline align-btn compact-btn"
            title="右对齐"
          >
            ➡
          </button>
          <button 
            @click="setAlignment('justify')" 
            class="btn btn-outline align-btn compact-btn"
            title="两端对齐"
          >
            ⬌
          </button>
        </div>
      </div>

      <!-- 样式区域 -->
      <div class="toolbar-section style-section">
        <!-- 标题选择器 -->
        <div class="heading-selector">
          <select @change="changeHeading" class="heading-select compact-select">
            <option value="">正文</option>
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
            <option value="5">H5</option>
            <option value="6">H6</option>
          </select>
        </div>

        <!-- 颜色工具 -->
        <div class="button-group">
          <div class="color-picker-wrapper">
            <button 
              class="btn btn-outline color-btn compact-btn"
              title="字体颜色"
              @click="toggleColorPicker('text')"
            >
              A
              <div class="color-indicator" :style="{ backgroundColor: currentTextColor }"></div>
            </button>
            <div v-if="showTextColorPicker" class="color-picker-panel">
              <div class="color-presets">
                <div 
                  v-for="color in textColorPresets" 
                  :key="color"
                  class="color-preset"
                  :style="{ backgroundColor: color }"
                  @click="setTextColor(color)"
                  :title="getColorName(color)"
                ></div>
              </div>
              <input 
                type="color" 
                v-model="customTextColor"
                @change="setTextColor(customTextColor)"
                class="custom-color-input"
              />
            </div>
          </div>
          
          <div class="color-picker-wrapper">
            <button 
              class="btn btn-outline color-btn compact-btn"
              title="背景颜色"
              @click="toggleColorPicker('background')"
            >
              A
              <div class="color-indicator bg-indicator" :style="{ backgroundColor: currentBgColor }"></div>
            </button>
            <div v-if="showBgColorPicker" class="color-picker-panel">
              <div class="color-presets">
                <div 
                  v-for="color in bgColorPresets" 
                  :key="color"
                  class="color-preset"
                  :style="{ backgroundColor: color }"
                  @click="setBgColor(color)"
                  :title="getColorName(color)"
                ></div>
              </div>
              <input 
                type="color" 
                v-model="customBgColor"
                @change="setBgColor(customBgColor)"
                class="custom-color-input"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="toolbar-section content-section">
        <!-- 列表工具 -->
        <div class="button-group">
          <button 
            @click="insertList('unordered')" 
            class="btn btn-outline compact-btn"
            title="无序列表"
          >
            •
          </button>
          <button 
            @click="insertList('ordered')" 
            class="btn btn-outline compact-btn"
            title="有序列表"
          >
            1.
          </button>
        </div>

        <!-- 插入工具 -->
        <div class="button-group">
          <button 
            @click="insertLink" 
            class="btn btn-outline compact-btn"
            title="插入链接"
          >
            🔗
          </button>
          <button 
            @click="insertTable" 
            class="btn btn-outline compact-btn"
            title="插入表格"
          >
            📊
          </button>
          <button 
            @click="insertQuote" 
            class="btn btn-outline compact-btn"
            title="插入引用"
          >
            "
          </button>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="toolbar-section action-section">
        <!-- 撤销重做 -->
        <div class="button-group">
          <button 
            @click="undo" 
            class="btn btn-outline compact-btn"
            title="撤销"
          >
            ↶
          </button>
          <button 
            @click="redo" 
            class="btn btn-outline compact-btn"
            title="重做"
          >
            ↷
          </button>
        </div>

        <!-- 保存导出工具 -->
        <div class="button-group">
          <button 
            @click="handleSave" 
            :disabled="isSaving" 
            class="btn btn-primary compact-btn"
          >
            {{ isSaving ? '保存中' : '保存' }}
          </button>
          <button 
            @click="handleExport" 
            :disabled="isExporting"
            class="btn btn-outline compact-btn"
          >
            {{ isExporting ? '导出中' : '导出' }}
          </button>
        </div>
        
        <div class="upload-wrapper">
          <input
            ref="fileInputRef"
            type="file"
            accept=".docx"
            @change="handleImport"
            style="display: none"
          />
          <button @click="triggerFileInput" class="btn btn-outline compact-btn">
            导入
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑器容器 -->
    <div class="docly-editor-container">
      <div ref="editorRef" class="docly-editor-holder"></div>
    </div>

    <!-- 状态栏 -->
    <div class="docly-statusbar">
      <div class="status-group">
        <span class="status-item">字数: {{ wordCount }}</span>
        <span class="status-item">段落: {{ blockCount }}</span>
        <span class="status-item">批注: {{ commentCount }}</span>
        <span v-if="hasUnsavedChanges" class="unsaved-indicator">
          未保存
        </span>
      </div>
      
      <div class="status-group">
        <button @click="toggleReadOnly" class="btn btn-outline compact-btn">
          {{ isReadOnly ? '编辑' : '只读' }}
        </button>
      </div>
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

// Store
const editorStore = useEditorStore();

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
    // 初始化插件管理器
    pluginManager.value = new PluginManager();
    
    // 初始化文件处理器
    wordHandler.value = new WordHandler();
    
    // 初始化编辑器核心
    editorCore.value = new EditorCore({
      holder: editorRef.value,
      plugins: [],
      readOnly: props.readOnly,
      placeholder: '开始编写您的文档...',
      ...props.config
    });
    
    await editorCore.value.init();
    editorStore.setEditorInstance(editorCore.value);
    
  } catch (error) {
    console.error('编辑器初始化失败:', error);
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
  if (!wordHandler.value || !editorStore.editorData) {
    showMessage('无法导出，编辑器未初始化或无数据', 'error');
    return;
  }

  isExporting.value = true;
  try {
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
    showMessage('文档导出失败', 'error');
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
  
  if (!file || !wordHandler.value) {
    showMessage('文件无效或处理器未初始化', 'error');
    return;
  }

  try {
    const editorData = await wordHandler.value.import(file);
    await editorStore.loadDocument(editorData);
    showMessage('文档导入成功', 'success');
  } catch (error) {
    console.error('导入失败:', error);
    showMessage('文档导入失败', 'error');
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
  // 创建消息元素
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
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
    '#333333': '深灰',
    '#666666': '灰色',
    '#999999': '浅灰',
    '#ffffff': '白色',
    '#f5f5f5': '浅白',
    '#e0e0e0': '银色',
    '#cccccc': '淡灰',
    '#ff0000': '红色',
    '#ff6600': '橙色',
    '#ffcc00': '黄色',
    '#00ff00': '绿色',
    '#0066ff': '蓝色',
    '#6600ff': '紫色',
    '#ff0066': '粉色',
    '#00ffff': '青色',
    '#ffeeee': '浅红',
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

// 生命周期
onMounted(() => {
  initEditor();
});

onUnmounted(() => {
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
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-height: 48px;
}

/* 工具栏区域布局 */
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  padding-right: 8px;
  margin-right: 8px;
  overflow: visible;
}

.toolbar-section:last-child {
  border-right: none;
  padding-right: 0;
  margin-right: 0;
}

.format-section {
  min-width: 200px;
  flex: 0 0 auto;
}

.style-section {
  min-width: 120px;
  flex: 0 0 auto;
}

.content-section {
  min-width: 150px;
  flex: 0 0 auto;
}

.action-section {
  min-width: 180px;
  flex: 0 0 auto;
  margin-left: auto;
}

/* 按钮组布局 */
.button-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 2px;
  align-items: center;
}

.button-group .btn {
  flex-shrink: 0;
}

/* 颜色选择器特殊处理 */
.color-picker-wrapper {
  position: relative;
  flex-shrink: 0;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .docly-toolbar {
    padding: 6px 8px;
    gap: 4px;
    flex-wrap: wrap;
  }
  
  .toolbar-section {
    gap: 4px;
    padding-right: 6px;
    margin-right: 6px;
    border-right: none;
    margin-bottom: 4px;
  }
  
  .format-section {
    min-width: 160px;
  }
  
  .style-section {
    min-width: 100px;
  }
  
  .content-section {
    min-width: 120px;
  }
  
  .action-section {
    min-width: 140px;
    margin-left: 0;
  }
}
.compact-btn {
  padding: 4px 8px !important;
  font-size: 12px !important;
  min-width: 28px !important;
  height: 28px !important;
  line-height: 1.2 !important;
}

.compact-select {
  padding: 4px 6px !important;
  font-size: 12px !important;
  height: 28px !important;
}

.docly-editor-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.docly-editor-holder {
  min-height: 400px;
}

.docly-statusbar {
  padding: 8px 16px;
  background-color: #fafafa;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

.unsaved-indicator {
  color: #f56c6c;
  font-weight: bold;
}

/* Editor.js 样式覆盖 */
:deep(.ce-block__content) {
  max-width: none;
}

:deep(.ce-toolbar__content) {
  max-width: none;
}

:deep(.codex-editor) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: left; /* 默认左对齐 */
}

:deep(.ce-paragraph) {
  line-height: 1.6;
  text-align: left; /* 段落默认左对齐 */
}

:deep(.ce-header) {
  text-align: left; /* 标题默认左对齐 */
}

:deep(.ce-list) {
  text-align: left; /* 列表默认左对齐 */
}

:deep(.ce-quote) {
  text-align: left; /* 引用默认左对齐 */
}

:deep(.ce-table) {
  text-align: left; /* 表格默认左对齐 */
}

/* 颜色选择器样式 */
.color-picker-wrapper {
  position: relative;
  display: inline-block;
}

.color-btn {
  position: relative;
  padding: 6px 12px;
  font-weight: bold;
}

.color-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 3px;
  border-radius: 1px;
  border: 1px solid #ccc;
}

.bg-indicator {
  bottom: 4px;
  height: 2px;
}

.color-picker-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10000;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.color-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-preset:hover {
  transform: scale(1.1);
  border-color: #409eff;
}

.custom-color-input {
  width: 100%;
  height: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}

.custom-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.custom-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}
</style>