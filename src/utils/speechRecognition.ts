// 语音识别工具类
export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private finalTranscript: string = ''; // 保存最终识别的文本

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('浏览器不支持语音识别功能');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN'; // 设置语言为中文
    this.recognition.continuous = true; // 持续识别
    this.recognition.interimResults = true; // 返回临时结果（重要：必须为 true 才能实时显示）

    console.log('语音识别配置:', {
      lang: this.recognition.lang,
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
    });

    // 识别结果事件
    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newFinalTranscript = '';

      // 从 resultIndex 开始处理所有结果
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // 最终结果
          newFinalTranscript += transcript;
        } else {
          // 临时结果（实时显示）
          interimTranscript += transcript;
        }
      }

      // 如果有新的最终结果，更新最终文本
      if (newFinalTranscript) {
        this.finalTranscript += newFinalTranscript;
        console.log('最终结果:', newFinalTranscript);
      }

      // 如果有临时结果，也记录日志
      if (interimTranscript) {
        console.log('临时结果:', interimTranscript);
      }

      // 组合最终文本和临时文本，实时显示
      // 即使文本为空，也要触发回调以清除之前的临时结果
      const fullTranscript = this.finalTranscript + interimTranscript;

      if (this.onResultCallback) {
        // 始终调用回调，确保临时结果能实时显示
        this.onResultCallback(fullTranscript);
      }
    };

    // 错误处理
    this.recognition.onerror = (event: any) => {
      let errorMessage = '语音识别出错';
      switch (event.error) {
        case 'no-speech':
          // 未检测到语音不算严重错误，可以静默处理或提示
          errorMessage = '未检测到语音，请重试';
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查权限设置';
          break;
        case 'not-allowed':
          errorMessage =
            '麦克风权限被拒绝，请点击地址栏左侧的锁图标，允许使用麦克风';
          break;
        case 'aborted':
          // 用户主动停止，不需要显示错误
          // 但需要确保状态正确更新
          this.isListening = false;
          if (this.onEndCallback) {
            this.onEndCallback();
          }
          return;
        case 'network':
          errorMessage = '网络错误，请检查网络连接';
          break;
        case 'service-not-allowed':
          errorMessage = '语音识别服务不可用，请检查网络连接';
          break;
        default:
          errorMessage = `识别错误: ${event.error}`;
          console.error('语音识别错误详情:', event);
      }

      // 某些错误不需要显示给用户
      if (event.error !== 'no-speech' && this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    };

    // 识别开始
    this.recognition.onstart = () => {
      console.log('语音识别服务已启动');
      this.isListening = true;
      this.finalTranscript = ''; // 重置最终文本
      // 触发一次空结果回调，确保 UI 状态正确
      if (this.onResultCallback) {
        this.onResultCallback('');
      }
      if (this.onStartCallback) {
        this.onStartCallback();
      }
    };

    // 识别结束
    this.recognition.onend = () => {
      // 只有在还在监听状态时才更新，避免重复触发
      if (this.isListening) {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      }
    };
  }

  // 请求麦克风权限
  private async requestMicrophonePermission(): Promise<boolean> {
    // 检查是否是安全上下文
    if (!SpeechRecognitionService.isSecureContext()) {
      const errorMessage =
        '语音识别需要 HTTPS 连接。请使用 HTTPS 或 localhost 访问。';
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
      return false;
    }

    // 检查是否支持 getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('浏览器不支持 getUserMedia，尝试直接启动语音识别');
      // 某些浏览器可能不需要先请求权限，直接返回 true
      return true;
    }

    try {
      // 先请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 立即停止流，我们只需要权限
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error: any) {
      console.error('麦克风权限请求失败:', error);
      let errorMessage = '无法访问麦克风';

      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        errorMessage =
          '麦克风权限被拒绝，请点击地址栏左侧的锁图标，允许使用麦克风';
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        errorMessage = '未找到麦克风设备';
      } else if (
        error.name === 'NotReadableError' ||
        error.name === 'TrackStartError'
      ) {
        errorMessage = '麦克风被其他应用占用，请关闭其他应用后重试';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = '麦克风配置不支持';
      } else if (error.name === 'SecurityError') {
        errorMessage = '安全错误：请使用 HTTPS 或 localhost 访问';
      } else {
        errorMessage = `无法访问麦克风: ${error.message || error.name}`;
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
      return false;
    }
  }

  // 开始识别
  async start() {
    if (!this.recognition) {
      if (this.onErrorCallback) {
        this.onErrorCallback('浏览器不支持语音识别功能');
      }
      return;
    }

    if (this.isListening) {
      return;
    }

    // 先请求麦克风权限
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    try {
      console.log('正在启动语音识别...');
      this.recognition.start();
      console.log('语音识别启动命令已发送');
    } catch (error: any) {
      // 如果已经在运行，忽略错误
      if (this.isListening) {
        console.log('语音识别已在运行中');
        return;
      }

      console.error('启动语音识别失败:', error);
      let errorMessage = '启动语音识别失败';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    }
  }

  // 停止识别
  stop() {
    if (!this.recognition) {
      return;
    }

    if (this.isListening) {
      try {
        // 使用 abort() 立即停止，而不是 stop() 等待当前识别完成
        this.recognition.abort();
      } catch (error) {
        // 如果 abort 失败，尝试 stop
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('停止语音识别失败:', e);
        }
      }
      // 立即更新状态，不等待 onend 事件
      this.isListening = false;
      // 手动触发 onend 回调，确保 UI 更新
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    }
  }

  // 设置回调函数
  onResult(callback: (text: string) => void) {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  onStart(callback: () => void) {
    this.onStartCallback = callback;
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  // 获取当前状态
  getIsListening(): boolean {
    return this.isListening;
  }

  // 检查浏览器是否支持
  static isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // 检查是否支持 Web Speech API
    const hasSpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!hasSpeechRecognition) {
      return false;
    }

    // 检查是否支持 getUserMedia（用于权限请求）
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('浏览器不支持 getUserMedia API');
      // 即使不支持 getUserMedia，也允许尝试使用 SpeechRecognition
      // 因为某些浏览器可能直接支持
      return true;
    }

    return true;
  }

  // 检查协议是否安全（HTTPS 或 localhost）
  static isSecureContext(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return (
      window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }
}
