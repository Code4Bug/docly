<template>
  <div class="dropdown-menu" :class="{ 'dark-theme': isDarkTheme }">
    <button
      @click="toggleDropdown"
      class="dropdown-trigger"
      :class="{ active: isOpen }"
      @mouseenter="showTooltip && showTooltip($event, '合并菜单')"
      @mouseleave="hideTooltip && hideTooltip()"
    >
      <!-- 三条杠图标 -->
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
      </svg>
    </button>

    <!-- 下拉菜单内容 -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="dropdown-overlay"
        @click="closeDropdown"
      >
        <div
          class="dropdown-content"
          :class="{ 'dark-theme': isDarkTheme }"
          :style="dropdownStyle"
          @click.stop
        >
          <div class="dropdown-header">
            <h3>文档操作</h3>
          </div>
          
          <div class="dropdown-section">
            <button
              @click="handleImport"
              class="dropdown-item"
            >
              <div class="item-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,12L8,16H10.5V19H13.5V16H16L12,12Z" />
                </svg>
                <span>导入文档</span>
              </div>
              <kbd :class="{ 'mac-symbol': hasMacSymbols(formatShortcut('Ctrl+O')) }">{{ formatShortcut('Ctrl+O') }}</kbd>
            </button>
            
            <button
              @click="handleExport"
              class="dropdown-item"
            >
              <div class="item-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L16,15H13.5V12H10.5V15H8L12,19Z" />
                </svg>
                <span>导出文档</span>
              </div>
              <kbd :class="{ 'mac-symbol': hasMacSymbols(formatShortcut('Ctrl+E')) }">{{ formatShortcut('Ctrl+E') }}</kbd>
            </button>
          </div>

          <div class="dropdown-divider"></div>

          <div class="dropdown-section">
            <button
              @click="handleSave"
              class="dropdown-item"
            >
              <div class="item-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
                </svg>
                <span>保存文档</span>
              </div>
              <kbd :class="{ 'mac-symbol': hasMacSymbols(formatShortcut('Ctrl+S')) }">{{ formatShortcut('Ctrl+S') }}</kbd>
            </button>
          </div>

          <div class="dropdown-divider"></div>

          <div class="dropdown-section">
            <button
              @click="handleShowShortcuts"
              class="dropdown-item"
            >
              <div class="item-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12M22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12M10,17L6,13L7.41,11.58L10,14.17L16.59,7.58L18,9L10,17Z" />
                </svg>
                <span>快捷键查询</span>
              </div>
              <kbd :class="{ 'mac-symbol': hasMacSymbols(formatShortcut('Ctrl+/')) }">{{ formatShortcut('Ctrl+/') }}</kbd>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 快捷键表组件 -->
    <Teleport to="body">
      <ShortcutTable
        v-if="showShortcutTable"
        :isDarkTheme="isDarkTheme"
        @close="closeShortcutTable"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { formatShortcutDisplay } from '../utils/platform';
import ShortcutTable from './ShortcutTable.vue';

// Props
interface Props {
  isDarkTheme?: boolean;
  showTooltip?: (event: Event, text: string) => void;
  hideTooltip?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  isDarkTheme: false
});

// Emits
const emit = defineEmits<{
  'import-file': [];
  'export-file': [];
  'save-document': [];
}>();

// 响应式数据
const isOpen = ref(false);
const showShortcutTable = ref(false);
const dropdownTrigger = ref<HTMLElement>();
const dropdownStyle = ref({});

/**
 * 格式化快捷键显示
 */
const formatShortcut = (shortcut: string): string => {
  return formatShortcutDisplay(shortcut);
};

/**
 * 检查是否包含Mac符号
 */
const hasMacSymbols = (text: string): boolean => {
  return /[⌘⌥⇧]/.test(text);
};

/**
 * 切换下拉菜单
 */
const toggleDropdown = (event: Event) => {
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown(event);
  }
};

/**
 * 打开下拉菜单
 */
const openDropdown = (event: Event) => {
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  
  // 计算下拉菜单位置
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${rect.left - 10}px`,
    zIndex: 1000
  };
  
  isOpen.value = true;
};

/**
 * 关闭下拉菜单
 */
const closeDropdown = () => {
  isOpen.value = false;
};

/**
 * 处理导入
 */
const handleImport = () => {
  emit('import-file');
  closeDropdown();
};

/**
 * 处理导出
 */
const handleExport = () => {
  emit('export-file');
  closeDropdown();
};

/**
 * 处理保存
 */
const handleSave = () => {
  emit('save-document');
  closeDropdown();
};

/**
 * 显示快捷键表
 */
const handleShowShortcuts = () => {
  showShortcutTable.value = true;
  closeDropdown();
};

/**
 * 关闭快捷键表
 */
const closeShortcutTable = () => {
  showShortcutTable.value = false;
};

/**
 * 处理键盘事件
 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showShortcutTable.value) {
      closeShortcutTable();
    } else if (isOpen.value) {
      closeDropdown();
    }
  }
};

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

</script>

<script lang="ts">
export default {
  name: 'DropdownMenu'
};
</script>

<style scoped>
.dropdown-menu {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dropdown-trigger svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.dropdown-trigger:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.dropdown-trigger.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
  color: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

.dropdown-content {
  min-width: 180px;
  width: max-content;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: dropdownFadeIn 0.2s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.dropdown-section {
  padding: 6px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: none;
  color: #374151;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-height: 32px;
}

.dropdown-item .item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item svg {
  flex-shrink: 0;
  color: #6b7280;
  width: 14px;
  height: 14px;
}

.dropdown-item kbd {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;
  min-width: 20px;
  text-align: center;
}

.dropdown-divider {
  height: 1px;
  background: #e1e5e9;
  margin: 4px 0;
}

/* 暗色主题 */
.dropdown-menu.dark-theme .dropdown-trigger {
  background: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.dropdown-menu.dark-theme .dropdown-trigger:hover {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(147, 51, 234, 0.15));
  border-color: #4285f4;
  color: #4285f4;
}

.dropdown-menu.dark-theme .dropdown-trigger.active {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(147, 51, 234, 0.25));
  color: #4285f4;
  border-color: #4285f4;
}

.dropdown-content.dark-theme {
  background: #2d2d2d;
  border-color: #404040;
}

.dropdown-content.dark-theme .dropdown-header {
  background: #1a1a1a;
  border-bottom-color: #404040;
}

.dropdown-content.dark-theme .dropdown-header h3 {
  color: #e0e0e0;
}

.dropdown-content.dark-theme .dropdown-item {
  color: #e0e0e0;
}

.dropdown-content.dark-theme .dropdown-item:hover {
  background: #404040;
}

.dropdown-content.dark-theme .dropdown-item svg {
  color: #9ca3af;
}

.dropdown-content.dark-theme .dropdown-item kbd {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

/* Mac符号特殊样式 */
@media (platform: macOS) {
  .dropdown-item kbd {
    font-size: 14px;
    font-weight: 600;
  }
}

/* Mac符号特殊样式 */
.dropdown-item kbd.mac-symbol {
  font-size: 13px !important;
  font-weight: 700 !important;
  padding: 3px 8px;
  background: linear-gradient(135deg, #333333 0%, #444444 100%) !important;
  color: #ffffff !important;
  border-color: #555555 !important;
}

.dropdown-content.dark-theme .dropdown-divider {
  background: #404040;
}
</style>