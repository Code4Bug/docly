<template>
  <div class="font-tool" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 字体族选择 -->
    <div class="font-control">
      <select 
        :value="currentFontFamily" 
        @change="handleFontFamilyChange" 
        class="font-select"
        @mouseenter="showTooltip($event, '字体族')"
        @mouseleave="hideTooltip"
      >
        <!-- Web安全字体 -->
        <optgroup label="Web安全字体">
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
          <option value="'Georgia', serif">Georgia</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
          <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
          <option value="Impact, sans-serif">Impact</option>
          <option value="'Lucida Console', monospace">Lucida Console</option>
          <option value="'Palatino Linotype', serif">Palatino Linotype</option>
          <option value="Tahoma, sans-serif">Tahoma</option>
        </optgroup>
        
        <!-- 系统中文字体 -->
        <optgroup label="系统中文字体">
          <option value="'Microsoft YaHei', '微软雅黑', sans-serif">微软雅黑</option>
          <option value="'SimSun', '宋体', serif">宋体</option>
          <option value="'SimHei', '黑体', sans-serif">黑体</option>
          <option value="'KaiTi', '楷体', serif">楷体</option>
          <option value="'FangSong', '仿宋', serif">仿宋</option>
          <option value="'Microsoft JhengHei', '微软正黑体', sans-serif">微软正黑体</option>
          <option value="'NSimSun', '新宋体', serif">新宋体</option>
          <option value="'LiSu', '隶书', serif">隶书</option>
          <option value="'YouYuan', '幼圆', sans-serif">幼圆</option>
        </optgroup>
        
        <!-- 方正字体系列 -->
        <optgroup label="方正字体">
          <option value="'FangSong_GB2312', serif">方正仿宋_GB2312</option>
          <option value="'KaiTi_GB2312', serif">方正楷体_GB2312</option>
          <option value="'FZXiaoBiaoSong-B05S', serif">方正小标宋简体</option>
          <option value="'FZShuTi', serif">方正舒体</option>
          <option value="'FZYaoti', serif">方正姚体</option>
          <option value="'FZZhunYuan-M02S', sans-serif">方正准圆简体</option>
          <option value="'FZLanTingHei-R-GBK', sans-serif">方正兰亭黑</option>
          <option value="'FZLanTingKanHei-R-GBK', sans-serif">方正兰亭刊黑</option>
        </optgroup>
        
        <!-- Mac系统字体 -->
        <optgroup label="Mac系统字体">
          <option value="'PingFang SC', '苹方', sans-serif">苹方</option>
          <option value="'Hiragino Sans GB', '冬青黑体简体中文', sans-serif">冬青黑体简体中文</option>
          <option value="'STHeiti', '华文黑体', sans-serif">华文黑体</option>
          <option value="'STKaiti', '华文楷体', serif">华文楷体</option>
          <option value="'STSong', '华文宋体', serif">华文宋体</option>
          <option value="'STFangsong', '华文仿宋', serif">华文仿宋</option>
          <option value="'STXihei', '华文细黑', sans-serif">华文细黑</option>
          <option value="'STLiti', '华文隶书', serif">华文隶书</option>
          <option value="'STXingkai', '华文行楷', serif">华文行楷</option>
          <option value="'STXinwei', '华文新魏', serif">华文新魏</option>
        </optgroup>
        
        <!-- 其他常用字体 -->
        <optgroup label="其他字体">
          <option value="'Source Han Sans CN', '思源黑体', sans-serif">思源黑体</option>
          <option value="'Source Han Serif CN', '思源宋体', serif">思源宋体</option>
          <option value="'Noto Sans CJK SC', sans-serif">Noto Sans CJK SC</option>
          <option value="'Noto Serif CJK SC', serif">Noto Serif CJK SC</option>
          <option value="'WenQuanYi Micro Hei', sans-serif">文泉驿微米黑</option>
          <option value="'WenQuanYi Zen Hei', sans-serif">文泉驿正黑</option>
        </optgroup>
      </select>
    </div>

    <!-- 字体大小选择 -->
    <div class="font-control">
      <select 
        :value="currentFontSize" 
        @change="handleFontSizeChange" 
        class="font-size-select"
        @mouseenter="showTooltip($event, '字体大小')"
        @mouseleave="hideTooltip"
      >
        <!-- 中文字号列表 -->
        <option value="42pt">初号</option>
        <option value="36pt">小初</option>
        <option value="26pt">一号</option>
        <option value="24pt">小一</option>
        <option value="22pt">二号</option>
        <option value="18pt">小二</option>
        <option value="16pt">三号</option>
        <option value="15pt">小三</option>
        <option value="14pt">四号</option>
        <option value="12pt">小四</option>
        <option value="10.5pt">五号</option>
        <option value="9pt">小五</option>
        <option value="7.5pt">六号</option>
        <option value="6.5pt">小六</option>
        <option value="5.5pt">七号</option>
        <option value="5pt">八号</option>
        <!-- 数字字号列表 -->
        <option value="5pt">5</option>
        <option value="5.5pt">5.5</option>
        <option value="6.5pt">6.5</option>
        <option value="7.5pt">7.5</option>
        <option value="8pt">8</option>
        <option value="9pt">9</option>
        <option value="10pt">10</option>
        <option value="10.5pt">10.5</option>
        <option value="11pt">11</option>
        <option value="12pt">12</option>
        <option value="14pt">14</option>
        <option value="15pt">15</option>
        <option value="16pt">16</option>
        <option value="18pt">18</option>
        <option value="20pt">20</option>
        <option value="22pt">22</option>
        <option value="24pt">24</option>
        <option value="26pt">26</option>
        <option value="28pt">28</option>
        <option value="36pt">36</option>
        <option value="48pt">48</option>
        <option value="54pt">54</option>
        <option value="56pt">56</option>
        <option value="63pt">63</option>
        <option value="72pt">72</option>
      </select>
    </div>

    <!-- 字体样式按钮组 -->
    <div class="font-style-group">
      <button 
        @click="$emit('font-style-change', 'increase-size')" 
        class="font-btn"
        @mouseenter="showTooltip($event, '增大字体')"
        @mouseleave="hideTooltip"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H9M19,8V11H16V13H19V16H21V13H24V11H21V8H19Z" fill="currentColor"/>
        </svg>
      </button>
      <button 
        @click="$emit('font-style-change', 'decrease-size')" 
        class="font-btn"
        @mouseenter="showTooltip($event, '减小字体')"
        @mouseleave="hideTooltip"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H9M19,11V13H24V11H19Z" fill="currentColor"/>
        </svg>
      </button>
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
import { useTheme } from '../composables/useTheme';
import { useTooltip } from '../composables/useTooltip';
import Tooltip from './Tooltip.vue';

// Props
interface Props {
  currentFontFamily?: string;
  currentFontSize?: string;
}

withDefaults(defineProps<Props>(), {
  currentFontFamily: 'Arial, sans-serif',
  currentFontSize: '10.5pt'
});

// Emits
const emit = defineEmits<{
  'font-family-change': [fontFamily: string];
  'font-size-change': [fontSize: string];
  'font-style-change': [action: string];
}>();

// 主题系统
const { isDarkTheme } = useTheme();

// Tooltip 功能
const { tooltip, showTooltip, hideTooltip } = useTooltip();

// 确保 TypeScript 识别这些变量在模板中被使用
// 这些变量实际在模板的事件处理器和组件绑定中使用
const _tooltipRefs = { tooltip, showTooltip, hideTooltip };

/**
 * 处理字体族变化
 * @param {Event} event - 选择事件
 */
const handleFontFamilyChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  emit('font-family-change', target.value);
};

/**
 * 处理字体大小变化
 * @param {Event} event - 选择事件
 */
const handleFontSizeChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  emit('font-size-change', target.value);
};
</script>

<script lang="ts">
export default {
  name: 'FontTool'
};
</script>

<style scoped>
.font-tool {
  display: flex;
  align-items: center;
  gap: 8px;
}

.font-control {
  display: flex;
  align-items: center;
}

.font-select {
  height: 34px;
  padding: 8px 28px 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background-color: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: calc(100% - 8px) center;
  background-size: 14px 14px;
  min-width: 120px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.font-size-select {
  height: 34px;
  padding: 8px 28px 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background-color: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: calc(100% - 8px) center;
  background-size: 14px 14px;
  min-width: 70px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.font-select:hover,
.font-size-select:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.font-select:focus,
.font-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.font-style-group {
  display: flex;
  gap: 4px;
}

.font-style-group .font-btn {
  border-radius: 6px;
}

.font-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.font-btn:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.font-btn:active {
  transform: translateY(0);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
}

.font-btn svg {
  pointer-events: none;
  fill: currentColor;
  color: inherit;
}

/* 悬浮提示样式 */
.font-tooltip {
  position: fixed;
  background: linear-gradient(135deg, #1f2937, #374151);
  color: #ffffff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  transform: translateX(-50%);
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* 暗色主题样式 */
.font-tool.dark-theme .font-select,
.font-tool.dark-theme .font-size-select {
  background-color: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23e0e0e0' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
}

.font-tool.dark-theme .font-select:hover,
.font-tool.dark-theme .font-size-select:hover {
  border-color: #4285f4;
  background-color: #404040;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.font-tool.dark-theme .font-select:focus,
.font-tool.dark-theme .font-size-select:focus {
  border-color: #4285f4;
  background-color: #404040;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
}

.font-tool.dark-theme .font-style-group {
  background: #2d2d2d;
  border-color: #404040;
}

.font-tool.dark-theme .font-btn {
  background: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.font-tool.dark-theme .font-btn:hover {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(147, 51, 234, 0.15));
  border-color: #4285f4;
  color: #4285f4;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.15);
}

.font-tool.dark-theme .font-btn:active {
   background: linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(147, 51, 234, 0.25));
 }
 
 .font-tool.dark-theme .font-select optgroup,
  .font-tool.dark-theme .font-size-select optgroup {
    background-color: #2d2d2d !important;
    color: #e0e0e0 !important;
    font-weight: 600;
  }
  
  .font-tool.dark-theme .font-select option,
  .font-tool.dark-theme .font-size-select option {
    background-color: #2d2d2d !important;
    color: #e0e0e0 !important;
    border: none;
  }
  
  .font-tool.dark-theme .font-select option:hover,
  .font-tool.dark-theme .font-size-select option:hover,
  .font-tool.dark-theme .font-select option:focus,
  .font-tool.dark-theme .font-size-select option:focus {
    background-color: #404040 !important;
    color: #4285f4 !important;
  }
  
  .font-tool.dark-theme .font-select option:checked,
  .font-tool.dark-theme .font-size-select option:checked {
    background-color: #4285f4 !important;
    color: #ffffff !important;
  }

/* 响应式设计 */
@media (max-width: 768px) {
  .font-select {
    min-width: 100px;
    font-size: 12px;
  }
  
  .font-size-select {
    min-width: 50px;
    font-size: 12px;
  }
  
  .font-btn {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .font-tool {
    gap: 4px;
  }
  
  .font-select {
    min-width: 80px;
    font-size: 11px;
  }
  
  .font-size-select {
    min-width: 40px;
    font-size: 11px;
  }
  
  .font-btn {
    width: 24px;
    height: 24px;
  }
}
</style>