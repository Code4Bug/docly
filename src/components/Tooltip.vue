<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="tooltip"
      :class="{ 'dark-theme': isDarkTheme }"
      :style="tooltipStyle"
    >
      {{ text }}
      <div class="tooltip-arrow" :style="arrowStyle"></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, Teleport } from 'vue';
import { useTheme } from '../composables/useTheme';

// Props
interface Props {
  visible: boolean;
  text: string;
  x: number;
  y: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom',
  offset: 8
});

// 主题系统
const { isDarkTheme } = useTheme();

/**
 * 计算 tooltip 的位置样式
 */
const tooltipStyle = computed(() => {
  const { x, y, placement, offset } = props;
  
  let left = x;
  let top = y;
  let transform = '';
  
  switch (placement) {
    case 'top':
      top = y - offset;
      transform = 'translateX(-50%) translateY(-100%)';
      break;
    case 'bottom':
      top = y + offset;
      transform = 'translateX(-50%)';
      break;
    case 'left':
      left = x - offset;
      top = y;
      transform = 'translateX(-100%) translateY(-50%)';
      break;
    case 'right':
      left = x + offset;
      top = y;
      transform = 'translateY(-50%)';
      break;
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    transform
  };
});

/**
 * 计算箭头的位置样式
 */
const arrowStyle = computed(() => {
  const { placement } = props;
  
  switch (placement) {
    case 'top':
      return {
        bottom: '-5px',
        left: '50%',
        transform: 'translateX(-50%)',
        borderTop: '5px solid var(--tooltip-bg)',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent'
      };
    case 'bottom':
      return {
        top: '-5px',
        left: '50%',
        transform: 'translateX(-50%)',
        borderBottom: '5px solid var(--tooltip-bg)',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent'
      };
    case 'left':
      return {
        right: '-5px',
        top: '50%',
        transform: 'translateY(-50%)',
        borderLeft: '5px solid var(--tooltip-bg)',
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent'
      };
    case 'right':
      return {
        left: '-5px',
        top: '50%',
        transform: 'translateY(-50%)',
        borderRight: '5px solid var(--tooltip-bg)',
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent'
      };
    default:
      return {};
  }
});
</script>

<script lang="ts">
export default {
  name: 'Tooltip'
};
</script>

<style scoped>
.tooltip {
  --tooltip-bg: #333;
  --tooltip-color: white;
  
  position: fixed;
  background-color: var(--tooltip-bg);
  color: var(--tooltip-color);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0.95;
  backdrop-filter: blur(8px);
  animation: tooltipFadeIn 0.2s ease-out;
}

.tooltip.dark-theme {
  --tooltip-bg: #4a4a4a;
  --tooltip-color: #f9fafb;
  border: 1px solid #374151;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: var(--initial-transform, translateX(-50%)) scale(0.95);
  }
  to {
    opacity: 0.95;
    transform: var(--final-transform, translateX(-50%)) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tooltip {
    font-size: 11px;
    padding: 6px 10px;
  }
}
</style>