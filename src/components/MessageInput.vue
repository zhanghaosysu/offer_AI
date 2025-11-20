<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits(["sendMessage"]);

const message = ref("");

const handleSendMessage = () => {
  if (message.value.trim()) {
    emit("sendMessage", message.value);
    message.value = "";
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+Enter 发送消息
  if (event.ctrlKey && event.key === "Enter") {
    handleSendMessage();
  }
};
</script>

<template>
  <div class="message-input-container">
    <textarea
      v-model="message"
      class="message-input"
      placeholder="请输入您的回答..."
      @keydown="handleKeydown"
    ></textarea>
    <button class="send-button" @click="handleSendMessage">发送</button>
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

.message-input {
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

.send-button {
  align-self: flex-end;
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
