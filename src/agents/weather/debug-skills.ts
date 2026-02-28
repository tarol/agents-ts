import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { createDeepSeekModel } from "../../models/deepseek.js";
import { getWeather } from "../../tools/weather.js";

/**
 * 调试脚本 - 验证 Skills 是否真的被 Deep Agents 识别和加载
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const skillsDir = path.posix.join(projectRoot.split(path.sep).join("/"), "skills");

console.log("=== Skills 路径调试信息 ===");
console.log("📁 __dirname:", __dirname);
console.log("📁 projectRoot:", projectRoot);
console.log("📁 skillsDir (POSIX):", skillsDir);
console.log("📁 Skills 实际路径存在:", require("fs").existsSync(skillsDir));

const skillFile = path.join(skillsDir, "weather-assistant", "SKILL.md");
console.log("📄 SKILL.md 存在:", require("fs").existsSync(skillFile));
console.log("");

const model = createDeepSeekModel({ temperature: 0 });

// 创建 FilesystemBackend — Skills 工作的关键！
const backend = new FilesystemBackend({ rootDir: projectRoot });

console.log("=== 创建 Agent（带 Skills + Backend）===");
const agent = createDeepAgent({
  model,
  tools: [getWeather],
  skills: [skillsDir],
  backend,  // 必须提供 backend，否则 Skills 无法读取文件
  systemPrompt: "你是天气助手。",
});

console.log("✅ Agent 创建成功\n");

// 检查 agent 的配置（尝试访问内部状态，仅用于调试）
console.log("=== Agent 内部状态 ===");
console.log("Agent keys:", Object.keys(agent));

async function testQuery() {
  console.log("\n=== 测试简单查询 ===");
  const query = "北京今天天气怎么样？";
  console.log(`用户: ${query}\n`);

  try {
    const result = await agent.invoke({
      messages: [{ role: "user", content: query }],
    });

    console.log("✅ 查询成功");
    const lastMessage = result.messages[result.messages.length - 1];
    console.log("\n助手回复:");
    console.log(lastMessage.content);
  } catch (error) {
    console.error("❌ 查询失败:", error);
  }
}

testQuery().catch(console.error);
