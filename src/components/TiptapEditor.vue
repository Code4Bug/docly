<template>
  <div class="tiptap-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button @click="toggleBold" :class="{ active: editor?.isActive('bold') }">
          <strong>B</strong>
        </button>
        <button @click="toggleItalic" :class="{ active: editor?.isActive('italic') }">
          <em>I</em>
        </button>
        <button @click="toggleUnderline" :class="{ active: editor?.isActive('underline') }">
          <u>U</u>
        </button>
      </div>
      
      <div class="toolbar-group">
        <button @click="setHeading(1)" :class="{ active: editor?.isActive('heading', { level: 1 }) }">
          H1
        </button>
        <button @click="setHeading(2)" :class="{ active: editor?.isActive('heading', { level: 2 }) }">
          H2
        </button>
        <button @click="setParagraph" :class="{ active: editor?.isActive('paragraph') }">
          P
        </button>
      </div>
      
      <div class="toolbar-group">
        <button @click="toggleBulletList" :class="{ active: editor?.isActive('bulletList') }">
          • 列表
        </button>
        <button @click="toggleOrderedList" :class="{ active: editor?.isActive('orderedList') }">
          1. 列表
        </button>
        <button @click="toggleBlockquote" :class="{ active: editor?.isActive('blockquote') }">
          引用
        </button>
      </div>
      
      <div class="toolbar-group">
        <button @click="undo" :disabled="!canUndo">
          撤销
        </button>
        <button @click="redo" :disabled="!canRedo">
          重做
        </button>
      </div>
      
      <div class="toolbar-group">
        <button @click="importFile">
          导入
        </button>
        <button @click="exportFile">
          导出
        </button>
      </div>
    </div>

    <!-- 编辑器容器 -->
    <div class="editor-container">
      <editor-content :editor="editor" class="editor-content" />
    </div>

    <!-- 状态栏 -->
    <div class="editor-status">
      <span>字符数: {{ characterCount }}</span>
      <span>单词数: {{ wordCount }}</span>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".docx,.doc"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { WordHandler } from '../fileHandlers/WordHandler'

/**
 * 组件属性接口
 */
interface Props {
  readOnly?: boolean
  placeholder?: string
  initialContent?: string
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  placeholder: '开始编写您的文档...',
  initialContent: ''
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  change: [content: string]
}>()

// 响应式数据
const editor = ref<Editor>()
const fileInputRef = ref<HTMLInputElement>()
const wordHandler = ref<WordHandler>()

// 编辑器状态
const characterCount = computed(() => {
  if (!editor.value) return 0
  return editor.value.getText().length
})

const wordCount = computed(() => {
  if (!editor.value) return 0
  const text = editor.value.getText()
  return text.trim() ? text.trim().split(/\s+/).length : 0
})

const canUndo = computed(() => editor.value?.can().undo() || false)
const canRedo = computed(() => editor.value?.can().redo() || false)

/**
 * 初始化编辑器
 */
const initEditor = () => {
  editor.value = new Editor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
    ],
    content: props.initialContent || `<p>${props.placeholder}</p>`,
    editable: !props.readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      emit('change', html)
    }
  })
}

/**
 * 格式化命令
 */
const toggleBold = () => editor.value?.chain().focus().toggleBold().run()
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run()
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run()

const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

const setParagraph = () => editor.value?.chain().focus().setParagraph().run()

const toggleBulletList = () => editor.value?.chain().focus().toggleBulletList().run()
const toggleOrderedList = () => editor.value?.chain().focus().toggleOrderedList().run()
const toggleBlockquote = () => editor.value?.chain().focus().toggleBlockquote().run()

/**
 * 历史记录命令
 */
const undo = () => editor.value?.chain().focus().undo().run()
const redo = () => editor.value?.chain().focus().redo().run()

/**
 * 获取编辑器内容
 */
const getHTML = (): string => {
  return editor.value?.getHTML() || ''
}

const getText = (): string => {
  return editor.value?.getText() || ''
}

const setContent = (content: string) => {
  editor.value?.commands.setContent(content)
}

/**
 * 文件操作
 */
const importFile = () => {
  fileInputRef.value?.click()
}

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  try {
    if (!wordHandler.value) {
      wordHandler.value = new WordHandler()
    }
    
    const html = await wordHandler.value.importToHtml(file)
    editor.value?.commands.setContent(html)
    
    emit('change', html)
  } catch (error) {
    console.error('文件导入失败:', error)
  }
  
  // 清空文件输入
  target.value = ''
}

const exportFile = async () => {
  try {
    if (!wordHandler.value) {
      wordHandler.value = new WordHandler()
    }
    
    const html = editor.value?.getHTML() || ''
    const file = await wordHandler.value.exportFromHtml(html)
    
    // 下载文件
    const url = URL.createObjectURL(file.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('文件导出失败:', error)
  }
}

// 生命周期
onMounted(() => {
  initEditor()
  wordHandler.value = new WordHandler()
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// 暴露方法给父组件
defineExpose({
  getHTML,
  getText,
  setContent,
  focus: () => editor.value?.commands.focus(),
  isEmpty: () => editor.value?.isEmpty || true
})
</script>

<style scoped>
.tiptap-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  padding: 0 8px;
  border-right: 1px solid #e0e0e0;
}

.toolbar-group:last-child {
  border-right: none;
}

.toolbar-group button {
  padding: 6px 12px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #24292f;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toolbar-group button:hover {
  background: #f3f4f6;
  border-color: #8b949e;
}

.toolbar-group button.active {
  background: #0969da;
  color: #ffffff;
  border-color: #0969da;
}

.toolbar-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-container {
  flex: 1;
  overflow: auto;
}

.editor-content {
  padding: 20px;
  min-height: 400px;
  outline: none;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  line-height: 1.6;
}

.editor-content :deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
}

.editor-content :deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.75em 0;
}

.editor-content :deep(.ProseMirror p) {
  margin: 1em 0;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 1em 0;
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin: 1em 0;
  font-style: italic;
}

.editor-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
  font-size: 12px;
  color: #656d76;
}
</style>