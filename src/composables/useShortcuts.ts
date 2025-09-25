import { ref, onMounted, onUnmounted } from 'vue';
import { shortcutManager } from '../core/ShortcutManager';

/**
 * 快捷键组合式函数
 * 提供快捷键注册和管理功能
 */
export function useShortcuts() {
  const isShortcutPanelVisible = ref(false);

  /**
   * 注册编辑器相关的默认快捷键
   * @param callbacks - 回调函数映射
   */
  const registerEditorShortcuts = (callbacks: {
    // 文件操作
    importFile?: () => void;
    exportFile?: () => void;
    save?: () => void;
    
    // 编辑操作
    undo?: () => void;
    redo?: () => void;
    copy?: () => void;
    paste?: () => void;
    cut?: () => void;
    selectAll?: () => void;
    
    // 格式化操作
    bold?: () => void;
    italic?: () => void;
    underline?: () => void;
    strikethrough?: () => void;
    superscript?: () => void;
    subscript?: () => void;
    
    // 插入操作
    insertLink?: () => void;
    insertTable?: () => void;
    insertList?: (type: string) => void;
    insertQuote?: () => void;
    
    // 视图操作
    toggleTheme?: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
    
    // 批注操作
    toggleAnnotationMode?: () => void;
    showAnnotationList?: () => void;
  }) => {
    // 文件操作快捷键
    if (callbacks.importFile) {
      shortcutManager.registerShortcut('Ctrl+O', {
        description: '导入文档',
        group: 'file',
        callback: callbacks.importFile,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.exportFile) {
      shortcutManager.registerShortcut('Ctrl+E', {
        description: '导出文档',
        group: 'file',
        callback: callbacks.exportFile,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.save) {
      shortcutManager.registerShortcut('Ctrl+S', {
        description: '保存文档',
        group: 'file',
        callback: callbacks.save,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    // 编辑操作快捷键
    if (callbacks.undo) {
      // 检测操作系统，Mac使用Cmd+Z，Windows/Linux使用Ctrl+Z
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const undoKey = isMac ? 'Cmd+Z' : 'Ctrl+Z';
      
      shortcutManager.registerShortcut(undoKey, {
        description: '撤销',
        group: 'edit',
        callback: callbacks.undo,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.redo) {
      // 检测操作系统，Mac使用Cmd+Shift+Z，Windows/Linux使用Ctrl+Y
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const redoKey = isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y';
      
      shortcutManager.registerShortcut(redoKey, {
        description: '重做',
        group: 'edit',
        callback: callbacks.redo,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.copy) {
      shortcutManager.registerShortcut('Ctrl+C', {
        description: '复制',
        group: 'edit',
        callback: callbacks.copy,
        enabled: true,
        preventDefault: false, // 让浏览器处理默认复制行为
        stopPropagation: false
      });
    }

    if (callbacks.paste) {
      shortcutManager.registerShortcut('Ctrl+V', {
        description: '粘贴',
        group: 'edit',
        callback: callbacks.paste,
        enabled: true,
        preventDefault: false, // 让浏览器处理默认粘贴行为
        stopPropagation: false
      });
    }

    if (callbacks.cut) {
      shortcutManager.registerShortcut('Ctrl+X', {
        description: '剪切',
        group: 'edit',
        callback: callbacks.cut,
        enabled: true,
        preventDefault: false, // 让浏览器处理默认剪切行为
        stopPropagation: false
      });
    }

    if (callbacks.selectAll) {
      shortcutManager.registerShortcut('Ctrl+A', {
        description: '全选',
        group: 'edit',
        callback: callbacks.selectAll,
        enabled: true,
        preventDefault: false, // 让浏览器处理默认全选行为
        stopPropagation: false
      });
    }

    // 格式化操作快捷键
    if (callbacks.bold) {
      shortcutManager.registerShortcut('Ctrl+B', {
        description: '粗体',
        group: 'format',
        callback: callbacks.bold,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.italic) {
      shortcutManager.registerShortcut('Ctrl+I', {
        description: '斜体',
        group: 'format',
        callback: callbacks.italic,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.underline) {
      shortcutManager.registerShortcut('Ctrl+U', {
        description: '下划线',
        group: 'format',
        callback: callbacks.underline,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.strikethrough) {
      shortcutManager.registerShortcut('Ctrl+Shift+X', {
        description: '删除线',
        group: 'format',
        callback: callbacks.strikethrough,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.superscript) {
      shortcutManager.registerShortcut('Ctrl+Shift+=', {
        description: '上标',
        group: 'format',
        callback: callbacks.superscript,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.subscript) {
      shortcutManager.registerShortcut('Ctrl+=', {
        description: '下标',
        group: 'format',
        callback: callbacks.subscript,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    // 插入操作快捷键
    if (callbacks.insertLink) {
      shortcutManager.registerShortcut('Ctrl+K', {
        description: '插入链接',
        group: 'insert',
        callback: callbacks.insertLink,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.insertTable) {
      shortcutManager.registerShortcut('Ctrl+Shift+T', {
        description: '插入表格',
        group: 'insert',
        callback: callbacks.insertTable,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.insertList) {
      shortcutManager.registerShortcut('Ctrl+Shift+L', {
        description: '插入列表',
        group: 'insert',
        callback: () => callbacks.insertList?.('bullet'), // 默认插入无序列表
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.insertQuote) {
      shortcutManager.registerShortcut('Ctrl+Shift+Q', {
        description: '插入引用',
        group: 'insert',
        callback: callbacks.insertQuote,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    // 视图操作快捷键
    if (callbacks.toggleTheme) {
      shortcutManager.registerShortcut('Ctrl+Shift+D', {
        description: '切换主题',
        group: 'view',
        callback: callbacks.toggleTheme,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.zoomIn) {
      shortcutManager.registerShortcut('Ctrl+=', {
        description: '放大',
        group: 'view',
        callback: callbacks.zoomIn,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.zoomOut) {
      shortcutManager.registerShortcut('Ctrl+-', {
        description: '缩小',
        group: 'view',
        callback: callbacks.zoomOut,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    // 批注操作快捷键
    if (callbacks.toggleAnnotationMode) {
      shortcutManager.registerShortcut('Ctrl+Shift+A', {
        description: '切换批注模式',
        group: 'annotation',
        callback: callbacks.toggleAnnotationMode,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    if (callbacks.showAnnotationList) {
      shortcutManager.registerShortcut('Ctrl+Shift+C', {
        description: '显示批注列表',
        group: 'annotation',
        callback: callbacks.showAnnotationList,
        enabled: true,
        preventDefault: true,
        stopPropagation: false
      });
    }

    // 快捷键面板切换
    shortcutManager.registerShortcut('Ctrl+/', {
      description: '显示/隐藏快捷键面板',
      group: 'view',
      callback: () => {
        isShortcutPanelVisible.value = !isShortcutPanelVisible.value;
      },
      enabled: true,
      preventDefault: true,
      stopPropagation: false
    });
  };

  /**
   * 注册自定义快捷键
   * @param key - 快捷键组合
   * @param description - 描述
   * @param group - 分组
   * @param callback - 回调函数
   * @param options - 其他选项
   */
  const registerShortcut = (
    key: string,
    description: string,
    group: string,
    callback: () => void,
    options: {
      enabled?: boolean;
      preventDefault?: boolean;
      stopPropagation?: boolean;
    } = {}
  ) => {
    shortcutManager.registerShortcut(key, {
      description,
      group,
      callback,
      enabled: options.enabled ?? true,
      preventDefault: options.preventDefault ?? true,
      stopPropagation: options.stopPropagation ?? false
    });
  };

  /**
   * 注销快捷键
   * @param key - 快捷键组合
   */
  const unregisterShortcut = (key: string) => {
    shortcutManager.unregisterShortcut(key);
  };

  /**
   * 启用/禁用快捷键
   * @param key - 快捷键组合
   * @param enabled - 是否启用
   */
  const setShortcutEnabled = (key: string, enabled: boolean) => {
    shortcutManager.setShortcutEnabled(key, enabled);
  };

  /**
   * 启用/禁用快捷键管理器
   * @param enabled - 是否启用
   */
  const setShortcutsEnabled = (enabled: boolean) => {
    shortcutManager.setEnabled(enabled);
  };

  /**
   * 显示快捷键面板
   */
  const showShortcutPanel = () => {
    isShortcutPanelVisible.value = true;
  };

  /**
   * 隐藏快捷键面板
   */
  const hideShortcutPanel = () => {
    isShortcutPanelVisible.value = false;
  };

  /**
   * 切换快捷键面板显示状态
   */
  const toggleShortcutPanel = () => {
    isShortcutPanelVisible.value = !isShortcutPanelVisible.value;
  };

  /**
   * 获取所有快捷键
   */
  const getAllShortcuts = () => {
    return shortcutManager.getAllShortcuts();
  };

  /**
   * 根据分组获取快捷键
   * @param groupId - 分组ID
   */
  const getShortcutsByGroup = (groupId: string) => {
    return shortcutManager.getShortcutsByGroup(groupId);
  };

  /**
   * 导出快捷键配置
   */
  const exportShortcutConfig = () => {
    return shortcutManager.exportConfig();
  };

  /**
   * 导入快捷键配置
   * @param config - 配置JSON字符串
   */
  const importShortcutConfig = (config: string) => {
    shortcutManager.importConfig(config);
  };

  // 组件挂载时的初始化
  onMounted(() => {
    // 可以在这里添加一些初始化逻辑
  });

  // 组件卸载时的清理
  onUnmounted(() => {
    // 可以在这里添加一些清理逻辑
  });

  return {
    // 状态
    isShortcutPanelVisible,
    
    // 方法
    registerEditorShortcuts,
    registerShortcut,
    unregisterShortcut,
    setShortcutEnabled,
    setShortcutsEnabled,
    showShortcutPanel,
    hideShortcutPanel,
    toggleShortcutPanel,
    getAllShortcuts,
    getShortcutsByGroup,
    exportShortcutConfig,
    importShortcutConfig
  };
}