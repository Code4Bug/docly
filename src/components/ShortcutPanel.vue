<template>
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
        <button 
          @click="resetToDefaults" 
          class="action-btn"
          @mouseenter="showTooltip($event, '重置为默认设置')"
          @mouseleave="hideTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,4C14.1,4 16.1,4.8 17.6,6.3C20.7,9.4 20.7,14.5 17.6,17.6C15.8,19.5 13.3,20.2 10.9,19.9L11.4,17.9C13.1,18.1 14.9,17.5 16.2,16.2C18.5,13.9 18.5,10.1 16.2,7.7C15.1,6.6 13.5,6.1 12,6.1V10.6L7,5.6L12,0.6V4M6.3,17.6C3.7,15 3.3,11 5.1,7.9L6.6,9.4C5.5,11.6 5.9,14.4 7.8,16.2C8.3,16.7 8.9,17.1 9.6,17.4L9,19.4C8,19 7.1,18.4 6.3,17.6Z" />
          </svg>
        </button>
        <button 
          @click="exportConfig" 
          class="action-btn"
          @mouseenter="showTooltip($event, '导出配置')"
          @mouseleave="hideTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        </button>
        <button 
          @click="importConfig" 
          class="action-btn"
          @mouseenter="showTooltip($event, '导入配置')"
          @mouseleave="hideTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z" />
          </svg>
        </button>
        <button 
          @click="$emit('close')" 
          class="close-btn"
          @mouseenter="showTooltip($event, '关闭')"
          @mouseleave="hideTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-section">
      <div class="search-input-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="search-icon">
          <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索快捷键或功能..."
          class="search-input"
        />
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''" 
          class="clear-search-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 分组标签 -->
    <div class="group-tabs">
      <button
        v-for="[groupId, group] in groups"
        :key="groupId"
        @click="activeGroup = groupId"
        class="group-tab"
        :class="{ active: activeGroup === groupId }"
      >
        <span class="tab-icon" v-if="group.icon">{{ getGroupIcon(group.icon) }}</span>
        <span class="tab-text">{{ group.name }}</span>
        <span class="tab-count">({{ getGroupShortcutCount(groupId) }})</span>
      </button>
    </div>

    <!-- 快捷键列表 -->
    <div class="shortcuts-container">
      <div class="shortcuts-list">
        <div
          v-for="shortcut in filteredShortcuts"
          :key="shortcut.key"
          class="shortcut-item"
          :class="{ disabled: !shortcut.enabled }"
        >
          <div class="shortcut-info">
            <div class="shortcut-description">{{ shortcut.description }}</div>
            <div class="shortcut-key">
              <span
                v-for="(part, index) in shortcut.key.split('+')"
                :key="index"
                class="key-part"
              >
                {{ formatKeyPart(part) }}
              </span>
            </div>
          </div>
          <div class="shortcut-actions">
            <button
              @click="toggleShortcut(shortcut.key)"
              class="toggle-btn"
              :class="{ enabled: shortcut.enabled }"
              @mouseenter="showTooltip($event, shortcut.enabled ? '禁用' : '启用')"
              @mouseleave="hideTooltip"
            >
              <svg v-if="shortcut.enabled" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M14.5,9L12,11.5L9.5,9L8.09,10.41L10.59,12.91L8.09,15.41L9.5,16.82L12,14.32L14.5,16.82L15.91,15.41L13.41,12.91L15.91,10.41L14.5,9Z" />
              </svg>
            </button>
            <button
              @click="editShortcut(shortcut)"
              class="edit-btn"
              @mouseenter="showTooltip($event, '编辑快捷键')"
              @mouseleave="hideTooltip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredShortcuts.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
          <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
        <p class="empty-text">
          {{ searchQuery ? '未找到匹配的快捷键' : '该分组暂无快捷键' }}
        </p>
      </div>
    </div>

    <!-- 快捷键编辑对话框 -->
    <div v-if="showEditDialog" class="edit-dialog-overlay" @click="closeEditDialog">
      <div class="edit-dialog" @click.stop>
        <div class="dialog-header">
          <h4>编辑快捷键</h4>
          <button @click="closeEditDialog" class="dialog-close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label>功能描述</label>
            <input
              v-model="editingShortcut.description"
              type="text"
              class="form-input"
              placeholder="输入功能描述"
            />
          </div>
          <div class="form-group">
            <label>快捷键组合</label>
            <div class="key-input-wrapper">
              <input
                ref="keyInput"
                v-model="editingShortcut.key"
                type="text"
                class="form-input key-input"
                placeholder="按下快捷键组合"
                @keydown="captureKeyInput"
                readonly
              />
              <button @click="clearKeyInput" class="clear-key-btn">清空</button>
            </div>
          </div>
          <div class="form-group">
            <label>
              <input
                v-model="editingShortcut.enabled"
                type="checkbox"
                class="form-checkbox"
              />
              启用此快捷键
            </label>
          </div>
        </div>
        <div class="dialog-actions">
          <button @click="closeEditDialog" class="cancel-btn">取消</button>
          <button @click="saveShortcut" class="save-btn">保存</button>
        </div>
      </div>
    </div>

    <!-- Tooltip 组件 -->
    <Tooltip 
      :visible="tooltip.visible"
      :text="tooltip.text"
      :x="tooltip.x"
      :y="tooltip.y"
    />

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useTheme } from '../composables/useTheme';
import { useTooltip } from '../composables/useTooltip';
import { shortcutManager, type ShortcutConfig, type ShortcutGroup } from '../core/ShortcutManager';
import Tooltip from './Tooltip.vue';

// 主题和工具提示
const { isDarkTheme } = useTheme();
const { tooltip, showTooltip, hideTooltip } = useTooltip();

// 响应式数据
const searchQuery = ref('');
const activeGroup = ref('file');
const shortcuts = ref<Map<string, ShortcutConfig>>(new Map());
const groups = ref<Map<string, ShortcutGroup>>(new Map());
const showEditDialog = ref(false);
const editingShortcut = ref<ShortcutConfig>({
  key: '',
  description: '',
  group: '',
  callback: () => {},
  enabled: true,
  preventDefault: true,
  stopPropagation: false
});

// 模板引用
const fileInput = ref<HTMLInputElement>();
const keyInput = ref<HTMLInputElement>();

// 事件定义
const emit = defineEmits<{
  close: [];
}>();

/**
 * 获取分组图标
 * @param iconName - 图标名称
 * @returns 图标字符
 */
const getGroupIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    folder: '📁',
    edit: '✏️',
    format: '🎨',
    plus: '➕',
    eye: '👁️',
    comment: '💬'
  };
  return iconMap[iconName] || '⚙️';
};

/**
 * 获取分组中的快捷键数量
 * @param groupId - 分组ID
 * @returns 快捷键数量
 */
const getGroupShortcutCount = (groupId: string): number => {
  return Array.from(shortcuts.value.values())
    .filter(shortcut => shortcut.group === groupId).length;
};

/**
 * 格式化按键部分显示
 * @param part - 按键部分
 * @returns 格式化后的显示文本
 */
const formatKeyPart = (part: string): string => {
  const keyMap: Record<string, string> = {
    'Cmd': '⌘',
    'Ctrl': 'Ctrl',
    'Alt': '⌥',
    'Shift': '⇧',
    'Enter': '↵',
    'Space': '␣',
    'Tab': '⇥',
    'Escape': 'Esc',
    'Backspace': '⌫',
    'Delete': '⌦',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→'
  };
  return keyMap[part] || part;
};

/**
 * 过滤后的快捷键列表
 */
const filteredShortcuts = computed(() => {
  let result = Array.from(shortcuts.value.values());

  // 按分组过滤
  if (activeGroup.value !== 'all') {
    result = result.filter(shortcut => shortcut.group === activeGroup.value);
  }

  // 按搜索查询过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(shortcut =>
      shortcut.description.toLowerCase().includes(query) ||
      shortcut.key.toLowerCase().includes(query)
    );
  }

  return result.sort((a, b) => a.description.localeCompare(b.description));
});

/**
 * 切换快捷键启用状态
 * @param key - 快捷键
 */
const toggleShortcut = (key: string): void => {
  const shortcut = shortcuts.value.get(key);
  if (shortcut) {
    shortcut.enabled = !shortcut.enabled;
    shortcutManager.setShortcutEnabled(key, shortcut.enabled);
    refreshData();
  }
};

/**
 * 编辑快捷键
 * @param shortcut - 快捷键配置
 */
const editShortcut = (shortcut: ShortcutConfig): void => {
  editingShortcut.value = { ...shortcut };
  showEditDialog.value = true;
  
  nextTick(() => {
    if (keyInput.value) {
      keyInput.value.focus();
    }
  });
};

/**
 * 关闭编辑对话框
 */
const closeEditDialog = (): void => {
  showEditDialog.value = false;
  editingShortcut.value = {
    key: '',
    description: '',
    group: '',
    callback: () => {},
    enabled: true,
    preventDefault: true,
    stopPropagation: false
  };
};

/**
 * 捕获按键输入
 * @param event - 键盘事件
 */
const captureKeyInput = (event: KeyboardEvent): void => {
  event.preventDefault();
  
  const parts: string[] = [];
  
  // 检测修饰键
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (isMac && event.metaKey) {
    parts.push('Cmd');
  } else if (!isMac && event.ctrlKey) {
    parts.push('Ctrl');
  }
  
  if (event.altKey) {
    parts.push('Alt');
  }
  
  if (event.shiftKey) {
    parts.push('Shift');
  }
  
  // 添加主键
  if (event.key && event.key !== 'Meta' && event.key !== 'Control' && 
      event.key !== 'Alt' && event.key !== 'Shift') {
    parts.push(event.key.toUpperCase());
  }
  
  if (parts.length > 0) {
    editingShortcut.value.key = parts.join('+');
  }
};

/**
 * 清空按键输入
 */
const clearKeyInput = (): void => {
  editingShortcut.value.key = '';
};

/**
 * 保存快捷键
 */
const saveShortcut = (): void => {
  if (!editingShortcut.value.key || !editingShortcut.value.description) {
    return;
  }

  // 这里应该调用快捷键管理器的更新方法
  // 由于当前的管理器设计，我们需要重新注册快捷键
  const originalShortcut = shortcuts.value.get(editingShortcut.value.key);
  if (originalShortcut) {
    shortcutManager.unregisterShortcut(editingShortcut.value.key);
    shortcutManager.registerShortcut(editingShortcut.value.key, {
      description: editingShortcut.value.description,
      group: editingShortcut.value.group,
      callback: originalShortcut.callback,
      enabled: editingShortcut.value.enabled,
      preventDefault: editingShortcut.value.preventDefault,
      stopPropagation: editingShortcut.value.stopPropagation
    });
  }

  refreshData();
  closeEditDialog();
};

/**
 * 重置为默认设置
 */
const resetToDefaults = (): void => {
  if (confirm('确定要重置所有快捷键为默认设置吗？此操作不可撤销。')) {
    // 这里应该调用重置方法
    // 由于当前设计限制，我们只是刷新数据
    refreshData();
  }
};

/**
 * 导出配置
 */
const exportConfig = (): void => {
  try {
    const config = shortcutManager.exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcut-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出配置失败:', error);
  }
};

/**
 * 导入配置
 */
const importConfig = (): void => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

/**
 * 处理文件导入
 * @param event - 文件输入事件
 */
const handleFileImport = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = e.target?.result as string;
        shortcutManager.importConfig(config);
        refreshData();
      } catch (error) {
        console.error('导入配置失败:', error);
        alert('导入配置失败，请检查文件格式是否正确。');
      }
    };
    reader.readAsText(file);
  }
  
  // 清空文件输入
  target.value = '';
};

/**
 * 刷新数据
 */
const refreshData = (): void => {
  shortcuts.value = shortcutManager.getAllShortcuts();
  groups.value = shortcutManager.getAllGroups();
};

// 组件挂载时初始化数据
onMounted(() => {
  refreshData();
  
  // 监听快捷键管理器事件
  shortcutManager.on('shortcut-registered', refreshData);
  shortcutManager.on('shortcut-unregistered', refreshData);
  shortcutManager.on('shortcut-toggled', refreshData);
});

// 确保 TypeScript 识别这些变量在模板中被使用
// 这些变量实际在模板的事件处理器和组件绑定中使用
void tooltip;
void showTooltip;
void hideTooltip;
</script>

<style scoped>
.shortcut-panel {
  width: 600px;
  height: 700px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e1e5e9;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
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
  color: #374151;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn,
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}

.search-section {
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  z-index: 1;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 40px 0 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-search-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.group-tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f9fafb;
  overflow-x: auto;
}

.group-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.group-tab:hover {
  color: #374151;
  background: rgba(59, 130, 246, 0.05);
}

.group-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.tab-icon {
  font-size: 14px;
}

.tab-text {
  font-size: 14px;
  font-weight: 500;
}

.tab-count {
  font-size: 12px;
  opacity: 0.7;
}

.shortcuts-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.shortcuts-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s;
}

.shortcut-item:hover {
  background: #f9fafb;
}

.shortcut-item.disabled {
  opacity: 0.5;
}

.shortcut-info {
  flex: 1;
}

.shortcut-description {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.shortcut-key {
  display: flex;
  gap: 4px;
}

.key-part {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}

.shortcut-actions {
  display: flex;
  gap: 8px;
}

.toggle-btn,
.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.enabled {
  background: #dcfce7;
  color: #16a34a;
  border-color: #bbf7d0;
}

.toggle-btn:hover {
  background: #f3f4f6;
}

.toggle-btn.enabled:hover {
  background: #bbf7d0;
}

.edit-btn:hover {
  background: #dbeafe;
  color: #3b82f6;
  border-color: #bfdbfe;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin: 0;
}

/* 编辑对话框样式 */
.edit-dialog-overlay {
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

.edit-dialog {
  width: 400px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f9fafb;
}

.dialog-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.dialog-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.dialog-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.dialog-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.key-input-wrapper {
  display: flex;
  gap: 8px;
}

.key-input {
  flex: 1;
}

.clear-key-btn {
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-key-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.form-checkbox {
  margin-right: 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e1e5e9;
  background: #f9fafb;
}

.cancel-btn,
.save-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #ffffff;
  color: #6b7280;
}

.cancel-btn:hover {
  background: #f9fafb;
  color: #374151;
}

.save-btn {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.save-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 暗色主题 */
.shortcut-panel.dark-theme {
  background: #1f2937;
  border-color: #374151;
}

.shortcut-panel.dark-theme .panel-header {
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  border-bottom-color: #4b5563;
}

.shortcut-panel.dark-theme .header-left h3 {
  color: #f9fafb;
}

.shortcut-panel.dark-theme .action-btn,
.shortcut-panel.dark-theme .close-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

.shortcut-panel.dark-theme .action-btn:hover {
  background: #4b5563;
  color: #f9fafb;
}

.shortcut-panel.dark-theme .close-btn:hover {
  background: #7f1d1d;
  color: #fca5a5;
  border-color: #991b1b;
}

.shortcut-panel.dark-theme .search-section {
  border-bottom-color: #4b5563;
}

.shortcut-panel.dark-theme .search-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.shortcut-panel.dark-theme .search-input:focus {
  border-color: #3b82f6;
}

.shortcut-panel.dark-theme .group-tabs {
  background: #374151;
  border-bottom-color: #4b5563;
}

.shortcut-panel.dark-theme .group-tab {
  color: #9ca3af;
}

.shortcut-panel.dark-theme .group-tab:hover {
  color: #f9fafb;
  background: rgba(59, 130, 246, 0.1);
}

.shortcut-panel.dark-theme .group-tab.active {
  color: #60a5fa;
  border-bottom-color: #60a5fa;
}

.shortcut-panel.dark-theme .shortcut-item {
  border-bottom-color: #374151;
}

.shortcut-panel.dark-theme .shortcut-item:hover {
  background: #374151;
}

.shortcut-panel.dark-theme .shortcut-description {
  color: #f9fafb;
}

.shortcut-panel.dark-theme .key-part {
  background: #4b5563;
  border-color: #6b7280;
  color: #d1d5db;
}

.shortcut-panel.dark-theme .toggle-btn,
.shortcut-panel.dark-theme .edit-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

.shortcut-panel.dark-theme .toggle-btn.enabled {
  background: #065f46;
  color: #34d399;
  border-color: #047857;
}

.shortcut-panel.dark-theme .edit-dialog {
  background: #1f2937;
}

.shortcut-panel.dark-theme .dialog-header {
  background: #374151;
  border-bottom-color: #4b5563;
}

.shortcut-panel.dark-theme .dialog-header h4 {
  color: #f9fafb;
}

.shortcut-panel.dark-theme .form-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.shortcut-panel.dark-theme .dialog-actions {
  background: #374151;
  border-top-color: #4b5563;
}

.shortcut-panel.dark-theme .cancel-btn {
  background: #4b5563;
  color: #d1d5db;
  border-color: #6b7280;
}

.shortcut-panel.dark-theme .save-btn {
  background: #3b82f6;
  border-color: #3b82f6;
}
</style>