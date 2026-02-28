import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { createDeepSeekModel } from "../../models/deepseek.js";
import { getWeather } from "../../tools/weather.js";
import { agentRegistry } from "../../core/registry.js";

/**
 * 天气查询 Agent
 *
 * 使用 DeepSeek 模型 + 天气工具，支持自然语言查询天气
 */

const model = createDeepSeekModel({ temperature: 0 });

const systemPrompt = `你是一个专业的天气助手。你的职责是：

1. 帮助用户查询指定城市的天气信息
2. 用友好、简洁的中文回复用户
3. 如果用户没有指定城市，礼貌地询问他们想查询哪个城市的天气
4. 查询到天气后，给出简要的穿衣建议和出行建议

注意：
- 始终使用 get_weather 工具来获取天气数据
- 不要编造天气数据`;

/** 创建并注册天气 Agent */
export const weatherAgent = agentRegistry.register({
  name: "weather-agent",
  description: "天气查询 Agent — 使用 DeepSeek 模型，支持自然语言查询城市天气",
  systemPrompt,
  tools: [getWeather],
  model,
});

/**
 * 独立运行入口
 * 用法：npx tsx src/agents/weather/index.ts
 */
async function main() {
  console.log("=== 天气查询 Agent (DeepSeek) ===\n");

  const query = process.argv[2] || "北京今天天气怎么样？";
  console.log(`用户: ${query}\n`);

  const result = await weatherAgent.invoke({
    messages: [{ role: "user", content: query }],
  });

  // 提取最终回复
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];
  console.log(`助手: ${lastMessage.content}\n`);
}

main().catch(console.error);
