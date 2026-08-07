---
name: omniroute-expert
description: 配置OmniRoute并接入终端Agent，浏览器自动化+引导学习。
version: 0.1.0
author: Hermes
trigger: OmniRoute专员, 配置OmniRoute, 装OmniRoute, OmniRoute combo, fusion MoA, 路由 fallback, Token 压缩, RTK, Caveman
metadata:
  hermes:
    tags: [OmniRoute, AI网关, 配置, 引导学习, 运维, 排障]
---

# OmniRoute 专员

本 skill 负责安装、配置、运维、排障 OmniRoute AI 网关，并把它接入各类终端 Agent。**核心工作方式 = 浏览器自动化（Dashboard）操作 + 逐步引导用户学习**——每步操作都解释「在做什么、为什么、下一步会怎样」，不是闷头点完。

OmniRoute 是工业级 AI 网关，统一端点聚合多供应商 API，提供 Token 压缩与智能路由（含 fusion MoA 多模型融合）。本 skill 覆盖：部署、供应商接入、combos 组合、fusion MoA、token 压缩、代理、多模态、排障、多终端 Agent 接入。

## Do not trigger this skill for

- 深度排障细节（拓扑残留清理、外网代理、搜索服务商细节）见 `omniroute-ops`（若仍存在）或 `references/`。
- GLM-5.2 模型参数细节 → `glm-coding-plan-config`。
- OpenClaw 深度配置（auth store、schema 校验）→ `openclaw-omniroute-ops`。
- 其它 AI 网关 / 代理配置，与本 skill 无关。

## When to Use

- 「配置 OmniRoute」「OmniRoute 专员」「帮我装/配 OmniRoute」
- 在 OmniRoute 里建 combo / 配 fusion MoA / 加供应商 / 排障
- 把 OmniRoute 接到 Hermes / OpenClaw / 其它 Agent
- 用户想**学会**怎么配，需要逐步讲解
- Token 压缩、搜索服务商、多模态视频识别、拓扑残留清理

## Prerequisites

- Docker（OmniRoute 跑在容器）
- Tailscale 私有网络（`tailscale ip` 拿本机 IP，如 `100.126.167.88`）
- Dashboard 登录密码（存 Hindsight，`recall_context("OmniRoute Dashboard 登录密码")`）
- 供应商 API key（聚鑫/基元律动/glm官方等）

## How to Run

- 浏览器自动化：`browser_navigate` → `browser_console`（DOM 操作）→ `browser_vision`（确认选中态）→ `browser_click`
- 改运行中 DB：容器内 `better-sqlite3`（见 Procedure 步骤 5）
- 终端 Agent 接入：改各 Agent 的 config（`hermes config set` / `openclaw models`）

## Quick Reference

- Docker 部署：`docker run -d --name omniroute --restart always -p 20128:20128 diegosouzapw/omniroute`
- Dashboard：`http://<tailscale-ip>:20128/dashboard`（首页 `/home` 无效，会 307 到 login）
- API：`http://<tailscale-ip>:20128/v1`（OpenAI 兼容）
- 模型列表：`GET /v1/models`（带 Bearer key）
- 实测调用：`POST /v1/chat/completions`，`model` 填 combo 名（如 `moa-council`）
- 容器读库：`docker cp omniroute:/app/data/storage.sqlite /tmp/x.sqlite` + 宿主机 `sqlite3`
- 容器改库：脚本放 `/app` 下，容器内 `node` + `better-sqlite3`
- 搜索端点：`POST /v1/search`
- 压缩设置页：`/dashboard/context/settings`（不是 `/dashboard/compression/settings`，会 404）

## Procedure

### 1. 安装部署
```bash
docker run -d --name omniroute --restart always -p 20128:20128 diegosouzapw/omniroute
```
**引导要点**：镜像名必须用 `diegosouzapw/omniroute`（简写 `omniroute` 会拉取失败）。

**网络接入**：Tailscale IP + `:20128`。Dashboard `/dashboard`、API `/v1`。

**外网代理（容器访问被墙服务）**：容器默认不继承宿主机代理。Docker daemon 代理只管 `docker pull`，不管容器内进程出网。
```bash
# 重建前必须备份数据（容器默认无挂载卷，数据全在 /app/data/）
mkdir -p /home/luo/omniroute-data-backup
docker cp omniroute:/app/data/. /home/luo/omniroute-data-backup/
docker stop omniroute
docker volume create omniroute-data
docker run --rm -v omniroute-data:/data -v /home/luo/omniroute-data-backup:/backup alpine sh -c 'cp -a /backup/. /data/'
docker rm omniroute
docker run -d --name omniroute --restart always -p 20128:20128 \
  -v omniroute-data:/app/data \
  -e HTTP_PROXY=http://172.17.0.1:7897 -e HTTPS_PROXY=http://172.17.0.1:7897 \
  -e http_proxy=http://172.17.0.1:7897 -e https_proxy=http://172.17.0.1:7897 \
  -e NO_PROXY=localhost,127.0.0.1,100.126.167.88,172.17.0.1 \
  diegosouzapw/omniroute
```
- 代理用 `172.17.0.1`（docker0 gateway），非 `127.0.0.1`。UFW 放行：`sudo ufw allow from 172.16.0.0/12 to any port 7897`。
- 被 GFW 针对性封锁的域名（如 jina.ai，DNS 污染到 `185.45.7.165`）经代理也访问不了，搜索用 Serper/Brave/Tavily 替代。

### 2. 供应商接入
- 标准供应商：Dashboard 直接选 + 填 API Key。
- 自定义端点（聚鑫等）：Custom OpenAI-compatible → Base URL → API Key。
- **API 类型**：LLM 对话/推理类全选「聊天完成 (chat/completions)」；只有纯向量/纯语音/纯图像才碰其它类型。判断看文档 URL 含 `/chat/completions`。
- **供应商命名坑**：多个自定义端点默认都叫 "main"，建 combo 前务必起独立名（如 GPT/Gemini/DeepSeek/glm官方）。`/api/providers` 的 `connections[].name` 几乎全是 "main"，真正的节点标识在 `providerSpecificData.nodeName`——用户报「名称不对」先查 nodeName。
- notion/trae 是 MCP 连接（工具层），不是 LLM 供应商，别误配成供应商。

### 3. Combos 组合 & Fusion MoA
**Combo = 把多个供应商按策略编排成一条路由规则。策略类型**：priority（优先级）/weighted/cost-optimized/fusion/pipeline 等；`auto/*` 只是每请求路由策略（非 MoA）。19 种策略里 `fusion`/`pipeline` 是原生 MoA 类。

**Fusion MoA**：panel 并行 fanout 一组顾问模型 + judgeModel 合成一个最终答案。
- schema：`strategy:"fusion"` + `config.judgeModel`（**不设默认取 panel[0]**）+ `config.fusionTuning`（`minPanel`/`stragglerGraceMs`/`panelHardTimeoutMs`/`maxPanel`）。
- panel 顾问选**不同供应商**保证多样性（如 GLM-5.2 + deepseek-v4-pro + gemini-3.6-flash）。每轮成本 = 3 顾问 + 1 judge = **4 次调用**。

**⭐ judgeModel 必须用 provider 内部 UUID id，不是显示名**：显示名会报 `No active credentials for provider: 聚鑫-gemini` / HTTP 404 `model_not_found`。正确格式 `openai-compatible-chat-<uuid>/<model>`，UUID 查 `/v1/models` 或 `provider_connections` 表。面板模型下拉选的自动带正确 UUID，只有手动输入的 judgeModel 踩此坑。

**⭐ 思考型模型做 judge 的空 content 陷阱**：qwen3.8-max/deepseek-v4-pro/GLM-5.2 默认思考模式会吃光 max_tokens → content 空（裸测 1500/2000 都只回 `。`）。**不是模型不行，请求加 `"enable_thinking": false` 即正常**（qwen/deepseek 系）。fusion 的 judge 调用继承客户端 body（`appendUserTurn(body, ...)`），所以**客户端带 enable_thinking:false 调组合，judge 也会关思考**——这是让思考型模型安全当 judge 的关键。GLM-5.2 官方 max_tokens 默认 65536/最大 131072（见 `glm-coding-plan-config`）。

**浏览器自动化配置 combo 流程（引导式）**：
1. `browser_navigate` Dashboard → 若 `/login` 则 `browser_type` 密码 →「组合」→「创建组合」
2. 填名称（如 `moa-council`）→ 选模板启用「下一页」→ 步骤 2
3. 添加 panel 顾问：`browser_console` 操作原生 select（provider index + model index），选不同供应商
4. 选策略「融合」(fusion)：`browser_console` 精确过滤（`textContent==='expand_more高级设置'`）展开高级设置，`browser_vision` 确认高亮
5. 设 judgeModel：dialog 内 `input`（placeholder 是 panel[0] 的 model 名），填 provider 内部 UUID id
6. 审查页确认 →「创建组合」→ 实测验证

### 4. 实测验证 combo
```bash
curl -X POST http://<tailscale-ip>:20128/v1/chat/completions \
  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"model":"moa-council","enable_thinking":false,"messages":[{"role":"user","content":"测试"}],"max_tokens":2000}'
```
返回 `"model":"<judge-model>"` + 完整 content = 通。SSE 流需逐行聚合 `choices[0].delta.content`，别当普通 JSON。

### 5. 引导用户学习（强制）
每步操作后向用户说明（1-2 句）：**做了什么 / 为什么 / 成本认知（每轮 N 次调用）/ 下一步**。

### 6. 热改运行中容器 DB（免重启，改 judgeModel 等 config）
Dashboard 需密码、cookie 不持久时，直接改 WAL 库最稳（OmniRoute 每请求读 DB）。**容器内无 sqlite3 CLI，但有 better-sqlite3**（OmniRoute 依赖）。用现成脚本 `scripts/update-combo-db.js`：
```bash
# 脚本必须放 /app（有 node_modules），不能放 /tmp
docker cp scripts/update-combo-db.js omniroute:/app/update-combo-db.js
docker exec omniroute node /app/update-combo-db.js
```
改脚本里 `comboName` + `newJudgeModel`（填 provider 内部 UUID）再跑。**改前备份**：`docker cp omniroute:/app/data/storage.sqlite <backup>`。改完实测验证（`docker logs omniroute` 会打印 `Combo "moa-council" [fusion]` + judge 路由行）。

### 7. Token 压缩 (Compression Studio)
各引擎（RTK/Caveman/Session Dedup 等）全灰禁用 = **「提示词压缩」总开关没开**。必须先开总开关引擎才解锁。
- 设置页：`/dashboard/context/settings`（不是 `/dashboard/compression/settings`）。
- 开启：① 开「提示词压缩」总开关 → ② 按需开引擎（日常 RTK 标准 + Caveman 轻量安全；AGGRESSIVE/ULTRA/OmniGlyph 激进慎开）。

### 8. 接入终端 Agent（引导用户怎么让其它 Agent 用）
**核心认知：MOA 已剥离到 OmniRoute，各 Agent 只需一行 `model:` 引用 combo 名，当作普通模型。**

**Hermes**（用 `hermes config set`，config.yaml 直改被 guard 拦）：
```bash
hermes config set providers.omniroute.base_url "http://<tailscale-ip>:20128/v1" --force
hermes config set providers.omniroute.api_mode "chat_completions" --force
hermes config set providers.omniroute.key_env "OMNIROUTE_API_KEY" --force
hermes config set providers.omniroute.model "moa-council" --force
hermes config set providers.omniroute.context_length "1000000" --force
hermes config set model.default "moa-council" --force
hermes config set model.provider "omniroute" --force
```
+ 把 `OMNIROUTE_API_KEY=<key>` 加进对应 profile 的 `.env`（不打印明文）。**改完需重启 gateway 生效，且会中断当前对话（先告知用户）**。

**OpenClaw**：见 `openclaw-omniroute-ops`（key 必须注册 auth store、provider 声明 baseUrl、模型引用 `omniroute/<combo名>`、模型对象须含 name 字段、imageModel.primary 用完整 `provider/model-id`）。

### 9. 多模态：视频识别经 OmniRoute 中转
**视频必须用 `image_url` 包装**（中转平台约定），不是 `video_url`（仅 Moonshot 保留，其它平台被过滤）：
```json
{"type":"image_url","image_url":{"url":"data:video/mp4;base64,<base64>"}}
```
大视频先压：640px 宽 + 截短到 ≤10s，base64 ~300KB，否则超 context 上限（base64 视频会被估算成巨大 token）。

### 10. 搜索服务商
独立 `/v1/search` 端点。支持 Serper/Brave/Tavily/Perplexity/SearXNG/You.com 等 + DuckDuckGo 免费兜底。搜索 provider 本身就是模型（无「模型」概念）。在 Dashboard Providers 加搜索服务商填 key。

## Pitfalls

- **judgeModel 必须用 provider 内部 UUID id**，非显示名（报 404 model_not_found）。
- **思考型模型默认思考吃光 token → content 空**，请求加 `enable_thinking:false` 即正常；fusion judge 继承 body 自动关思考。
- **浏览器会话 cookie 不持久**：导航后常回 `/login`，需重输密码。
- **「下一页」disabled** = 当前步骤未完成（未选模板/未加模型），先补全。
- **策略描述框显示旧内容**是 UI 缓存问题，用 `browser_vision` 确认实际高亮。
- **UFW 拦截 Tailscale 访问**：服务监听 0.0.0.0 但 UFW deny 全拦。本机 `curl localhost` 通但 Tailscale IP 打不开 = 查 `sudo ufw status`，放行 `20128/tcp`。排查 `ss -tulnp | grep 20128`。
- **「其它电脑打不开」先查 Tailscale 对端在线**：`tailscale status`，offline peer 根本到不了。对端在线仍打不开再查 ACL/缓存。
- **`/home` 不是有效路径**（307 到 login），用 `/dashboard`。
- **镜像名陷阱**：用 `diegosouzapw/omniroute`，简写 `omniroute` 拉取失败。
- **auto 组合 candidatePool 陷阱**：往 auto 组合加新供应商模型时，必须把该 providerId 加进 `config.candidatePool`，否则 auto 不纳入路由。
- **拓扑图残留已删供应商节点**：拓扑从 `call_logs`/`proxy_logs` 聚合（非当前配置）。清残留：停容器 → `docker cp` 出库 → `sqlite3` DELETE call_logs/proxy_logs 里已删 provider → 拷回 → 启动。清前备份。
- **LiteLLM pricing fetch failed** 是无害警告（外网拉不到定价表），不影响功能。
- **read_file/grep 输出反引号模板显示为 `***`** 是显示层伪影，文件字节正确，别去"修"不存在的坏字符（用 `xxd`/Python rb 验证原始字节）。

## Verification

单条命令证明 combo 通：`curl -X POST http://<ip>:20128/v1/chat/completions -H "Authorization: Bearer ***" -d '{"model":"<combo名>","enable_thinking":false,"messages":[{"role":"user","content":"测试"}],"max_tokens":2000}'` 返回 `"model":"<judge>"` + 完整 content。

## Evidence

- 触发词验收：`evals/trigger-evals.md`
- 实战踩坑：`failures/known-failures.md`
- 配置示例：`examples/README.md`
- 热改 DB 脚本：`scripts/update-combo-db.js`
