import * as dotenv from "dotenv";
import express from "express";
import { Ling } from "@bearbobo/ling";
import bodyParser from 'body-parser';
import { pipeline } from "node:stream/promises";
import {
  createEventChannel,
  getEventChannel,
} from "./lib/service/eventChannel";
import { getContext } from "./lib/config/context.config";
import {
  getInterviewMemory,
  updateInterviewMemory,
} from "./lib/service/memory";
import memoryPrompt from "./lib/prompt/memory.prompt";

dotenv.config({
  path: [".local.env", ".env"],
});

const apiKey: string = process.env.VITE_DEEPSEEK_API_KEY as string;
const endpoint: string = process.env.VITE_DEEPSEEK_ENDPOINT as string;
const modelName: string = process.env.VITE_DEEPSEEK_MODEL_NAME as string;

const app = express();
const port: number = 3000;

// 添加JSON请求体解析中间件
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json());

const historyMap: Record<string, Array<{ role: any; content: string }>> = {};

// API 设计范式读写分离设计
// 其要点是在处理 POST 请求时，将接收到的流式数据异步写入缓存对象中，该缓存对象可以是内存对象（不推荐），
// 也可以是 Redis 等持久化缓存。为了简单起见，我们使用了内存对象。
// 异步写入数据时，我们将 channel ID 作为唯一标识返回给前端，
// 前端可以通过 /api/event?channle=${channel} 这样的方式来异步读取流式数据。
app.post("/chat", async (req: express.Request, res: express.Response) => {
  const { message, sessionId, timeline } = req.body;
  const config = {
    model_name: modelName,
    api_key: apiKey,
    endpoint: endpoint,
    sse: true,
  };

  historyMap[sessionId] = historyMap[sessionId] || [];
  const histories = historyMap[sessionId];
  histories.push({ role: "user", content: message });

  // 根据当前时间线获取当前面试阶段的提示词
  const context = getContext(timeline);
  // 获取当前记忆
  const memory = getInterviewMemory(sessionId);
  const memoryStr = `# memory

${JSON.stringify(memory)}
`;

  // ------- The work flow start --------
  const ling = new Ling(config, {
    max_tokens: 8192,
  });
  // 对话的智能体
  const bot = ling.createBot(
    "reply",
    {},
    { response_format: { type: "text" } }
  );
  console.log("context", context);
  bot.addPrompt(context);
  // 将记忆加入到提示词中
  bot.addPrompt(memoryStr);

  bot.addHistory(histories.slice(-3));

  // 更新记忆的智能体
  const memoryBot = ling.createBot(
    "memory",
    {},
    {
      // 设置 quiet 参数后，它在执行推理的过程里，并不会将任何内容发送给前端。
      // 所以，我们无需等待这部分内容更新结束，就可以继续前端的对话。
      // 这样就不会因为记忆的更新需要的时间过长，而导致用户等待很久，让面试沟通变得不够流畅
      quiet: true,
    }
  );

  memoryBot.addPrompt(memoryPrompt, { memory: memoryStr });

  memoryBot.chat(`# 历史对话内容

## 提问
${histories[histories.length - 2]?.content || ""}

## 回答
${histories[histories.length - 1]?.content || ""}

请更新记忆`);

  memoryBot.addListener("inference-done", (content) => {
    // 更新记忆的智能体在一次对话完成后根据对话记录更新记忆
    const memory = JSON.parse(content);
    console.log("memory", memory);
    updateInterviewMemory(sessionId, memory);
  });

  bot.chat(message);

  bot.addListener("inference-done", (content) => {
    // 对话智能体经过一次对话后，将回答加入历史记录
    histories.push({ role: "assistant", content });
  });

  bot.addListener("response", () => {
    // 向前端发送自定义事件，ling会根据 EventSource协议，将这个事件发送给前端，前端可以监听response-finished事件
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events/Using_server-sent_events
    ling.sendEvent({ event: "response-finished" });
  });

  ling.close();

  // 调用EventChannel的init方法，并将结果返回前端，前端能拿到channelId
  // 前端拿到 channel ID，就可以调用 /event 方法流式获取数据
  res.send(createEventChannel(ling));
});

app.get("/event", (req, res) => {
  const lastEventId = req.headers["last-event-id"] as string | undefined;
  const eventChannel = getEventChannel(req.query.channel as string);
  console.log(req.query.channel, 'channel----');

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const { stream, controller } = eventChannel.getStream(lastEventId);
  try {
    pipeline(stream as any, res);
  } catch (ex) {
    console.log(ex);
    controller?.close();
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
