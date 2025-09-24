// 控制台工具类
export class Console {
  // 存储日志级别
  private static logLevel: 'success' | 'error' | 'warn' | 'info' | 'debug' = 'debug';

  // 日志颜色配置
  private static colors = {
    success: '#27ae60', // 绿色
    debug: '#7f8c8d',   // 灰色
    info: '#3498db',    // 蓝色
    warn: '#f1c40f',    // 黄色
    error: '#e74c3c'    // 红色
  };

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  static setLogLevel(level: 'success' | 'error' | 'warn' | 'info' | 'debug') {
    this.logLevel = level;
  }

  /**
   * 获取当前日志级别
   * @returns 当前日志级别
   */
  static getLogLevel() {
    return this.logLevel;
  }

  /**
   * 格式化日志内容
   * @param args 日志参数
   * @returns 格式化后的参数数组
   */
  private static formatLogContent(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object') {
        return arg;
      }
      return String(arg);
    });
  }

  /**
   * 成功日志
   * @param args 日志内容
   */
  static success(...args: any[]) {
    if (this.shouldLog('success')) {
      console.log('%c[Success]', `color: ${this.colors.success}`, ...this.formatLogContent(args));
    }
  }

  /**
   * 调试日志
   * @param args 日志内容
   */
  static debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.info('%c[Debug]', `color: ${this.colors.debug}`, ...this.formatLogContent(args));
    }
  }

  /**
   * 信息日志
   * @param args 日志内容
   */
  static info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info('%c[Info]', `color: ${this.colors.info}`, ...this.formatLogContent(args));
    }
  }

  /**
   * 警告日志
   * @param args 日志内容
   */
  static warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.info('%c[Warn]', `color: ${this.colors.warn}`, ...this.formatLogContent(args));
    }
  }

  /**
   * 错误日志
   * @param args 日志内容
   */
  static error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error('%c[Error]', `color: ${this.colors.error}`, ...this.formatLogContent(args));
    }
  }

  /**
   * 判断是否应该输出日志
   * @param level 目标日志级别
   * @returns 是否应该输出
   */
  private static shouldLog(level: 'success' | 'error' | 'warn' | 'info' | 'debug'): boolean {
    const levels = ['success', 'debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  /**
   * 清空控制台
   */
  static clear() {
    console.clear();
  }

  /**
   * 打印表格
   * @param data 表格数据
   */
  static table(data: any) {
    console.table(data);
  }

  /**
   * 打印分组
   * @param label 分组标签
   */
  static group(label: string) {
    console.group(label);
  }

  /**
   * 结束分组
   */
  static groupEnd() {
    console.groupEnd();
  }

  /**
   * 计时开始
   * @param label 计时标签
   */
  static time(label: string) {
    console.time(label);
  }

  /**
   * 计时结束
   * @param label 计时标签
   */
  static timeEnd(label: string) {
    console.timeEnd(label);
  }
}
