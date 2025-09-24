<template>
  <div class="color-picker-wrapper" :class="{ 'dark-theme': isDarkTheme }">
    <button 
      ref="colorButton"
      @click="toggleColorPicker" 
      class="toolbar-btn color-btn"
      @mouseenter="showTooltip($event, tooltipText)"
      @mouseleave="hideTooltip"
    >
      <svg v-if="type === 'text'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.62,12L12,5.67L14.38,12M11,3L5.5,17H7.75L8.87,14H15.13L16.25,17H18.5L13,3H11Z"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
      </svg>
      <div class="color-indicator" :class="{ 'bg-indicator': type === 'background' }" :style="{ backgroundColor: currentColor }"></div>
    </button>
    <div v-if="showColorPicker" ref="colorPanel" class="color-picker-panel">
      <div class="color-presets">
        <div 
          v-for="color in colorPresets"
          :key="color"
          class="color-preset"
          :style="{ backgroundColor: color }"
          @mousedown.prevent="selectColor(color)"
        ></div>
      </div>
      <input 
        type="color" 
        :value="customColor" 
        @change="handleCustomColorChange"
        class="custom-color-input"
      />
    </div>
    
    <!-- Tooltip 组件 -->
     <Tooltip 
       :visible="tooltip.visible"
       :text="tooltip.text"
       :x="tooltip.x"
       :y="tooltip.y"
     />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTheme } from '../composables/useTheme';
import Tooltip from './Tooltip.vue';
import { useTooltip } from '../composables/useTooltip';

// Props
interface Props {
  type: 'text' | 'background';
  currentColor: string;
}

const props = defineProps<Props>();

// Tooltip 系统
const { tooltip, showTooltip, hideTooltip } = useTooltip();

// 确保 TypeScript 识别这些变量在模板中被使用
// 这些变量实际在模板的事件处理器和组件绑定中使用
const _tooltipRefs = { tooltip, showTooltip, hideTooltip };

// Emits
const emit = defineEmits<{
  'color-change': [color: string];
}>();

// 主题系统
const { isDarkTheme } = useTheme();

// 响应式数据
const showColorPicker = ref(false);
const customColor = ref(props.currentColor);
const colorButton = ref<HTMLElement>();
const colorPanel = ref<HTMLElement>();

// 颜色预设
const colorPresets = computed(() => {
  if (props.type === 'text') {
    return [
      '#000000', '#333333', '#666666', '#999999',
      '#ff0000', '#ff6600', '#ffcc00', '#00ff00',
      '#0066ff', '#6600ff', '#ff0066', '#00ffff'
    ];
  } else {
    return [
      '#ffffff', '#f0f0f0', '#d0d0d0', '#b0b0b0',
      '#ffe0e0', '#ffe0d0', '#fff0b0', '#e0ffe0',
      '#d0e0ff', '#e0d0ff', '#ffd0e0', '#d0ffff'
    ];
  }
});

// Tooltip 文本
const tooltipText = computed(() => {
  return props.type === 'text' ? '字体颜色' : '背景颜色';
});

/**
 * 切换颜色选择器显示状态
 */
const toggleColorPicker = (): void => {
  showColorPicker.value = !showColorPicker.value;
  
  if (showColorPicker.value && colorButton.value && colorPanel.value) {
    // 计算按钮位置
    const rect = colorButton.value.getBoundingClientRect();
    const panel = colorPanel.value;
    
    // 设置面板位置
    panel.style.top = `${rect.bottom + 2}px`;
    panel.style.left = `${rect.left}px`;
  }
};

/**
 * 处理点击外部关闭面板
 */
const handleClickOutside = (event: MouseEvent): void => {
  if (showColorPicker.value && 
      colorButton.value && 
      colorPanel.value && 
      !colorButton.value.contains(event.target as Node) && 
      !colorPanel.value.contains(event.target as Node)) {
    showColorPicker.value = false;
  }
};

// 生命周期钩子
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
   document.removeEventListener('click', handleClickOutside);
 });

/**
 * 选择预设颜色
 * @param {string} color - 颜色值
 */
const selectColor = (color: string): void => {
  console.log('ColorPicker selectColor 被调用:', { type: props.type, color });
  
  // 延迟执行以确保文本选择状态得到保持
  setTimeout(() => {
    emit('color-change', color);
    showColorPicker.value = false;
  }, 0);
};

/**
 * 处理自定义颜色变化
 * @param {Event} event - 输入事件
 */
const handleCustomColorChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const color = target.value;
  console.log('ColorPicker handleCustomColorChange 被调用:', { type: props.type, color });
  customColor.value = color;
  emit('color-change', color);
  showColorPicker.value = false;
};
</script>

<script lang="ts">
export default {
  name: 'ColorPicker'
};
</script>

<style scoped>
.color-picker-wrapper {
  position: relative;
}

.color-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.color-btn:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.color-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 1px;
}

.bg-indicator {
  height: 2px;
  border-radius: 0;
}

.color-picker-panel {
  position: fixed;
  z-index: 10001;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  margin-top: 2px;
}

.color-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid #dadce0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-preset:hover {
  transform: scale(1.05);
  border-color: #1a73e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.custom-color-input {
  width: 100%;
  height: 32px;
  border: 1px solid #dadce0;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.custom-color-input:hover {
  border-color: #1a73e8;
}

.custom-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.custom-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

/* 暗色主题样式 */
.color-picker-wrapper.dark-theme .color-btn {
  background: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.color-picker-wrapper.dark-theme .color-btn:hover {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(147, 51, 234, 0.15));
  border-color: #4285f4;
  color: #4285f4;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.15);
}

.color-picker-wrapper.dark-theme .color-indicator {
  border-color: rgba(255, 255, 255, 0.3);
}

.color-picker-wrapper.dark-theme .color-picker-panel {
  background: #2d2d2d;
  border-color: #404040;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.color-picker-wrapper.dark-theme .color-preset {
  border-color: #404040;
}

.color-picker-wrapper.dark-theme .color-preset:hover {
  border-color: #4285f4;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
}

.color-picker-wrapper.dark-theme .custom-color-input {
  background: #404040;
  border-color: #555555;
  color: #e0e0e0;
}

.color-picker-wrapper.dark-theme .custom-color-input:hover {
  border-color: #4285f4;
  background: #4a4a4a;
}
</style>