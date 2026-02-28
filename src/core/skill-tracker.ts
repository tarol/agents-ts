/**
 * Skill 调用追踪器
 * 通过分析 Agent 对话消息来推断 skill 使用情况
 */

export class SkillTracker {
  private static callCounts = new Map<string, number>();
  private static lastAnalyzedMessageCount = 0;

  /**
   * 分析消息内容，检测 skill 特征
   */
  static analyzeMessages(messages: any[], skillDefinitions: Map<string, { keywords: string[] }>) {
    // 只分析新消息
    if (messages.length <= this.lastAnalyzedMessageCount) {
      return;
    }

    const newMessages = messages.slice(this.lastAnalyzedMessageCount);
    this.lastAnalyzedMessageCount = messages.length;

    for (const msg of newMessages) {
      const content = (msg.content || "").toString().toLowerCase();

      // 检查每个 skill 的特征关键词
      for (const [skillName, { keywords }] of skillDefinitions.entries()) {
        const matchCount = keywords.filter((kw) => content.includes(kw.toLowerCase())).length;
        
        // 如果匹配多个关键词，说明可能使用了这个 skill
        if (matchCount >= 2) {
          this.record(skillName);
        }
      }
    }
  }

  /**
   * 记录一次 skill 调用
   */
  static record(skillName: string) {
    const current = this.callCounts.get(skillName) || 0;
    this.callCounts.set(skillName, current + 1);
  }

  /**
   * 获取指定 skill 的调用次数
   */
  static getCount(skillName: string): number {
    return this.callCounts.get(skillName) || 0;
  }

  /**
   * 获取所有 skill 的调用统计
   */
  static getAll(): Map<string, number> {
    return new Map(this.callCounts);
  }

  /**
   * 重置统计
   */
  static reset() {
    this.callCounts.clear();
    this.lastAnalyzedMessageCount = 0;
  }

  /**
   * 格式化输出统计信息
   */
  static format(): string {
    if (this.callCounts.size === 0) {
      return "  ⚠️  没有检测到 skill 被使用";
    }

    const lines: string[] = [];
    for (const [skill, count] of this.callCounts.entries()) {
      lines.push(`  - ${skill}: ${count} 次`);
    }
    return lines.join("\n");
  }
}
