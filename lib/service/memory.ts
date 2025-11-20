export interface InterviewMemory {
  sessionId: string;

  conversationIndex: number; // 当前记忆的对话轮次，因为是异步更新的，需要用这个来匹配对话

  lastConversation: string; // 上一轮对话内容

  // 候选人的基本信息和自我介绍
  candidateIntroduction: string;

  // 面试官已经问过的问题（按顺序记录）
  askedQuestions: string[];

  // 对候选人各项能力的评价
  candidateEvaluation: {
    technicalSkills: string; // 技术能力评价
    problemSolving: string; // 问题解决能力
    communication: string; // 沟通表达能力
    codingStyle?: string; // 可选：编码风格或代码质量
    overallImpression: string; // 总体印象
  };

  // 面试摘要：总结整个过程，比如面试重点、表现亮点或不足
  interviewSummary: string;

  // 特别备注：如迟到、网络问题、态度问题、需进一步确认的信息等
  additionalNotes: string[];

  lastUpdateTime: number;
}

const interviewMemoryMap = new Map<string, InterviewMemory>();
export function getInterviewMemory(sessionId: string): InterviewMemory {
  let memory = interviewMemoryMap.get(sessionId);
  if (!memory) {
    memory = createInterviewMemory(sessionId);
    interviewMemoryMap.set(sessionId, memory);
  }
  return memory;
}

export function updateInterviewMemory(
  sessionId: string,
  memory: InterviewMemory
) {
  interviewMemoryMap.set(sessionId, memory);
}

export function clearInterviewMemory(sessionId: string) {
  interviewMemoryMap.delete(sessionId);
}

function createInterviewMemory(sessionId: string): InterviewMemory {
  return {
    sessionId,
    conversationIndex: 0,
    lastConversation: "",
    candidateIntroduction: "",
    askedQuestions: [],
    candidateEvaluation: {
      technicalSkills: "",
      problemSolving: "",
      communication: "",
      codingStyle: "",
      overallImpression: "",
    },
    interviewSummary: "",
    additionalNotes: [],
    lastUpdateTime: Date.now(),
  };
}
