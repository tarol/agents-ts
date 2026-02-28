/**
 * 项目入口 —— 统一导出所有模块
 *
 * 项目结构说明:
 *
 *   src/
 *   ├── core/           # 核心框架：Agent 注册中心
 *   ├── models/         # LLM 模型封装（DeepSeek 等）
 *   ├── tools/          # 可复用的工具定义
 *   ├── agents/         # 各个 Agent 实现（每个 Agent 一个文件夹）
 *   │   └── weather/    # 天气查询 Agent
 *   └── index.ts        # 统一导出
 */

export { agentRegistry, type AgentConfig } from "./core/index.js";
export { createDeepSeekModel } from "./models/index.js";
export { getWeather } from "./tools/index.js";
