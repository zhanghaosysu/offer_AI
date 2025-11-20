# AI 面试系统 (Offer AI)

一个基于大语言模型的智能面试系统，支持实时对话、语音输入、面试时间轴管理和智能记忆系统。

## 🎯 项目简介

这是一个完整的 AI 面试官系统，能够模拟真实面试场景，与候选人进行多轮对话。系统支持文本和语音两种输入方式，具备智能记忆功能，能够根据面试进度动态调整问题，并提供结构化的面试评价。

### 核心功能

- ✅ **AI 面试官对话**：基于大语言模型的智能对话系统
- ✅ **实时流式响应**：使用 SSE 实现 AI 回复的实时流式输出
- ✅ **面试时间轴管理**：35 分钟结构化面试流程，自动切换不同面试阶段
- ✅ **智能记忆系统**：自动记录和更新面试信息、评价和摘要
- ✅ **语音输入支持**：基于 Web Speech API 的实时语音识别
- ✅ **读写分离架构**：异步事件通道设计，提升系统响应速度

## 🚀 技术栈

### 前端技术

- **Vue 3** - 渐进式 JavaScript 框架，使用 Composition API
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 快速的构建工具和开发服务器
- **Web Speech API** - 浏览器原生语音识别 API

### 后端技术

- **Node.js** - JavaScript 运行时环境
- **Express 5** - 轻量级 Web 应用框架
- **@bearbobo/ling** - AI 对话框架，支持流式输出
- **Server-Sent Events (SSE)** - 服务器推送事件，实现实时流式传输

### AI 相关

- **DeepSeek API** - 大语言模型 API（可配置）
- **Prompt Engineering** - 精心设计的提示词系统
- **多智能体架构** - 对话智能体 + 记忆更新智能体

## 📦 项目结构

```
offer_AI/
├── src/                          # 前端源码
│   ├── components/              # Vue 组件
│   │   ├── ChatDisplay.vue      # 聊天显示组件
│   │   ├── MessageInput.vue      # 消息输入组件（支持语音）
│   │   └── Timeline.vue         # 面试时间轴组件
│   ├── utils/                    # 工具函数
│   │   └── speechRecognition.ts # 语音识别服务
│   ├── types/                    # TypeScript 类型定义
│   ├── App.vue                  # 根组件
│   └── main.ts                  # 应用入口
├── lib/                         # 后端业务逻辑
│   ├── config/                  # 配置文件
│   │   ├── context.config.ts    # 面试上下文配置
│   │   └── timeline.config.ts   # 时间轴配置
│   ├── prompt/                  # 提示词模板
│   │   ├── basicRule.prompt.ts  # 基本原则
│   │   ├── jd.prompt.ts         # 职位描述
│   │   ├── roleAndTask.prompt.ts # 角色和任务
│   │   └── memory.prompt.ts     # 记忆更新提示词
│   └── service/                 # 服务层
│       ├── eventChannel.ts     # 事件通道服务（SSE）
│       └── memory.ts           # 记忆管理服务
├── server.ts                    # Express 服务器
├── package.json                 # 项目配置
└── vite.config.ts              # Vite 配置
```

## 🛠️ 核心难点与技术亮点

### 1. 读写分离的 API 设计

**问题**：传统的同步 API 设计在流式输出场景下会导致前端长时间等待，用户体验差。

**解决方案**：

- 采用读写分离设计，POST `/chat` 接口立即返回 channel ID
- 前端通过 GET `/event?channel=${channel}` 异步读取流式数据
- 使用 EventChannel 管理多个并发会话

```typescript
// 后端：立即返回 channel ID
app.post('/chat', async (req, res) => {
  // ... 初始化 AI 对话
  res.send(createEventChannel(ling)); // 返回 { channel: "xxx" }
});

// 前端：通过 SSE 异步读取
const eventSource = new EventSource(`/api/event?channel=${channel}`);
```

**技术亮点**：

- 异步事件缓冲机制
- 支持断线重连（last-event-id）
- 内存管理（会话结束后自动清理）

### 2. 实时流式数据传输

**问题**：AI 回复是流式的，需要实时显示给用户，而不是等待完整回复。

**解决方案**：

- 使用 Server-Sent Events (SSE) 实现服务器到客户端的实时推送
- 前端通过 EventSource API 接收增量数据
- 使用 ReadableStream 和 pipeline 处理流式数据

```typescript
// 后端：SSE 流式输出
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// 前端：实时接收并更新 UI
eventSource.addEventListener('message', (e) => {
  const { delta } = JSON.parse(e.data);
  aiResponse.content += delta;
  messages.value = [...messages.value]; // 强制 Vue 更新
});
```

**技术亮点**：

- 100ms 频率的异步刷新机制
- 事件缓冲和流式传输的完美结合
- 支持自定义事件（如 response-finished）

### 3. 异步记忆更新系统

**问题**：记忆更新需要调用 AI，如果同步等待会导致用户等待时间过长，影响对话流畅性。

**解决方案**：

- 使用 `quiet: true` 参数创建独立的记忆更新智能体
- 记忆更新在后台异步进行，不阻塞主对话流程
- 通过 `inference-done` 事件异步更新记忆

```typescript
// 对话智能体（主流程）
const bot = ling.createBot('reply', {}, { response_format: { type: 'text' } });

// 记忆更新智能体（后台异步）
const memoryBot = ling.createBot('memory', {}, { quiet: true });
memoryBot.addListener('inference-done', (content) => {
  const memory = JSON.parse(content);
  updateInterviewMemory(sessionId, memory);
});
```

**技术亮点**：

- 双智能体架构设计
- 异步处理提升用户体验
- 结构化记忆数据管理

### 4. 面试时间轴与阶段管理

**问题**：面试需要按照不同阶段进行，每个阶段有不同的重点和提示词。

**解决方案**：

- 定义时间轴配置，将 35 分钟面试分为 7 个阶段
- 根据当前时间动态获取对应的上下文和提示词
- 前端实时显示当前面试进度

```typescript
// 时间轴配置
const timelineConfig = {
  steps: [
    { startTime: 0, endTime: 3, focus: '自我介绍', prompt: '...' },
    { startTime: 3, endTime: 10, focus: '项目讨论', prompt: '...' },
    // ...
  ],
};

// 根据时间获取上下文
export function getContext(timeline: number): string {
  // 动态匹配当前阶段并返回对应提示词
}
```

**技术亮点**：

- 配置化的面试流程管理
- 动态上下文切换
- 前端时间轴可视化

### 5. 语音识别集成

**问题**：需要支持语音输入，并在录音期间实时显示识别结果。

**解决方案**：

- 使用 Web Speech API 实现浏览器原生语音识别
- 处理临时结果（interimResults）实现实时显示
- 完善的权限管理和错误处理

```typescript
// 配置语音识别
this.recognition.continuous = true; // 持续识别
this.recognition.interimResults = true; // 返回临时结果

// 实时处理识别结果
this.recognition.onresult = (event) => {
  // 区分最终结果和临时结果
  // 实时更新 textarea
};
```

**技术亮点**：

- 临时结果和最终结果的智能合并
- 完善的错误处理和用户提示
- 支持 HTTPS 安全上下文检查

### 6. 提示词工程

**问题**：如何让 AI 按照面试流程进行，并保持上下文一致性。

**解决方案**：

- 模块化的提示词设计（基本原则、角色任务、职位描述、记忆）
- 动态上下文注入（当前时间、阶段、历史问题）
- 结构化输出（JSON 格式的记忆数据）

**技术亮点**：

- 可维护的提示词模板系统
- 上下文感知的智能体行为
- 结构化数据提取

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

创建 `.env` 或 `.local.env` 文件：

```env
VITE_DEEPSEEK_API_KEY=your_api_key
VITE_DEEPSEEK_ENDPOINT=https://api.deepseek.com
VITE_DEEPSEEK_MODEL_NAME=deepseek-chat
```

### 启动开发服务器

```bash
pnpm run dev
```

这将同时启动：

- 前端开发服务器：http://localhost:4399
- 后端 Express 服务器：http://localhost:3000

### 构建生产版本

```bash
pnpm run build
```

### 预览构建结果

```bash
pnpm run preview
```

## 📝 使用说明

1. **开始面试**：系统会自动发送欢迎消息，开始面试流程
2. **输入方式**：
   - 文本输入：直接在输入框输入并发送
   - 语音输入：点击麦克风图标开始录音，再次点击停止
3. **面试流程**：系统会根据时间自动切换不同面试阶段
4. **实时反馈**：AI 回复会以流式方式实时显示

## 🔧 技术细节

### API 设计

- `POST /chat` - 发送消息，返回 channel ID
- `GET /event?channel=${channel}` - 通过 SSE 获取流式响应

### 记忆系统

记忆数据包括：

- 候选人基本信息
- 已问问题列表
- 各项能力评价
- 面试摘要
- 特别备注

### 时间轴阶段

1. **0-3 分钟**：自我介绍
2. **3-10 分钟**：项目讨论
3. **10-17 分钟**：技术讨论
4. **17-25 分钟**：代码和算法讨论
5. **25-30 分钟**：非技术问题讨论
6. **30-32 分钟**：反问
7. **32+ 分钟**：结束

## 🎨 项目特色

- **现代化技术栈**：Vue 3 + TypeScript + Vite
- **实时交互体验**：SSE 流式传输 + 语音识别
- **智能记忆系统**：自动记录和更新面试信息
- **结构化面试流程**：时间轴驱动的阶段管理
- **优秀的用户体验**：异步处理、实时反馈、流畅对话

## 🔮 待完善功能

当前项目处于 MVP（最小可行产品）阶段，以下功能计划在未来版本中实现：

### 1. 业务后台配置系统

**目标**：通过业务后台动态配置提示词和面试参数，支持多岗位、多面试官场景。

**待实现功能**：

- ✅ **岗位 JD 配置**

  - 当前：`jd.prompt.ts` 硬编码在代码中
  - 计划：通过后台管理系统配置不同岗位的 JD
  - 支持：多岗位切换、JD 版本管理、模板化配置

- ✅ **面试官角色配置**

  - 当前：`roleAndTask.prompt.ts` 固定为"月影，字节跳动的前端面试官"
  - 计划：支持配置不同的面试官角色和风格
  - 支持：不同公司、不同级别、不同面试风格的面试官

- ✅ **提示词模板管理**
  - 当前：所有提示词文件硬编码
  - 计划：提供可视化的提示词编辑器
  - 支持：版本控制、A/B 测试、效果评估

**技术实现方向**：

```typescript
// 计划中的配置 API
interface JobDescriptionConfig {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  // ...
}

interface InterviewerConfig {
  id: string;
  name: string;
  company: string;
  role: string;
  style: 'strict' | 'friendly' | 'technical';
  // ...
}

// 动态加载配置
app.post('/chat', async (req, res) => {
  const { jobId, interviewerId } = req.body;
  const jd = await getJobDescription(jobId);
  const interviewer = await getInterviewerConfig(interviewerId);
  // 动态构建上下文
});
```

### 2. 面试记录存储与恢复

**目标**：支持面试中断后恢复，确保长时间面试过程的数据不丢失。

**当前状态**：

- `Memory`（记忆数据）存储在内存 `Map` 中，服务重启后丢失
- `History`（对话历史）存储在内存 `historyMap` 中，服务重启后丢失
- `Timeline`（时间轴状态）仅在前端维护，刷新页面后丢失
- 用户中断面试后无法恢复，需要重新开始

**问题场景**：

- 面试通常持续 35 分钟，用户可能因网络问题、设备故障、临时事务等原因中断
- 当前实现下，中断后所有进度丢失，用户体验差
- 服务重启会导致所有进行中的面试数据丢失

**计划改进**：

- ✅ **持久化存储方案**

  - 使用数据库（MongoDB/PostgreSQL）或 Redis 持久化面试状态
  - 存储内容：
    - `Timeline`：当前面试时间、阶段、是否已启动
    - `Memory`：完整的面试记忆数据（候选人信息、评价、摘要等）
    - `History`：完整的对话历史记录
    - `SessionId`：作为唯一标识，关联所有数据

- ✅ **自动保存机制**

  - 每次对话后自动保存状态到持久化存储
  - 定时保存机制（如每 30 秒自动保存一次）
  - 面试状态变更时立即保存

- ✅ **面试恢复功能**

  - 前端通过 `sessionId` 查询服务器持久化存储
  - 恢复 `Timeline` 状态，继续计时
  - 恢复 `Memory` 数据，保持上下文连续性
  - 恢复 `History` 记录，显示完整对话历史
  - 无缝继续面试，用户无感知

- ✅ **数据查询与管理**
  - 支持面试记录的查询、导出、分析
  - 面试数据统计和可视化
  - 支持删除过期或无效的面试记录

**技术实现方向**：

```typescript
// 面试状态接口
interface InterviewSession {
  sessionId: string;
  timeline: {
    currentTime: number;
    totalDuration: number;
    started: boolean;
    startTime: number; // 面试开始时间戳
  };
  memory: InterviewMemory;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  status: 'in_progress' | 'completed' | 'abandoned';
}

// 保存面试状态
async function saveInterviewSession(
  sessionId: string,
  data: Partial<InterviewSession>
) {
  await db.interviewSessions.updateOne(
    { sessionId },
    { $set: { ...data, updatedAt: new Date() } },
    { upsert: true }
  );
}

// 恢复面试状态
async function restoreInterviewSession(
  sessionId: string
): Promise<InterviewSession | null> {
  const session = await db.interviewSessions.findOne({ sessionId });
  if (session && session.status === 'in_progress') {
    // 计算当前时间（考虑中断时间）
    const elapsedTime = (Date.now() - session.timeline.startTime) / 60000;
    session.timeline.currentTime = Math.min(
      elapsedTime,
      session.timeline.totalDuration
    );
    return session;
  }
  return null;
}

// API 端点
app.get('/api/interview/:sessionId', async (req, res) => {
  const session = await restoreInterviewSession(req.params.sessionId);
  if (session) {
    res.json(session);
  } else {
    res.status(404).json({ error: '面试记录不存在或已结束' });
  }
});

// 前端恢复逻辑
const sessionId = localStorage.getItem('interviewSessionId');
if (sessionId) {
  const session = await fetch(`/api/interview/${sessionId}`).then((r) =>
    r.json()
  );
  if (session) {
    // 恢复 Timeline
    currentTime.value = session.timeline.currentTime;
    timelineStarted.value = session.timeline.started;

    // 恢复 Memory
    restoreInterviewMemory(sessionId, session.memory);

    // 恢复 History
    messages.value = session.history;
  }
}
```

**存储方案选择**：

- **Redis**：适合快速读写，支持过期时间，适合临时会话数据
- **MongoDB/PostgreSQL**：适合长期存储，支持复杂查询，适合历史数据分析
- **混合方案**：Redis 存储活跃会话，数据库存储历史记录

### 3. 用户认证与权限管理

**计划功能**：

- 面试官/HR 登录系统
- 候选人访问链接管理
- 面试记录权限控制

### 4. 面试记录导出

**计划功能**：

- 导出面试记录为 PDF/Word
- 结构化数据导出（JSON/Excel）
- 面试评价报告生成

### 5. 多语言支持

**计划功能**：

- 支持英文面试
- 多语言提示词配置
- 国际化界面

### 6. 面试质量评估

**计划功能**：

- AI 自动评估面试质量
- 面试官表现分析
- 候选人反馈收集

### 7. 实时协作功能

**计划功能**：

- 多面试官同时参与
- 实时标注和备注
- 面试过程录制回放

## 📚 相关资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Express 官方文档](https://expressjs.com/)
- [Web Speech API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Server-Sent Events 文档](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 📄 许可证

MIT License
