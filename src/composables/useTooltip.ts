import { reactive } from 'vue';

// Tooltip 状态接口
interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip 组合式函数
 * 提供统一的 tooltip 状态管理和操作方法
 */
export function useTooltip() {
  // Tooltip 状态
  const tooltip = reactive<TooltipState>({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    placement: 'bottom'
  });

  /**
   * 显示 tooltip
   * @param event - 鼠标事件
   * @param text - 提示文本
   * @param placement - 显示位置
   */
  const showTooltip = (
    event: MouseEvent, 
    text: string, 
    placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
  ): void => {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    let x = rect.left + rect.width / 2;
    let y = rect.bottom;
    
    // 根据 placement 调整位置
    switch (placement) {
      case 'top':
        y = rect.top;
        break;
      case 'bottom':
        y = rect.bottom;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + rect.height / 2;
        break;
    }
    
    tooltip.visible = true;
    tooltip.text = text;
    tooltip.x = x;
    tooltip.y = y;
    tooltip.placement = placement;
  };

  /**
   * 隐藏 tooltip
   */
  const hideTooltip = (): void => {
    tooltip.visible = false;
  };

  /**
   * 切换 tooltip 显示状态
   * @param event - 鼠标事件
   * @param text - 提示文本
   * @param placement - 显示位置
   */
  const toggleTooltip = (
    event: MouseEvent, 
    text: string, 
    placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
  ): void => {
    if (tooltip.visible) {
      hideTooltip();
    } else {
      showTooltip(event, text, placement);
    }
  };

  return {
    tooltip,
    showTooltip,
    hideTooltip,
    toggleTooltip
  };
}