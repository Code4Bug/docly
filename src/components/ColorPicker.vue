<template>
  <div class="color-picker-wrapper">
    <button 
      @click="toggleColorPicker" 
      class="toolbar-btn color-btn"
    >
      <svg v-if="type === 'text'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.62,12L12,5.67L14.38,12M11,3L5.5,17H7.75L8.87,14H15.13L16.25,17H18.5L13,3H11Z"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
      </svg>
      <div class="color-indicator" :class="{ 'bg-indicator': type === 'background' }" :style="{ backgroundColor: currentColor }"></div>
    </button>
    <div v-if="showColorPicker" class="color-picker-panel">
      <div class="color-presets">
        <div 
          v-for="color in colorPresets"
          :key="color"
          class="color-preset"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
        ></div>
      </div>
      <input 
        type="color" 
        :value="customColor" 
        @change="handleCustomColorChange"
        class="custom-color-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Props
interface Props {
  type: 'text' | 'background';
  currentColor: string;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  'color-change': [color: string];
}>();

const emit = defineEmits<{
  'color-change': [color: string];
}>();

// 响应式数据
const showColorPicker = ref(false);
const customColor = ref(props.currentColor);

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
      '#ffffff', '#f5f5f5', '#e0e0e0', '#cccccc',
      '#ffeeee', '#fff0e6', '#fffacc', '#eeffee',
      '#e6f0ff', '#f0e6ff', '#ffe6f0', '#e6ffff'
    ];
  }
});

/**
 * 切换颜色选择器显示状态
 */
const toggleColorPicker = (): void => {
  showColorPicker.value = !showColorPicker.value;
};

/**
 * 选择预设颜色
 * @param {string} color - 颜色值
 */
const selectColor = (color: string): void => {
  emit('color-change', color);
  showColorPicker.value = false;
};

/**
 * 处理自定义颜色变化
 * @param {Event} event - 输入事件
 */
const handleCustomColorChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const color = target.value;
  customColor.value = color;
  emit('color-change', color);
  showColorPicker.value = false;
};
</script>

<style scoped>
.color-picker-wrapper {
  position: relative;
}

.color-btn {
  position: relative;
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
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
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
</style>