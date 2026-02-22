import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export interface Message {
  role: "user" | "model";
  content: string;
}

export interface AgentConfig {
  name: string;
  systemInstruction: string;
  model: string;
  temperature: number;
}

export const DEFAULT_CONFIG: AgentConfig = {
  name: "Nexus",
  systemInstruction: "You are a helpful, intelligent AI assistant named Nexus. You provide clear, concise, and accurate information.",
  model: "gemini-3-flash-preview",
  temperature: 0.7,
};

export async function* sendMessageStream(
  history: Message[],
  userMessage: string,
  config: AgentConfig = DEFAULT_CONFIG
) {
  const key = process.env.GEMINI_API_KEY;
  
  if (!key || key === 'undefined') {
    throw new Error("API Key is missing. Please add GEMINI_API_KEY to your Secrets and click 'Apply changes'.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    
    const chat = ai.chats.create({
      model: config.model || "gemini-3-flash-preview",
      config: {
        systemInstruction: config.systemInstruction,
        temperature: config.temperature,
      },
      history: history.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
    });

    const result = await chat.sendMessageStream({
      message: userMessage,
    });

    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      yield response.text || "";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to connect to Gemini API");
  }
}
