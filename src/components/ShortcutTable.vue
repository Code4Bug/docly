<template>
  <!-- 弹窗模式 -->
  <div 
    v-if="!isEmbedded" 
    class="shortcut-table-overlay" 
    @click.self="$emit('close')"
  >
    <div class="shortcut-table-container" :class="{ 'dark-theme': isDarkTheme }">
      <!-- 头部 -->
      <div class="table-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12M22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12M10,17L6,13L7.41,11.58L10,14.17L16.59,7.58L18,9L10,17Z" />
          </svg>
          <h3>快捷键查询</h3>
          <span class="system-info">{{ systemInfo }}</span>
        </div>
        <div class="header-actions">
          <button @click="exportShortcuts" class="action-btn" title="导出快捷键配置">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L16,15H13.5V12H10.5V15H8L12,19Z" />
            </svg>
          </button>
          <button @click="$emit('close')" class="close-btn" title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
      </div>

      <ShortcutTableContent 
        :isDarkTheme="isDarkTheme"
        :isEmbedded="false"
        @close="$emit('close')"
      />
    </div>
  </div>
  
  <!-- 嵌入模式 -->
  <div v-else class="shortcut-table-container embedded" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 头部 -->
    <div class="table-header">
      <div class="header-left">
        <h3>快捷键查询</h3>
        <span class="system-info">{{ systemInfo }}</span>
      </div>
      <div class="header-actions">
        <button @click="$emit('close')" class="close-btn" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </svg>
        </button>
      </div>
    </div>

    <ShortcutTableContent 
      :isDarkTheme="isDarkTheme"
      :isEmbedded="true"
      @close="$emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getSystemInfo } from '../utils/platform';
import ShortcutTableContent from './ShortcutTableContent.vue';

// Props
interface Props {
  isDarkTheme?: boolean;
  isEmbedded?: boolean; // 是否为嵌入模式（在快捷键面板中使用）
}

const props = withDefaults(defineProps<Props>(), {
  isDarkTheme: false,
  isEmbedded: false
});

// Emits
const emit = defineEmits<{
  close: [];
}>();

// 系统信息
const systemInfo = computed(() => {
  const info = getSystemInfo();
  if (info.isMacOS) return 'macOS';
  if (info.isWindows) return 'Windows';
  if (info.isLinux) return 'Linux';
  return '未知系统';
});

/**
 * 导出快捷键配置
 */
const exportShortcuts = (): void => {
  try {
    const { shortcutManager } = require('../core/ShortcutManager');
    const config = shortcutManager.exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortcuts-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出快捷键配置失败:', error);
  }
};
</script>

<script lang="ts">
export default {
  name: 'ShortcutTable'
};
</script>

<style scoped>
.shortcut-table-overlay {
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
  padding: 30px;
}

.shortcut-table-container {
  width: 100%;
  max-width: 1600px;
  max-height: 85vh;
  background: #f5f5f5;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
}

/* 嵌入模式样式 */
.shortcut-table-container.embedded {
  max-width: none;
  max-height: none;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
  border: none;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e0e0e0;
  background: #ffffff;
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
  color: #333333;
}

.system-info {
  padding: 4px 8px;
  background: #e0e0e0;
  border-radius: 4px;
  font-size: 11px;
  color: #666666;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn,
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover,
.close-btn:hover {
  background: #e0e0e0;
  color: #333333;
}

/* 暗色主题 */
.shortcut-table-container.dark-theme {
  background: #1a1a1a;
  color: #e0e0e0;
  border-color: #333333;
}

.shortcut-table-container.embedded.dark-theme {
  background: #1a1a1a;
}

.shortcut-table-container.dark-theme .table-header {
  background: #1a1a1a;
  border-bottom-color: #333333;
}

.shortcut-table-container.dark-theme .header-left h3 {
  color: #e0e0e0;
}

.shortcut-table-container.dark-theme .system-info {
  background: #333333;
  color: #cccccc;
}

.shortcut-table-container.dark-theme .action-btn:hover,
.shortcut-table-container.dark-theme .close-btn:hover {
  background: #333333;
  color: #e0e0e0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .shortcut-table-container {
    max-width: 98vw;
  }
}

@media (max-width: 768px) {
  .shortcut-table-overlay {
    padding: 15px;
  }
  
  .shortcut-table-container {
    max-height: 90vh;
    max-width: 100%;
    border-radius: 12px;
  }
  
  .table-header {
    padding: 20px 24px;
  }
  
  .header-left h3 {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .shortcut-table-overlay {
    padding: 10px;
  }
  
  .table-header {
    padding: 16px 20px;
  }
  
  .header-left {
    gap: 8px;
  }
  
  .header-left h3 {
    font-size: 15px;
  }
  
  .system-info {
    display: none;
  }
}
</style>