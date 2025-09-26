import type { EditorPlugin, EditorInstance, PluginConfig } from '../types';
import { Console } from '../utils/Console';

/**
 * 插件管理器
 * 负责插件的注册、加载和管理
 */
export class PluginManager {
  private plugins: Map<string, EditorPlugin> = new Map();
  private loadedPlugins: Set<string> = new Set();
  private editor: EditorInstance | null = null;

  constructor() {}

  /**
   * 设置编辑器实例
   */
  setEditor(editor: EditorInstance): void {
    this.editor = editor;
  }

  /**
   * 注册插件
   * @param plugin - 插件实例
   */
  registerPlugin(plugin: EditorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`插件 ${plugin.name} 已存在，将被覆盖`);
    }
    
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * 批量注册插件
   */
  registerMultiple(plugins: EditorPlugin[]): void {
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  /**
   * 加载插件
   * @param pluginName - 插件名称
   */
  loadPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`插件 ${pluginName} 不存在`);
    }

    if (this.loadedPlugins.has(pluginName)) {
      console.warn(`插件 ${pluginName} 已加载`);
      return;
    }

    if (!this.editor) {
      throw new Error('编辑器实例未设置');
    }

    try {
      plugin.init(this.editor);
      this.loadedPlugins.add(pluginName);
    } catch (error) {
      Console.error(`插件 ${pluginName} 加载失败:`, error);
      throw error;
    }
  }

  /**
   * 批量加载插件
   */
  async loadMultiple(pluginNames: string[]): Promise<void> {
    const loadPromises = pluginNames.map(name => this.loadPlugin(name));
    await Promise.all(loadPromises);
  }

  /**
   * 根据配置加载插件
   */
  async loadFromConfig(configs: PluginConfig[]): Promise<void> {
    const enabledConfigs = configs.filter(config => config.enabled);
    const pluginNames = enabledConfigs.map(config => config.name);
    await this.loadMultiple(pluginNames);
  }

  /**
   * 卸载插件
   * @param pluginName - 插件名称
   */
  unloadPlugin(pluginName: string): void {
    if (!this.loadedPlugins.has(pluginName)) {
      console.warn(`插件 ${pluginName} 未加载`);
      return;
    }

    try {
      this.loadedPlugins.delete(pluginName);
    } catch (error) {
      Console.error(`插件 ${pluginName} 卸载失败:`, error);
      throw error;
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginName: string): EditorPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * 获取所有已注册的插件
   */
  getAllPlugins(): EditorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取所有已加载的插件名称
   */
  getLoadedPluginNames(): string[] {
    return Array.from(this.loadedPlugins);
  }

  /**
   * 检查插件是否已加载
   */
  isLoaded(pluginName: string): boolean {
    return this.loadedPlugins.has(pluginName);
  }

  /**
   * 执行插件命令
   * @param pluginName - 插件名称
   * @param command - 命令名称
   * @param args - 命令参数
   */
  executeCommand(pluginName: string, command: string, ...args: any[]): any {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`插件 ${pluginName} 不存在`);
    }

    if (!this.loadedPlugins.has(pluginName)) {
      throw new Error(`插件 ${pluginName} 未加载`);
    }

    if (!plugin.command) {
      console.warn(`插件 ${pluginName} 不支持命令执行`);
      return;
    }

    return plugin.command(command, args);
  }

  /**
   * 清理所有插件
   */
  clear(): void {
    this.plugins.clear();
    this.loadedPlugins.clear();
  }
}