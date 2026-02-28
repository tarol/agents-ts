import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeepAgent } from "deepagents";
import { createDeepSeekModel } from "../../models/deepseek.js";
import { getWeather } from "../../tools/weather.js";

/**
 * 测试 Skills 是否生效
 * 用法：npx tsx src/agents/weather/test-skills.ts
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const skillsDir = path.posix.join(projectRoot.split(path.sep).join("/"), "skills");

console.log("📁 Skills 目录路径:", skillsDir);
console.log("📁 绝对路径:", projectRoot, "\n");

const model = createDeepSeekModel({ temperature: 0 });

// 直接创建带 skills 的 agent
const agent = createDeepAgent({
  model,
  tools: [getWeather],
  skills: [skillsDir],
  systemPrompt: "你是天气助手，使用 get_weather 工具查询天气。",
});

async function main() {
  console.log("=== 测试 Skills 加载 ===\n");

  // 测试问题：需要对比分析的场景，skill 应该会指导 agent 如何回复
  const query = "对比一下北京和上海的天气，哪个城市更适合出行？";
  console.log(`用户: ${query}\n`);

  const result = await agent.invoke({
    messages: [{ role: "user", content: query }],
  });

  console.log("\n=== Agent 回复 ===");
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];
  console.log(lastMessage.content);

  // 检查是否使用了多次工具调用（应该调用 2 次 get_weather）
  const toolCalls = messages.filter((m: any) => m.tool_calls?.length > 0);
  console.log(`\n📊 工具调用次数: ${toolCalls.length}`);
}

main().catch(console.error);
