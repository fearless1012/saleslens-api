import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";

dotenv.config();

export interface LLaMAResponse {
  id: string;
  completion_message: {
    role: string;
    stop_reason: string;
    content: {
      type: string;
      text: string;
    };
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Legacy interface for backward compatibility
export interface LLaMAResponseLegacy {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLaMARequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export class LLaMAService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.LLAMA_API_KEY || "";
    this.baseURL = process.env.LLAMA_BASE_URL || "https://api.llama.com/v1";

    if (!this.apiKey) {
      throw new Error("LLAMA_API_KEY is required in environment variables");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 seconds timeout
    });
  }

  /**
   * Generate completion using LLaMA model
   */
  async generateCompletion(request: LLaMARequest): Promise<LLaMAResponse> {
    try {
      const response = await this.client.post("/chat/completions", request);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `LLaMA API Error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("LLaMA API Error: No response received from server");
      } else {
        throw new Error(`LLaMA API Error: ${error.message}`);
      }
    }
  }

  /**
   * Generate a simple text completion
   */
  async generateText(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const {
      model = "Llama-4-Maverick-17B-128E-Instruct-FP8",
      maxTokens = 1000,
      temperature = 0.7,
      systemPrompt = "You are a helpful AI assistant specialized in sales and business analysis.",
    } = options;

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const request: LLaMARequest = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    const response = await this.generateCompletion(request);
    return response.completion_message?.content?.text || "";
  }

  /**
   * Generate completion with conversation history
   */
  async generateConversation(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const {
      model = "Llama-4-Maverick-17B-128E-Instruct-FP8",
      maxTokens = 1000,
      temperature = 0.7,
    } = options;

    const request: LLaMARequest = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    const response = await this.generateCompletion(request);
    return response.completion_message?.content?.text || "";
  }

  /**
   * Stream completion (for real-time responses)
   */
  async streamCompletion(
    request: LLaMARequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const streamRequest = { ...request, stream: true };

      const response = await this.client.post("", streamRequest, {
        responseType: "stream",
      });

      response.data.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on("end", resolve);
        response.data.on("error", reject);
      });
    } catch (error: any) {
      throw new Error(`LLaMA Streaming Error: ${error.message}`);
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      "llama-3.3-70b-instruct",
      "llama-3.1-405b-instruct",
      "llama-3.1-70b-instruct",
      "llama-3.1-8b-instruct",
      "llama-3.2-90b-vision-instruct",
      "llama-3.2-11b-vision-instruct",
      "llama-3.2-3b-instruct",
      "llama-3.2-1b-instruct",
    ];
  }

  /**
   * Validate API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      await this.generateText("Hello", { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error("LLaMA API validation failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const llamaService = new LLaMAService();
