<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { SpeechRecognitionService } from '../utils/speechRecognition';

const emit = defineEmits(['sendMessage']);

const message = ref('');
const isListening = ref(false);
const isSupported = ref(false);
const errorMessage = ref('');
const speechRecognition = ref<SpeechRecognitionService | null>(null);

// 初始化语音识别
onMounted(() => {
  isSupported.value = SpeechRecognitionService.isSupported();
  if (isSupported.value) {
    speechRecognition.value = new SpeechRecognitionService();

    // 设置回调函数
    speechRecognition.value.onResult((text: string) => {
      console.log('onResult 收到文本:', text, '长度:', text.length);
      // 直接更新，Vue 会自动响应式更新
      message.value = text;
      errorMessage.value = '';
      console.log('message.value 已更新为:', message.value);
    });

    speechRecognition.value.onError((error: string) => {
      errorMessage.value = error;
      isListening.value = false;
    });

    speechRecognition.value.onStart(() => {
      console.log('语音识别已开始');
      isListening.value = true;
      errorMessage.value = '';
      // 可以选择在开始录音时清空之前的文本，或者保留让用户继续添加
      // 如果需要清空，取消下面的注释
      // message.value = '';
    });

    speechRecognition.value.onEnd(() => {
      isListening.value = false;
    });
  }
});

// 清理资源
onUnmounted(() => {
  if (speechRecognition.value) {
    speechRecognition.value.stop();
  }
});

const handleSendMessage = () => {
  if (message.value.trim()) {
    emit('sendMessage', message.value);
    message.value = '';
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+Enter 发送消息
  if (event.ctrlKey && event.key === 'Enter') {
    handleSendMessage();
  }
};

// 切换语音识别
const toggleSpeechRecognition = async () => {
  if (!speechRecognition.value) {
    errorMessage.value = '浏览器不支持语音识别功能';
    return;
  }

  if (isListening.value) {
    console.log('停止录音');
    speechRecognition.value.stop();
    // 确保状态立即更新
    isListening.value = false;
  } else {
    console.log('开始录音');
    // start() 现在是异步的，需要等待权限请求
    await speechRecognition.value.start();
  }
};
</script>

<template>
  <div class="message-input-container">
    <div class="input-header">
      <textarea
        v-model="message"
        class="message-input"
        placeholder="请输入您的回答..."
        @keydown="handleKeydown"
      ></textarea>
      <button
        v-if="isSupported"
        class="voice-button"
        :class="{ active: isListening }"
        @click="toggleSpeechRecognition"
        :title="isListening ? '点击停止录音' : '点击开始语音输入'"
      >
        <svg
          v-if="!isListening"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      </button>
    </div>
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="isListening" class="listening-indicator">
      <span class="pulse-dot"></span>
      正在录音中...
    </div>
    <div class="button-group">
      <button class="send-button" @click="handleSendMessage">发送</button>
    </div>
  </div>
</template>

<style scoped>
.message-input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background-color: #fff;
  border-top: 1px solid #eee;
  border-radius: 0 0 8px 8px;
}

.input-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.message-input {
  flex: 1;
  min-height: 80px;
  max-height: 120px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #646cff;
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
}

.voice-button {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.voice-button:hover {
  background-color: #e8e8e8;
  border-color: #646cff;
  color: #646cff;
}

.voice-button.active {
  background-color: #ff4444;
  border-color: #ff4444;
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 4px rgba(255, 68, 68, 0);
  }
}

.error-message {
  padding: 8px 12px;
  background-color: #fee;
  color: #c33;
  border-radius: 4px;
  font-size: 12px;
  border-left: 3px solid #c33;
}

.listening-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #ff4444;
  border-radius: 50%;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.button-group {
  display: flex;
  justify-content: flex-end;
}

.send-button {
  padding: 8px 16px;
  background-color: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.send-button:hover {
  background-color: #535bf2;
}
</style>
