<template>
  <div class="table-content" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 搜索框 -->
    <div class="search-section" :class="{ 'dark-theme': isDarkTheme }">
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
      </div>
    </div>



    <!-- 快捷键表格 -->
    <div class="shortcuts-table" :class="{ 'dark-theme': isDarkTheme }">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="col-function">功能</th>
              <th class="col-shortcut">快捷键</th>
              <th class="col-description">说明</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(shortcuts, groupId) in groupedShortcuts" :key="groupId">
              <!-- 分组标题行 -->
              <tr class="group-header-row">
                <td colspan="3" class="group-header">
                  <span class="group-title">{{ getGroupName(groupId) }}</span>
                  <span class="group-count">({{ shortcuts.length }})</span>
                </td>
              </tr>
              <!-- 该分组的快捷键 -->
              <tr
                v-for="shortcut in shortcuts"
                :key="shortcut.key"
                class="shortcut-row"
              >
                <td class="col-function">
                  <div class="function-cell">
                    <span class="function-name">{{ shortcut.description }}</span>
                  </div>
                </td>
                <td class="col-shortcut">
                  <kbd 
                    class="shortcut-kbd" 
                    :class="{ 'mac-symbol': hasMacSymbols(formatShortcut(shortcut.key)) }"
                  >
                    {{ formatShortcut(shortcut.key) }}
                  </kbd>
                </td>
                <td class="col-description">
                  <span class="description-text">{{ getShortcutDescription(shortcut) }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        
        <!-- 空状态 -->
        <div v-if="Object.keys(groupedShortcuts).length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
          </svg>
          <p class="empty-text">
            {{ searchQuery ? '未找到匹配的快捷键' : '暂无快捷键' }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- 底部信息 -->
  <div class="table-footer" :class="{ 'dark-theme': isDarkTheme }">
    <div class="footer-info">
      <span v-if="isEmbedded">按 <kbd :class="{ 'mac-symbol': hasMacSymbols(formatShortcut('Ctrl+/')) }">{{ formatShortcut('Ctrl+/') }}</kbd> 显示/隐藏此面板</span>
      <span v-if="isEmbedded">•</span>
      <span>共 {{ totalShortcuts }} 个快捷键</span>
      <span v-if="!isEmbedded">•</span>
      <span v-if="!isEmbedded">系统：{{ systemInfo }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { shortcutManager, type ShortcutConfig, type ShortcutGroup } from '../core/ShortcutManager';
import { formatShortcutDisplay, getSystemInfo } from '../utils/platform';

// Props
interface Props {
  isDarkTheme?: boolean;
  isEmbedded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isDarkTheme: false,
  isEmbedded: false
});

// Emits
const emit = defineEmits<{
  close: [];
}>();

// 响应式数据
const searchQuery = ref('');
const shortcuts = ref<ShortcutConfig[]>([]);
const groups = ref<Map<string, ShortcutGroup>>(new Map());

// 系统信息
const systemInfo = computed(() => {
  const info = getSystemInfo();
  if (info.isMacOS) return 'macOS';
  if (info.isWindows) return 'Windows';
  if (info.isLinux) return 'Linux';
  return '未知系统';
});



// 按分组组织的快捷键
const groupedShortcuts = computed(() => {
  let filtered = shortcuts.value;
  
  // 按搜索查询过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(shortcut => 
      shortcut.description.toLowerCase().includes(query) ||
      shortcut.key.toLowerCase().includes(query) ||
      getGroupName(shortcut.group).toLowerCase().includes(query)
    );
  }
  
  // 按分组组织
  const grouped: { [key: string]: ShortcutConfig[] } = {};
  filtered.forEach(shortcut => {
    if (!grouped[shortcut.group]) {
      grouped[shortcut.group] = [];
    }
    grouped[shortcut.group].push(shortcut);
  });
  
  // 对每个分组内的快捷键排序
  Object.keys(grouped).forEach(group => {
    grouped[group].sort((a, b) => a.description.localeCompare(b.description));
  });
  
  return grouped;
});

// 统计信息
const totalShortcuts = computed(() => shortcuts.value.length);

/**
 * 格式化快捷键显示
 */
const formatShortcut = (key: string): string => {
  return formatShortcutDisplay(key);
};

/**
 * 检查是否包含Mac符号
 */
const hasMacSymbols = (text: string): boolean => {
  return /[⌘⌥⇧]/.test(text);
};

/**
 * 获取分组名称
 */
const getGroupName = (groupId: string): string => {
  const group = groups.value.get(groupId);
  return group?.name || groupId;
};



/**
 * 获取快捷键详细说明
 */
const getShortcutDescription = (shortcut: ShortcutConfig): string => {
  const descriptions: Record<string, string> = {
    'file': '文件相关操作',
    'edit': '编辑相关操作',
    'format': '格式化相关操作',
    'insert': '插入内容相关操作',
    'view': '视图控制相关操作',
    'annotation': '批注功能相关操作'
  };
  
  return descriptions[shortcut.group] || '其他操作';
};

/**
 * 加载快捷键数据
 */
const loadShortcuts = (): void => {
  shortcuts.value = Array.from(shortcutManager.getAllShortcuts().values());
  groups.value = shortcutManager.getAllGroups();
};

// 生命周期
onMounted(() => {
  loadShortcuts();
});
</script>

<script lang="ts">
export default {
  name: 'ShortcutTableContent'
};
</script>

<style scoped>
.table-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-section {
  padding: 12px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #ffffff;
}

.search-input-wrapper {
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  width: 14px;
  height: 14px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  background: #ffffff;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}



.shortcuts-table {
  flex: 1;
  overflow: hidden;
}

.table-scroll {
  height: 100%;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}

th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 10px;
  color: #333333;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e0e0e0;
  background: #ffffff;
}

.col-function { width: 35%; }
.col-shortcut { width: 25%; }
.col-description { width: 40%; }

.shortcut-row {
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.shortcut-row:hover {
  background: #f9f9f9;
}

.group-header-row {
  background: #f5f5f5;
}

.group-header {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 12px;
  color: #333333;
  border-bottom: 1px solid #e0e0e0;
}

.group-title {
  color: #333333;
}

.group-count {
  font-size: 10px;
  color: #666666;
  margin-left: 8px;
}



td {
  padding: 8px 16px;
  vertical-align: middle;
}

.function-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.function-name {
  font-weight: 500;
  color: #333333;
  font-size: 12px;
}

.function-group {
  font-size: 10px;
  color: #666666;
}

.shortcut-kbd {
  display: inline-block;
  padding: 4px 8px;
  background: linear-gradient(135deg, #f9f9f9 0%, #e8e8e8 100%);
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #333333;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  min-width: 28px;
  text-align: center;
  line-height: 1.2;
}

/* 为包含Mac符号的kbd元素添加特殊样式 */
.shortcut-kbd.mac-symbol {
  font-size: 13px !important;
  font-weight: 700 !important;
  padding: 5px 10px;
  background: linear-gradient(135deg, #333333 0%, #444444 100%);
  color: #ffffff !important;
  border-color: #555555 !important;
}

.description-text {
  color: #666666;
  font-size: 11px;
  line-height: 1.3;
}



.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  font-size: 14px;
}

.table-footer {
  padding: 12px 24px;
  border-top: 1px solid #e0e0e0;
  background: #ffffff;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #666666;
  font-weight: 500;
}

.footer-info kbd {
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 2px;
  padding: 1px 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  color: #666666;
}

.footer-info kbd.mac-symbol {
  font-size: 11px !important;
  font-weight: 700 !important;
  background: linear-gradient(135deg, #333333 0%, #444444 100%) !important;
  color: #ffffff !important;
  border-color: #555555 !important;
}



/* 深色主题 */
.dark-theme .table-content,
.table-content.dark-theme {
  background: #1a1a1a !important;
  color: #e0e0e0 !important;
}

.dark-theme .search-section,
.search-section.dark-theme {
  background: #1a1a1a !important;
  border-bottom-color: #333333 !important;
}

.dark-theme .search-section .search-input,
.search-section.dark-theme .search-input {
  background: #333333 !important;
  border-color: #555555 !important;
  color: #e0e0e0 !important;
}

.dark-theme .search-section .search-input::placeholder,
.search-section.dark-theme .search-input::placeholder {
  color: #999999 !important;
}

.dark-theme .search-section .search-icon,
.search-section.dark-theme .search-icon {
  color: #999999 !important;
}



.dark-theme .shortcuts-table thead,
.shortcuts-table.dark-theme thead {
  background: #1a1a1a !important;
}

.dark-theme .shortcuts-table th,
.shortcuts-table.dark-theme th {
  background: #1a1a1a !important;
  color: #e0e0e0 !important;
  border-bottom-color: #333333 !important;
}

.dark-theme .shortcuts-table .shortcut-row,
.shortcuts-table.dark-theme .shortcut-row {
  border-bottom-color: #333333 !important;
}

.dark-theme .shortcuts-table .shortcut-row:hover,
.shortcuts-table.dark-theme .shortcut-row:hover {
  background: #2a2a2a !important;
}

.dark-theme .shortcuts-table .group-header-row,
.shortcuts-table.dark-theme .group-header-row {
  background: #2a2a2a !important;
}

.dark-theme .shortcuts-table .group-header,
.shortcuts-table.dark-theme .group-header {
  color: #e0e0e0 !important;
  border-bottom-color: #333333 !important;
}

.dark-theme .shortcuts-table .group-title,
.shortcuts-table.dark-theme .group-title {
  color: #e0e0e0 !important;
}

.dark-theme .shortcuts-table .group-count,
.shortcuts-table.dark-theme .group-count {
  color: #999999 !important;
}

.dark-theme .shortcuts-table .function-name,
.shortcuts-table.dark-theme .function-name {
  color: #e0e0e0 !important;
}

.dark-theme .shortcuts-table .function-group,
.shortcuts-table.dark-theme .function-group {
  color: #999999 !important;
}

.dark-theme .shortcuts-table .shortcut-kbd,
.shortcuts-table.dark-theme .shortcut-kbd {
  background: linear-gradient(135deg, #333333 0%, #444444 100%) !important;
  border-color: #555555 !important;
  color: #e0e0e0 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.dark-theme .shortcuts-table .shortcut-kbd.mac-symbol,
.shortcuts-table.dark-theme .shortcut-kbd.mac-symbol {
  background: linear-gradient(135deg, #222222 0%, #333333 100%) !important;
  color: #ffffff !important;
  border-color: #444444 !important;
}

.dark-theme .shortcuts-table .description-text,
.shortcuts-table.dark-theme .description-text {
  color: #cccccc !important;
}



.dark-theme .shortcuts-table .empty-state,
.shortcuts-table.dark-theme .empty-state {
  color: #999999 !important;
}

.dark-theme .table-footer,
.table-footer.dark-theme {
  background: #1a1a1a !important;
  border-top-color: #333333 !important;
}

.dark-theme .table-footer .footer-info,
.table-footer.dark-theme .footer-info {
  color: #cccccc !important;
}

.dark-theme .table-footer .footer-info kbd,
.table-footer.dark-theme .footer-info kbd {
  background: #333333 !important;
  border-color: #555555 !important;
  color: #cccccc !important;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .search-input-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .search-section {
    padding: 10px 16px;
  }
  
  th, td {
    padding: 6px 12px;
  }
  
  .col-function { width: 38%; }
  .col-shortcut { width: 28%; }
  .col-description { width: 34%; }
  
  .function-name {
    font-size: 13px;
  }
  
  .shortcut-kbd {
    padding: 5px 10px;
    font-size: 12px;
  }
  
  .shortcut-kbd.mac-symbol {
    font-size: 14px !important;
    padding: 6px 12px;
  }
}

@media (max-width: 480px) {
  .search-section {
    padding: 8px 16px;
  }
  
  th, td {
    padding: 6px 10px;
  }
  
  .col-function { width: 40%; }
  .col-shortcut { width: 30%; }
  .col-description { width: 30%; }
  
  .table-footer {
    padding: 16px 20px;
  }
  
  .footer-info {
    font-size: 11px;
    gap: 8px;
  }
}
</style>