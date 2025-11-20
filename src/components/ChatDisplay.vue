<script setup lang="ts">
import { ref, watch } from "vue";

interface Message {
  id: number;
  sender: "ai" | "user";
  content: string;
  timestamp: Date;
}

const props = defineProps<{
  messages: Message[];
}>();

// 创建聊天容器的引用
const chatDisplayRef = ref<HTMLElement | null>(null);

const emit = defineEmits(["content-change"]);

// 记录是否已经触发过内容变化事件
const hasEmittedContentChange = ref(false);

// 监听消息变化，自动滚动到底部并在首次变化时触发事件
watch(
  () => props.messages,
  (newMessages, oldMessages) => {
    scrollToBottom();

    // 如果消息数量变化且之前没有触发过内容变化事件
    if (newMessages.length > 1 && !hasEmittedContentChange.value) {
      emit("content-change");
      hasEmittedContentChange.value = true;
    }
  },
  { deep: true }
);

// 滚动到底部的方法
const scrollToBottom = () => {
  setTimeout(() => {
    if (chatDisplayRef.value) {
      chatDisplayRef.value.scrollTop = chatDisplayRef.value.scrollHeight;
    }
  }, 0);
};
</script>

<template>
  <div class="chat-display" ref="chatDisplayRef">
    <div v-if="messages.length === 0" class="empty-state">
      <p>面试即将开始，请准备好...</p>
    </div>
    <div v-else class="message-list">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="message.sender"
      >
        <div class="message-header">
          <span class="sender">{{
            message.sender === "ai" ? "AI面试官" : "候选人"
          }}</span>
          <span class="timestamp">{{
            new Date(message.timestamp).toLocaleTimeString()
          }}</span>
        </div>
        <div class="message-content">
          {{ message.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-display {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.empty-state {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #888;
  font-style: italic;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}

.message {
  max-width: 80%;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message.ai {
  align-self: flex-start;
  background-color: #e1f5fe;
  border-bottom-left-radius: 0;
}

.message.user {
  align-self: flex-end;
  background-color: #e8f5e9;
  border-bottom-right-radius: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
}

.sender {
  font-weight: bold;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
