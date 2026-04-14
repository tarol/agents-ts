import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createDeepSeekModel } from "../../models/deepseek.js";
import { getWeather } from "../../tools/weather.js";
import { getStockPrice } from "../../tools/stock.js";
import { agentRegistry, createTrackedBackend, SkillTracker } from "../../core/index.js";

/**
 * 通用助理 Agent
 *
 * 使用 DeepSeek 模型，同时具备天气查询和股价查询两项能力。
 * 加载 weather-assistant 和 stock-assistant 两个 skills。
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
// Skills 路径必须相对于 backend rootDir（不带前导斜杠）
const skillsPath = "skills";

// 检查 Skills 文件
const weatherSkillPath = path.join(projectRoot, "skills", "weather-assistant", "SKILL.md");
const stockSkillPath = path.join(projectRoot, "skills", "stock-assistant", "SKILL.md");
const weatherSkillExists = fs.existsSync(weatherSkillPath);
const stockSkillExists = fs.existsSync(stockSkillPath);

const model = createDeepSeekModel({ temperature: 0 });

// 使用 createTrackedBackend
const backend = createTrackedBackend(projectRoot);

const systemPrompt = `你是一个全能助理，拥有以下两项核心能力：

## 🌤️ 天气查询
- 帮助用户查询指定城市的天气信息
- 查询到天气后，给出穿衣建议和出行建议
- 当对比多个城市时（2个或以上），回复中**必须**包含一个独立的 "## 🧳 旅游推荐" 段落

## 📈 股价查询
- 帮助用户查询股票的实时行情数据
- 支持美股、港股、A股，可用中文名称或股票代码查询
- 当对比多只股票时（2只或以上），回复中**必须**包含一个独立的 "## 💡 投资参考" 段落
- 绝不提供具体的买入/卖出建议，只做客观数据分析

## 通用规则
- 用友好、简洁的中文回复用户
- 根据用户的意图自动选择合适的工具
- 使用 get_weather 工具查询天气，使用 get_stock_price 工具查询股价
- 不要编造任何数据，所有数据必须通过工具获取`;

/** 创建并注册助理 Agent（加载 weather-assistant 和 stock-assistant skills） */
export const assistantAgent = agentRegistry.register({
  name: "assistant-agent",
  description: "通用助理 Agent — 使用 DeepSeek 模型，支持天气查询和股价查询",
  systemPrompt,
  tools: [getWeather, getStockPrice],
  model,
  skills: [skillsPath],  // 相对路径
  backend,
});

/**
 * 独立运行入口
 * 用法：npx tsx src/agents/assistant/index.ts "查询内容"
 */
async function main() {
  // 检查 LangSmith 配置
  const langsmithEnabled = process.env.LANGSMITH_TRACING === "true";

  console.log("=== 通用助理 Agent (DeepSeek) ===");
  console.log(`📦 Skills 配置:`);
  console.log(`   - weather-assistant: ${weatherSkillExists ? "✅" : "❌"}`);
  console.log(`   - stock-assistant:   ${stockSkillExists ? "✅" : "❌"}`);
  console.log(`📂 Skills 相对路径: ${skillsPath}`);
  console.log(`🔍 LangSmith 追踪: ${langsmithEnabled ? "✅ 已启用" : "❌ 未启用 (在 .env 中配置)"}`);
  console.log("");

  // 重置统计（开始新的会话）
  SkillTracker.reset();

  const query = process.argv[2] || "北京今天天气怎么样？";
  console.log(`用户: ${query}\n`);

  const result = await assistantAgent.invoke({
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
    [
      "stock-assistant",
      {
        keywords: ["股价", "涨跌", "成交量", "市值", "投资", "行情", "📈", "📉"],
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
    console.log(`\n🔗 查看完整追踪记录:`);
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
