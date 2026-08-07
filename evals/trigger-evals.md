# Trigger Eval — omniroute-expert

验证本 skill 触发词是否正确路由到本 skill，以及组合配置流程是否可复现。

## Trigger 命中

| 用户话术 | 是否命中 |
|---|---|
| 配置 OmniRoute | ✅ |
| OmniRoute 专员 | ✅ |
| 帮我装 OmniRoute | ✅ |
| 建个 fusion combo | ✅ |
| 把 OmniRoute 接到 Hermes | ✅ |

## 实测验收（2026-08-07）

- [x] 建 fusion combo `moa-council`：panel 3 顾问（GLM-5.2/deepseek-v4-pro/gemini-3.6-flash）+ judge qwen3.8-max
- [x] 实测调用返回完整 content + `model:qwen3.8-max`
- [x] `enable_thinking:false` 让思考型 judge 返回完整 content
- [x] Hermes 一行 `model: moa-council` 引用成功
