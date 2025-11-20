<script setup lang="ts">
import { ref } from "vue";
import Timeline from "./components/Timeline.vue";
import ChatDisplay from "./components/ChatDisplay.vue";
import MessageInput from "./components/MessageInput.vue";
import { Message } from "./types";

// 面试总时长（分钟）
const totalDuration = ref(35);
// 当前时间点（分钟）
const currentTime = ref(0);
// Timeline是否已启动
const timelineStarted = ref(false);
// 聊天消息列表
const messages = ref<Message[]>([
  {
    id: 1,
    sender: "ai",
    content: "您好，我是今天的面试官。请做个简单的自我介绍吧。",
    timestamp: new Date(),
  },
]);

// 更新当前时间点
const updateTime = (time: number) => {
  currentTime.value = time;
};

// 处理内容变化事件，启动Timeline
const handleContentChange = () => {
  if (!timelineStarted.value) {
    timelineStarted.value = true;
  }
};

const sessionId = Math.random().toString(36).slice(2, 9);

// 发送新消息
const sendMessage = async (content: string, buttonDisabled: any) => {
  const newMessage: Message = {
    id: messages.value.length + 1,
    sender: "user",
    content,
    timestamp: new Date(),
  };

  messages.value.push(newMessage);

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: newMessage.content,
      sessionId,
      timeline: currentTime.value,
    }),
  });

  const { channel } = await res.json();

  const eventSource = new EventSource(`/api/event?channel=${channel}`);
  let aiResponse: Message = {
    id: messages.value.length + 1,
    sender: "ai",
    content: "",
    timestamp: new Date(),
  };
  eventSource.addEventListener("message", function (e: any) {
    let { uri, delta } = JSON.parse(e.data);
     console.log(uri, delta);
    if (aiResponse.content === "") {
      aiResponse.content = delta;
      messages.value.push(aiResponse);
    } else {
      aiResponse.content += delta;
      messages.value = [...messages.value]; // 强制更新
    }
  });
  eventSource.addEventListener("response-finished", () => {
    buttonDisabled.value = false;
  });
  eventSource.addEventListener("finished", () => {
    console.log("传输完成");
    eventSource.close();
  });

  // 模拟AI回复（在实际应用中，这里会调用后端API）
  // setTimeout(() => {
  //   const aiResponse: Message = {
  //     id: messages.value.length + 1,
  //     sender: 'ai',
  //     content: `感谢您的回答。现在我们处于面试的第${Math.floor(currentTime.value)}分钟，继续下一个问题...`,
  //     timestamp: new Date()
  //   };
  //   messages.value.push(aiResponse);
  // }, 1000);
};
</script>

<template>
  <div class="interview-container">
    <!-- 左侧时间轴 -->
    <div class="timeline-section">
      <Timeline
        :current-time="currentTime"
        :total-duration="totalDuration"
        :started="timelineStarted"
        @update-time="updateTime"
      />
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-section">
      <div class="chat-header">
        <h2>AI面试官</h2>
        <div class="time-indicator">
          当前时间：{{ Math.floor(currentTime) }}分钟
        </div>
      </div>

      <!-- 聊天显示区域 -->
      <div class="chat-display-wrapper">
        <ChatDisplay
          :messages="messages"
          @content-change="handleContentChange"
        />
      </div>

      <!-- 消息输入区域 -->
      <div class="message-input-wrapper">
        <MessageInput @send-message="sendMessage" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.interview-container {
  display: flex;
  height: 90vh;
  max-width: 1920px;
  width: 100%;
  margin: 0 auto;
  background-color: #f5f5f5;
  overflow: hidden;
}

.timeline-section {
  width: 180px;
  height: 100%;
  border-right: 1px solid #ddd;
  background-color: #fff;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 30px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.time-indicator {
  padding: 6px 12px;
  background-color: #646cff;
  color: white;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.chat-display-wrapper {
  flex: 1;
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  max-height: 60%;
}

.message-input-wrapper {
  height: auto;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
</style>
