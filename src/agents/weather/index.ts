import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createDeepSeekModel } from "../../models/deepseek.js";
import { getWeather } from "../../tools/weather.js";
import { agentRegistry, createTrackedBackend, SkillTracker } from "../../core/index.js";

/**
 * 天气查询 Agent
 *
 * 使用 DeepSeek 模型 + 天气工具 + weather-assistant skill
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
// Skills 路径必须相对于 backend rootDir（不带前导斜杠）
const skillsPath = "skills";

// 检查 Skills 文件
const weatherSkillPath = path.join(projectRoot, "skills", "weather-assistant", "SKILL.md");
const skillExists = fs.existsSync(weatherSkillPath);

const model = createDeepSeekModel({ temperature: 0 });

// 使用 createTrackedBackend
const backend = createTrackedBackend(projectRoot);

const systemPrompt = `你是一个专业的天气助手。你的职责是：

1. 帮助用户查询指定城市的天气信息
2. 用友好、简洁的中文回复用户
3. 如果用户没有指定城市，礼貌地询问他们想查询哪个城市的天气
4. 查询到天气后，给出简要的穿衣建议和出行建议

⚠️ 重要规则：
- 当对比多个城市时（2个或以上），回复中**必须**包含一个独立的 "## 🧳 旅游推荐" 段落
- 在"旅游推荐"段落中，必须明确说明哪个城市更适合旅游，并基于天气数据给出理由
- 这个要求与用户是否提到"旅游"无关，只要是多城市对比就必须添加

注意：
- 始终使用 get_weather 工具来获取天气数据
- 不要编造天气数据`;

/** 创建并注册天气 Agent（加载 weather-assistant skill） */
export const weatherAgent = agentRegistry.register({
  name: "weather-agent",
  description: "天气查询 Agent — 使用 DeepSeek 模型，支持自然语言查询城市天气",
  systemPrompt,
  tools: [getWeather],
  model,
  skills: [skillsPath],  // 相对路径
  backend,
});

/**
 * 独立运行入口
 * 用法：npx tsx src/agents/weather/index.ts
 */
async function main() {
  // 检查 LangSmith 配置
  const langsmithEnabled = process.env.LANGSMITH_TRACING === "true";
  
  console.log("=== 天气查询 Agent (DeepSeek) ===");
  console.log(`📦 Skills 配置: ${skillExists ? "✅ weather-assistant 已配置" : "❌ 未找到 SKILL.md"}`);
  console.log(`📂 Skills 相对路径: ${skillsPath}`);
  console.log(`🔍 LangSmith 追踪: ${langsmithEnabled ? "✅ 已启用" : "❌ 未启用 (在 .env 中配置)"}`);
  console.log("");

  // 重置统计（开始新的会话）
  SkillTracker.reset();

  const query = process.argv[2] || "北京今天天气怎么样？";
  console.log(`用户: ${query}\n`);

  const result = await weatherAgent.invoke({
    messages: [{ role: "user", content: query }],
  });

  // 分析消息中的 skill 使用情况
  const skillDefinitions = new Map([
    [
      "weather-assistant",
      {
        keywords: ["温度", "体感", "湿度", "风速", "穿衣建议", "出行建议", "天气状况"],
      },
    ],
  ]);

  SkillTracker.analyzeMessages(result.messages, skillDefinitions);

  // 提取最终回复
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];
  console.log(`\n助手: ${lastMessage.content}\n`);

  // 输出 Skills 调用统计
  console.log(`\n📊 Skills 使用统计 (基于关键词分析):`);
  console.log(SkillTracker.format());
  console.log(`\n💬 消息轮次: ${messages.length}`);
  
  if (langsmithEnabled) {
    const projectName = process.env.LANGCHAIN_PROJECT || "agents-ts";
    console.log(`\n🔗 查看完整追踪记录 (包括 Skills 详细调用):`);
    console.log(`   https://smith.langchain.com/o/-/projects/p/${projectName}`);
  } else {
    console.log(`\n💡 提示: 启用 LangSmith 可以追踪完整的 Agent 执行流程（包括 Skills 调用）`);
    console.log(`   1. 访问 https://smith.langchain.com 注册`);
    console.log(`   2. 在 .env 中添加:`);
    console.log(`      LANGSMITH_TRACING=true`);
    console.log(`      LANGCHAIN_API_KEY=your-api-key`);
    console.log(`      LANGCHAIN_PROJECT="My First App"`);
  }
}

main().catch(console.error);
