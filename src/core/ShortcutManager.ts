import { Console } from "@/utils/Console";
/**
 * 快捷键管理器
 * 统一管理应用中的所有快捷键
 */

export interface ShortcutConfig {
  /** 快捷键组合 */
  key: string;
  /** 快捷键描述 */
  description: string;
  /** 快捷键分组 */
  group: string;
  /** 回调函数 */
  callback: () => void;
  /** 是否启用 */
  enabled: boolean;
  /** 是否阻止默认行为 */
  preventDefault: boolean;
  /** 是否阻止事件冒泡 */
  stopPropagation: boolean;
}

export interface ShortcutGroup {
  /** 分组名称 */
  name: string;
  /** 分组描述 */
  description: string;
  /** 分组图标 */
  icon?: string;
}

/**
 * 快捷键管理器类
 * 提供统一的快捷键注册、管理和执行功能
 */
export class ShortcutManager {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private groups: Map<string, ShortcutGroup> = new Map();
  private isEnabled: boolean = true;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDefaultGroups();
    this.bindEvents();
  }

  /**
   * 初始化默认分组
   */
  private initializeDefaultGroups(): void {
    this.addGroup('file', {
      name: '文件操作',
      description: '文件导入、导出、保存等操作',
      icon: 'folder'
    });

    this.addGroup('edit', {
      name: '编辑操作',
      description: '撤销、重做、复制、粘贴等编辑操作',
      icon: 'edit'
    });

    this.addGroup('format', {
      name: '格式化',
      description: '文本格式化、样式设置等操作',
      icon: 'format'
    });

    this.addGroup('insert', {
      name: '插入内容',
      description: '插入链接、表格、列表等内容',
      icon: 'plus'
    });

    this.addGroup('view', {
      name: '视图控制',
      description: '主题切换、缩放、显示设置等',
      icon: 'eye'
    });

    this.addGroup('annotation', {
      name: '批注功能',
      description: '添加批注、查看批注等操作',
      icon: 'comment'
    });
  }

  /**
   * 绑定键盘事件
   */
  private bindEvents(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * 处理键盘按下事件
   * @param event - 键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut && shortcut.enabled) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation();
      }

      try {
        shortcut.callback();
        this.emit('shortcut-executed', { key: shortcutKey, shortcut });
      } catch (error) {
        Console.error(`执行快捷键 ${shortcutKey} 时出错:`, error);
        this.emit('shortcut-error', { key: shortcutKey, error });
      }
    }
  }

  /**
   * 获取快捷键字符串
   * @param event - 键盘事件
   * @returns 快捷键字符串
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];

    // 检测修饰键（Mac 优先使用 Cmd，Windows/Linux 使用 Ctrl）
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

    return parts.join('+');
  }

  /**
   * 注册快捷键
   * @param key - 快捷键组合
   * @param config - 快捷键配置
   */
  public registerShortcut(key: string, config: Omit<ShortcutConfig, 'key'>): void {
    const normalizedKey = this.normalizeShortcutKey(key);
    
    const shortcutConfig: ShortcutConfig = {
      key: normalizedKey,
      ...config
    };

    this.shortcuts.set(normalizedKey, shortcutConfig);
    this.emit('shortcut-registered', { key: normalizedKey, config: shortcutConfig });
  }

  /**
   * 标准化快捷键字符串
   * @param key - 原始快捷键字符串
   * @returns 标准化后的快捷键字符串
   */
  private normalizeShortcutKey(key: string): string {
    return key.split('+')
      .map(part => part.trim())
      .map(part => {
        // 标准化修饰键名称
        switch (part.toLowerCase()) {
          case 'cmd':
          case 'command':
          case 'meta':
            return 'Cmd';
          case 'ctrl':
          case 'control':
            return 'Ctrl';
          case 'alt':
          case 'option':
            return 'Alt';
          case 'shift':
            return 'Shift';
          default:
            return part.toUpperCase();
        }
      })
      .join('+');
  }

  /**
   * 注销快捷键
   * @param key - 快捷键组合
   */
  public unregisterShortcut(key: string): void {
    const normalizedKey = this.normalizeShortcutKey(key);
    const removed = this.shortcuts.delete(normalizedKey);
    
    if (removed) {
      this.emit('shortcut-unregistered', { key: normalizedKey });
    }
  }

  /**
   * 启用/禁用快捷键
   * @param key - 快捷键组合
   * @param enabled - 是否启用
   */
  public setShortcutEnabled(key: string, enabled: boolean): void {
    const normalizedKey = this.normalizeShortcutKey(key);
    const shortcut = this.shortcuts.get(normalizedKey);
    
    if (shortcut) {
      shortcut.enabled = enabled;
      this.emit('shortcut-toggled', { key: normalizedKey, enabled });
    }
  }

  /**
   * 添加快捷键分组
   * @param id - 分组ID
   * @param group - 分组配置
   */
  public addGroup(id: string, group: ShortcutGroup): void {
    this.groups.set(id, group);
  }

  /**
   * 获取所有快捷键
   * @returns 快捷键映射
   */
  public getAllShortcuts(): Map<string, ShortcutConfig> {
    return new Map(this.shortcuts);
  }

  /**
   * 根据分组获取快捷键
   * @param groupId - 分组ID
   * @returns 该分组的快捷键数组
   */
  public getShortcutsByGroup(groupId: string): ShortcutConfig[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.group === groupId);
  }

  /**
   * 获取所有分组
   * @returns 分组映射
   */
  public getAllGroups(): Map<string, ShortcutGroup> {
    return new Map(this.groups);
  }

  /**
   * 启用/禁用快捷键管理器
   * @param enabled - 是否启用
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.emit('manager-toggled', { enabled });
  }

  /**
   * 检查快捷键是否已注册
   * @param key - 快捷键组合
   * @returns 是否已注册
   */
  public hasShortcut(key: string): boolean {
    const normalizedKey = this.normalizeShortcutKey(key);
    return this.shortcuts.has(normalizedKey);
  }

  /**
   * 获取快捷键配置
   * @param key - 快捷键组合
   * @returns 快捷键配置或undefined
   */
  public getShortcut(key: string): ShortcutConfig | undefined {
    const normalizedKey = this.normalizeShortcutKey(key);
    return this.shortcuts.get(normalizedKey);
  }

  /**
   * 清空所有快捷键
   */
  public clearAllShortcuts(): void {
    this.shortcuts.clear();
    this.emit('shortcuts-cleared');
  }

  /**
   * 导出快捷键配置
   * @returns 快捷键配置JSON
   */
  public exportConfig(): string {
    const config = {
      shortcuts: Array.from(this.shortcuts.entries()).map(([key, shortcut]) => ({
        key,
        description: shortcut.description,
        group: shortcut.group,
        enabled: shortcut.enabled,
        preventDefault: shortcut.preventDefault,
        stopPropagation: shortcut.stopPropagation
      })),
      groups: Array.from(this.groups.entries()).map(([id, group]) => ({
        id,
        ...group
      }))
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * 导入快捷键配置
   * @param configJson - 配置JSON字符串
   */
  public importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      
      // 清空现有配置
      this.shortcuts.clear();
      this.groups.clear();

      // 导入分组
      if (config.groups) {
        config.groups.forEach((group: any) => {
          const { id, ...groupConfig } = group;
          this.addGroup(id, groupConfig);
        });
      }

      // 重新初始化默认分组（如果没有导入分组）
      if (this.groups.size === 0) {
        this.initializeDefaultGroups();
      }

      this.emit('config-imported', { config });
    } catch (error) {
      Console.error('导入快捷键配置失败:', error);
      this.emit('config-import-error', { error });
    }
  }

  /**
   * 添加事件监听器
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param event - 事件名称
   * @param data - 事件数据
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.shortcuts.clear();
    this.groups.clear();
    this.eventListeners.clear();
  }
}

// 创建全局单例实例
export const shortcutManager = new ShortcutManager();