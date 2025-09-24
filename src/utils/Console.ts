// 控制台工具类
export class Console {
  // 存储日志级别
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  // 日志颜色配置
  private static colors = {
    debug: '#7f8c8d', // 灰色
    info: '#2ecc71',  // 绿色
    warn: '#f1c40f',  // 黄色
    error: '#e74c3c'  // 红色
  };

  // 设置日志级别
  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }

  // 获取当前日志级别
  static getLogLevel() {
    return this.logLevel;
  }

  // 格式化日志内容
  private static formatLogContent(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object') {
        return arg;
      }
      return String(arg);
    });
  }

  // 调试日志
  static debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug('%c[Debug]', `color: ${this.colors.debug}`, ...this.formatLogContent(args));
    }
  }

  // 信息日志
  static info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info('%c[Info]', `color: ${this.colors.info}`, ...this.formatLogContent(args));
    }
  }

  // 警告日志
  static warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn('%c[Warn]', `color: ${this.colors.warn}`, ...this.formatLogContent(args));
    }
  }

  // 错误日志
  static error(...args: any[]) {
    if (this.shouldLog('error')) {
      Console.error('%c[Error]', `color: ${this.colors.error}`, ...this.formatLogContent(args));
    }
  }

  // 判断是否应该输出日志
  private static shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  // 清空控制台
  static clear() {
    console.clear();
  }

  // 打印表格
  static table(data: any) {
    console.table(data);
  }

  // 打印分组
  static group(label: string) {
    console.group(label);
  }

  // 结束分组
  static groupEnd() {
    console.groupEnd();
  }

  // 计时开始
  static time(label: string) {
    console.time(label);
  }

  // 计时结束
  static timeEnd(label: string) {
    console.timeEnd(label);
  }
}
