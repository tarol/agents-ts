import { createDeepAgent } from "deepagents";
import type { StructuredTool } from "@langchain/core/tools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeepAgent = any;

export interface AgentConfig {
  /** Agent 名称 */
  name: string;
  /** Agent 描述 */
  description: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** Agent 可用的工具 */
  tools: StructuredTool[];
  /** LLM 模型实例 */
  model: any;
  /** 子 Agent 列表 */
  subagents?: any[];
  /** Skills 路径列表（POSIX 格式） */
  skills?: string[];
  /** Backend 配置（用于支持 Skills、文件系统等） */
  backend?: any;
}

/**
 * Agent 注册中心 —— 管理所有 Agent 实例
 */
class AgentRegistry {
  private agents = new Map<string, DeepAgent>();
  private configs = new Map<string, AgentConfig>();

  /**
   * 注册一个 Agent
   */
  register(config: AgentConfig): DeepAgent {
    const agent = createDeepAgent({
      model: config.model,
      systemPrompt: config.systemPrompt,
      tools: config.tools,
      subagents: config.subagents,
      ...(config.skills ? { skills: config.skills } : {}),
      ...(config.backend ? { backend: config.backend } : {}),
    });

    this.agents.set(config.name, agent);
    this.configs.set(config.name, config);

    console.log(`[AgentRegistry] Registered agent: ${config.name}`);
    return agent;
  }

  /**
   * 获取已注册的 Agent
   */
  get(name: string): DeepAgent {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent "${name}" not found. Available: ${this.listNames().join(", ")}`);
    }
    return agent;
  }

  /**
   * 获取 Agent 配置
   */
  getConfig(name: string) {
    return this.configs.get(name);
  }

  /**
   * 列出所有已注册的 Agent 名称
   */
  listNames(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 列出所有 Agent 的概要信息
   */
  listAll() {
    return Array.from(this.configs.values()).map((c) => ({
      name: c.name,
      description: c.description,
      tools: c.tools.map((t) => t.name),
    }));
  }

  /**
   * 移除一个 Agent
   */
  remove(name: string) {
    this.agents.delete(name);
    this.configs.delete(name);
  }
}

/** 全局 Agent 注册中心单例 */
export const agentRegistry = new AgentRegistry();
