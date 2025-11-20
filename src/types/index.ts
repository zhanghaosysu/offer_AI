export interface Message {
  id: number;
  sender: "ai" | "user";
  content: string;
  timestamp: Date;
}
