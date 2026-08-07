# Examples — omniroute-expert

## 示例 1：fusion MoA 组合

目标：让 3 个不同供应商模型并行作答，再合成一个最终答案。

- combo 名：`moa-council`
- 策略：fusion
- panel：GLM-5.2（glm官方）/ deepseek-v4-pro（基元律动）/ gemini-3.6-flash（聚鑫）
- judge：qwen3.8-max（基元律动，免费额度，`enable_thinking:false`）
- 调用：`model: "moa-council"` + `enable_thinking:false`
