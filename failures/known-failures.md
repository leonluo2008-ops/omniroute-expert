# Known Failures — omniroute-expert

实战踩过的坑，供排障参考。

## judgeModel 用了显示名 → 404 model_not_found

- **症状**：`No active credentials for provider: 聚鑫-gemini` / HTTP 404 `model_not_found`
- **根因**：judgeModel 填了供应商显示名，未用 provider 内部 UUID id
- **修法**：填 `openai-compatible-chat-<uuid>/<model>`（UUID 查 `/v1/models` 或 `provider_connections` 表）

## 思考型模型作 judge → content 空

- **症状**：返回内容只有 `。`，reasoning 段多但 content 空
- **根因**：qwen3.8-max/deepseek-v4-pro/GLM-5.2 默认思考模式吃光 max_tokens
- **修法**：请求加 `"enable_thinking": false`；fusion judge 继承 body 自动生效

## 浏览器会话 cookie 不持久

- **症状**：导航后回 `/login`，需重输密码
- **修法**：密码存 Hindsight（`recall_context("OmniRoute Dashboard 登录密码")`）

## 「下一页」按钮 disabled

- **根因**：当前步骤未完成（未选模板/未加模型）
- **修法**：先补全当前步骤再点「下一页」
