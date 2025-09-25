<template>
  <div class="table-size-selector" :class="{ 'dark-theme': isDarkTheme }">
    <button
      ref="tableSizeButton"
      @click="toggleTableSizePanel"
      class="toolbar-btn table-size-btn"
      :title="tooltipText"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,8V12H11V8H5M13,8V12H19V8H13M5,14V18H11V14H5M13,14V18H19V14H13Z"
        />
      </svg>
    </button>
    
    <div v-if="showTableSizePanel" ref="tableSizePanel" class="table-size-panel">
      <div class="table-size-header">
        <span class="size-text">{{ hoveredRows }}×{{ hoveredCols }} 表格</span>
      </div>
      
      <div class="table-grid">
        <div
          v-for="row in maxRows"
          :key="`row-${row}`"
          class="table-row"
        >
          <div
            v-for="col in maxCols"
            :key="`cell-${row}-${col}`"
            class="table-cell"
            :class="{
              'highlighted': row <= hoveredRows && col <= hoveredCols,
              'selected': row <= selectedRows && col <= selectedCols
            }"
            @mouseenter="handleCellHover(row, col)"
            @mouseleave="handleCellLeave"
            @click="handleCellClick(row, col)"
          ></div>
        </div>
      </div>
      
      <div class="table-size-footer">
        <button @click="insertCustomTable" class="custom-table-btn">
          自定义表格大小...
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../composables/useTheme'
import { Console } from '../utils/Console'

/**
 * 表格尺寸选择器组件
 * 支持可视化选择表格行列数，最大支持 10x10
 */

// Props
interface Props {
  maxRows?: number
  maxCols?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxRows: 10,
  maxCols: 10
})

// Emits
interface Emits {
  (e: 'table-size-selected', size: { rows: number; cols: number }): void
  (e: 'custom-table-requested'): void
}

const emit = defineEmits<Emits>()

// 主题相关
const { isDarkTheme } = useTheme()

// 响应式数据
const showTableSizePanel = ref(false)
const hoveredRows = ref(1)
const hoveredCols = ref(1)
const selectedRows = ref(0)
const selectedCols = ref(0)
const tableSizeButton = ref<HTMLElement>()
const tableSizePanel = ref<HTMLElement>()

// 计算属性
const tooltipText = computed(() => {
  if (selectedRows.value > 0 && selectedCols.value > 0) {
    return `插入 ${selectedRows.value}×${selectedCols.value} 表格`
  }
  return '插入表格'
})

/**
 * 切换表格尺寸面板显示状态
 */
const toggleTableSizePanel = (): void => {
  showTableSizePanel.value = !showTableSizePanel.value
  
  if (showTableSizePanel.value && tableSizeButton.value && tableSizePanel.value) {
    // 定位面板位置
    const rect = tableSizeButton.value.getBoundingClientRect()
    const panel = tableSizePanel.value
    
    panel.style.position = 'fixed'
    panel.style.top = `${rect.bottom + 5}px`
    panel.style.left = `${rect.left}px`
    panel.style.zIndex = '1000'
  }
}

/**
 * 处理单元格悬停事件
 * @param row - 行号
 * @param col - 列号
 */
const handleCellHover = (row: number, col: number): void => {
  hoveredRows.value = row
  hoveredCols.value = col
}

/**
 * 处理单元格离开事件
 */
const handleCellLeave = (): void => {
  // 保持当前悬停状态，直到鼠标移动到其他单元格
}

/**
 * 处理单元格点击事件
 * @param row - 行号
 * @param col - 列号
 */
const handleCellClick = (row: number, col: number): void => {
  selectedRows.value = row
  selectedCols.value = col
  
  Console.debug('TableSizeSelector: 选择表格尺寸', { rows: row, cols: col })
  
  // 发射表格尺寸选择事件
  emit('table-size-selected', { rows: row, cols: col })
  
  // 关闭面板
  showTableSizePanel.value = false
}

/**
 * 插入自定义表格
 */
const insertCustomTable = (): void => {
  Console.debug('TableSizeSelector: 请求自定义表格')
  emit('custom-table-requested')
  showTableSizePanel.value = false
}

/**
 * 处理点击外部区域关闭面板
 */
const handleClickOutside = (event: MouseEvent): void => {
  if (showTableSizePanel.value &&
      tableSizeButton.value &&
      tableSizePanel.value &&
      !tableSizeButton.value.contains(event.target as Node) &&
      !tableSizePanel.value.contains(event.target as Node)) {
    showTableSizePanel.value = false
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 组件名称
defineOptions({
  name: 'TableSizeSelector'
})
</script>

<script lang="ts">
export default {
  name: 'TableSizeSelector'
}
</script>

<style scoped>
.table-size-selector {
  position: relative;
  display: inline-block;
}

.table-size-btn {
  padding: 8px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #374151;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-size-btn:hover {
  background: #f6f8fa;
  border-color: #3b82f6;
  color: #3b82f6;
}

.table-size-panel {
  position: fixed;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
  padding: 12px;
  min-width: 240px;
  z-index: 1000;
}

.table-size-header {
  text-align: center;
  margin-bottom: 8px;
  padding: 4px 0;
}

.size-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.table-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.table-row {
  display: flex;
  gap: 2px;
}

.table-cell {
  width: 18px;
  height: 18px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.1s ease;
}

.table-cell:hover {
  border-color: #3b82f6;
}

.table-cell.highlighted {
  background: #dbeafe;
  border-color: #3b82f6;
}

.table-cell.selected {
  background: #3b82f6;
  border-color: #2563eb;
}

.table-size-footer {
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}

.custom-table-btn {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #374151;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.custom-table-btn:hover {
  background: #f6f8fa;
  border-color: #3b82f6;
  color: #3b82f6;
}

/* 深色主题样式 */
.table-size-selector.dark-theme .table-size-btn {
  background: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.table-size-selector.dark-theme .table-size-btn:hover {
  background: #404040;
  border-color: #4285f4;
  color: #4285f4;
}

.table-size-selector.dark-theme .table-size-panel {
  background: #2d2d2d;
  border-color: #404040;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.table-size-selector.dark-theme .size-text {
  color: #e0e0e0;
}

.table-size-selector.dark-theme .table-cell {
  background: #1a1a1a;
  border-color: #404040;
}

.table-size-selector.dark-theme .table-cell:hover {
  border-color: #4285f4;
}

.table-size-selector.dark-theme .table-cell.highlighted {
  background: #1e3a8a;
  border-color: #4285f4;
}

.table-size-selector.dark-theme .table-cell.selected {
  background: #4285f4;
  border-color: #60a5fa;
}

.table-size-selector.dark-theme .table-size-footer {
  border-top-color: #404040;
}

.table-size-selector.dark-theme .custom-table-btn {
  background: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.table-size-selector.dark-theme .custom-table-btn:hover {
  background: #404040;
  border-color: #4285f4;
  color: #4285f4;
}
</style>