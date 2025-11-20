import { Ling } from "@bearbobo/ling";
import { sleep } from "../utils/sleep";

const EventChannelMap: Record<string, EventChannel> = {};

export function getEventChannel(id: string) {
  return EventChannelMap[id];
}
export function createEventChannel(ling: Ling) {
  const channel = new EventChannel();
  const ret = channel.init(ling);
  EventChannelMap[channel.id as string] = channel;
  return ret;
}

class EventChannel {
  private frequency: number = 100; // 100 ms 异步刷新
  private eventBuffer: string[] = [];
  public id: string | undefined;

  init(ling: Ling): { message: string; code: number; channel: string } {
    this.id = Math.random().toString(36).substring(2, 10);
    ling.on("finished", () => {
      try {
        // @ts-ignore
        ling.tube?.controller?.close();
      } catch (ex) {}
    });

    const reader = ling.stream.getReader();
    const events = this.eventBuffer;
    reader
      .read()
      .then(async function processText({ done: _done, value }): Promise<any> {
        if (_done) {
          return;
        }
        events.push(value);
        return reader.read().then(processText);
      })
      .catch((ex) => {
        console.error(ex);
      });

    return {
      message: "success",
      code: 201,
      channel: this.id,
    };
  }

  getStream(lastEventId?: string): {
    stream: ReadableStream;
    controller: ReadableStreamDefaultController | null;
  } {
    let controller: ReadableStreamDefaultController | null = null;
    const stream = new ReadableStream({
      start(_controller: ReadableStreamDefaultController) {
        // 控制器用于向流中写入数据
        controller = _controller;
      },
    });

    const events = this.eventBuffer;

    let i = 0;
    let isFinished = false;

    if (lastEventId) {
      for (let j = 0; j < events.length; j++) {
        const event = events[i];
        if (event.startsWith('data: {"event":"finished"}')) {
          isFinished = true;
          break;
        }
        if (event.includes(`id: ${lastEventId}`)) {
          i = j + 1;
          break;
        }
      }
    }

    // 因为 init 之后，Ling 对象会不断将数据发送到 eventBuffer 中，
    // 所以在我们 getStream 函数调用的时候，eventBuffer 里面很可能已经有一部分数据。
    for (; i < events.length; i++) {
      const event = events[i];
      if (event.startsWith('data: {"event":"finished"}')) {
        isFinished = true;
        break;
      }
      if (controller) {
        // 将数据推送到流中
        (controller as ReadableStreamDefaultController).enqueue(event);
      }
    }

    // 然后等待增量数据到来
    (async () => {
      // 等待更新
      while (true) {
        if (isFinished) {
          break;
        }
        await sleep(this.frequency);
        for (; i < events.length; i++) {
          const event = events[i];
          if (event.startsWith('data: {"event":"finished"}')) {
            isFinished = true;
          }
          if (controller) {
            (controller as ReadableStreamDefaultController).enqueue(event);
          }
        }
      }
      // console.log(events);
      this.eventBuffer = [];
      if (controller) {
        (controller as ReadableStreamDefaultController).close();
      }
      delete EventChannelMap[this.id as string];
    })();

    return { stream, controller };
  }
}
