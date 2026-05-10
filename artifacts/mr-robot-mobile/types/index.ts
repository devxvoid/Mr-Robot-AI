export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  title: string;
  summary: string;
  category: string;
  instructions: string;
  version: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  agentName: string;
  theme: "dark" | "light" | "system";
  amoledBlack: boolean;
  hackerMode: boolean;
  streamingEnabled: boolean;
  responseStyle: "concise" | "balanced" | "detailed";
  activeProviderId?: string;
  activeModelId?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  type: "openrouter" | "openai-compatible" | "anthropic" | "gemini";
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
  enabled: boolean;
  status: "not_configured" | "connected" | "error";
  createdAt: string;
}
