import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const logDir = path.join(projectRoot, "logs");
const logFile = path.join(logDir, "llm.log");

/** 确保 logs 目录存在 */
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/** 格式化数据：字符串数组中的 \n 展开为真实换行 */
function formatLogData(data: unknown): string {
  if (Array.isArray(data) && data.every((item) => typeof item === "string")) {
    // prompts 是字符串数组，直接展开每条内容
    return data
      .map((s: string, i: number) => `--- [${i}] ---\n${s}`)
      .join("\n\n");
  }
  return JSON.stringify(data, null, 2);
}

/** 追加写入 log 文件 */
function appendLog(label: string, data: unknown) {
  const timestamp = new Date().toISOString();
  const separator = "=".repeat(80);
  const content = `\n${separator}\n[${timestamp}] ${label}\n${separator}\n${formatLogData(data)}\n`;
  fs.appendFileSync(logFile, content, "utf-8");
}

/**
 * 包装 fetch，拦截大模型 API 的原始 HTTP 响应
 */
function createLoggingFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);

    // clone 一份来读取 body，不影响 LangChain 消费原始 response
    const cloned = response.clone();
    cloned.text().then((text) => {
      try {
        const json = JSON.parse(text);
        appendLog("RAW_RESPONSE", json);
      } catch {
        appendLog("RAW_RESPONSE (non-JSON)", text.slice(0, 5000));
      }
    }).catch(() => {});

    return response;
  };
}

/**
 * 创建 DeepSeek 模型实例
 * DeepSeek 兼容 OpenAI API 协议，通过 @langchain/openai 的 ChatOpenAI 接入
 *
 * 通过自定义 fetch 拦截原始 HTTP 请求和响应，记录到 logs/llm.log
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
      fetch: createLoggingFetch(),
    },
    apiKey: process.env.DEEPSEEK_API_KEY,
    callbacks: [
      {
        handleLLMStart: async (_llm, prompts) => {
          appendLog("LLM_INPUT (prompts)", prompts);
        },
        handleLLMError: async (error) => {
          appendLog("LLM_ERROR", { message: error.message, stack: error.stack });
        },
      },
    ],
  });
}
