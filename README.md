# Deep Agents 项目 - 天气查询 Agent

基于 LangChain Deep Agents 框架 + DeepSeek 模型 + Open-Meteo API 构建的多 Agent 管理项目。

## 项目结构

```
lang/
├── skills/                          # Skills 技能目录
│   └── weather-assistant/           # 天气助手技能
│       └── SKILL.md                 # 技能定义文件
├── src/
│   ├── core/                        # 核心框架
│   │   └── registry.ts              # Agent 注册中心
│   ├── models/                      # LLM 模型封装
│   │   └── deepseek.ts              # DeepSeek 模型（兼容 OpenAI 协议）
│   ├── tools/                       # 可复用工具
│   │   └── weather.ts               # 天气查询工具（Open-Meteo API）
│   └── agents/                      # Agent 实现
│       └── weather/                 # 天气查询 Agent
│           ├── index.ts             # Agent 主入口
│           └── test-skills.ts       # Skills 测试脚本
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的 DeepSeek API Key：

```bash
cp .env.example .env
# 编辑 .env，填入从 https://platform.deepseek.com 获取的 API Key
```

### 3. 运行天气 Agent

```bash
# 默认查询
npm run dev:weather

# 自定义查询
npx tsx src/agents/weather/index.ts "上海今天天气如何？"

# 多城市对比（测试 Skills 效果）
npx tsx src/agents/weather/test-skills.ts
```

## Skills 机制说明

### 什么是 Skills？

Skills 是 Deep Agents 的核心能力，采用"渐进式披露"策略：

- **加载时**：只注入技能的名称和描述到系统提示词
- **按需读取**：Agent 仅在需要时才读取完整的 `SKILL.md` 指令内容
- **减少 Token**：避免一次性加载所有详细指令，节省上下文窗口

### 当前集成的 Skill: `weather-assistant`

位于 `skills/weather-assistant/SKILL.md`，提供以下能力：

- ✅ 单城市天气查询流程指导
- ✅ 多城市对比分析模板
- ✅ 穿衣建议规范（根据温度范围）
- ✅ 出行建议规范（根据天气状况）
- ✅ 回复格式规范

### Skills 是否生效的验证方法

运行测试脚本：

```bash
npx tsx src/agents/weather/test-skills.ts
```

**预期效果：**

1. **问题**: "对比一下北京和上海的天气，哪个城市更适合出行？"
2. **Agent 行为**:
   - 调用 2 次 `get_weather` 工具（分别查询北京和上海）
   - 按照 skill 中定义的"多城市对比"格式回复
   - 包含对比表格或结构化分析
   - 给出综合出行建议
3. **对比无 Skills 的情况**: 如果不加载 skill，Agent 可能只查询一个城市，或回复格式不够专业

### 如何创建新的 Skill？

在 `skills/` 目录下创建新文件夹，包含 `SKILL.md` 文件：

```markdown
---
name: your-skill-name
description: 简短描述（1-2句话）
---

# 详细指令内容

在此编写详细的执行步骤、规范和最佳实践...
```

**注意事项：**

- 文件夹名必须与 `name` 字段一致
- `---` 之间严禁空行
- 使用 UTF-8 编码（无 BOM）
- 路径必须使用 POSIX 格式（正斜杠）

## 核心特性

### 1. Agent 注册中心 (`src/core/registry.ts`)

统一管理所有 Agent，支持：

- 注册 Agent（`agentRegistry.register`）
- 获取 Agent（`agentRegistry.get`）
- 列出所有 Agent（`agentRegistry.listAll`）

### 2. DeepSeek 模型封装 (`src/models/deepseek.ts`)

DeepSeek 兼容 OpenAI API 协议，通过 `@langchain/openai` 的 `ChatOpenAI` 接入：

```typescript
import { createDeepSeekModel } from "./models/index.js";

const model = createDeepSeekModel({
  temperature: 0,
  modelName: "deepseek-chat",
});
```

### 3. 真实天气数据 (`src/tools/weather.ts`)

使用 **Open-Meteo API**（免费、无需 API Key）：

- 自动地理编码（城市名 → 经纬度）
- 实时天气数据（温度、体感温度、天气状况、湿度、风速）
- 支持全球城市，中英文均可

## 新增 Agent 的步骤

1. 在 `src/agents/` 下创建新文件夹
2. 创建 `index.ts` 文件，引用模型和工具
3. 通过 `agentRegistry.register()` 注册
4. （可选）在 `skills/` 下创建对应的 skill

示例：

```typescript
import { createDeepSeekModel } from "../../models/index.js";
import { agentRegistry } from "../../core/index.js";

const model = createDeepSeekModel({ temperature: 0 });

export const myAgent = agentRegistry.register({
  name: "my-agent",
  description: "我的 Agent 描述",
  systemPrompt: "你是一个...",
  tools: [/* 工具列表 */],
  model,
  skills: ["/path/to/skills"],  // 可选
});
```

## 技术栈

- **框架**: LangChain Deep Agents
- **语言**: TypeScript (ES Modules)
- **LLM**: DeepSeek (via OpenAI-compatible API)
- **天气数据**: Open-Meteo API
- **包管理**: npm

## 参考资料

- [LangChain Deep Agents 文档](https://docs.langchain.com/oss/javascript/deepagents/overview)
- [Deep Agents JS GitHub](https://github.com/langchain-ai/deepagentsjs)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [Open-Meteo API 文档](https://open-meteo.com/en/docs)

## 许可证

MIT
