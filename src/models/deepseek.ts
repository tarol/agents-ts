import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

/**
 * 创建 DeepSeek 模型实例
 * DeepSeek 兼容 OpenAI API 协议，通过 @langchain/openai 的 ChatOpenAI 接入
 */
export function createDeepSeekModel(options?: {
  temperature?: number;
  maxTokens?: number;
  modelName?: string;
}) {
  const {
    temperature = 0,
    maxTokens,
    modelName = "deepseek-chat",
  } = options ?? {};

  return new ChatOpenAI({
    model: modelName,
    temperature,
    maxTokens,
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    },
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
}
