# 1.3.0 免费版发布说明

已获得用户对原仓库与原Worker部署的授权。本次只更新原GitHub Pages前端，不修改或删除Worker，不配置第三方密钥，不开通付费服务。免费模式默认关闭所有API请求，未来可在高级设置明确启用。

回滚：先备份客户JSON，再git revert免费版发布提交后push；禁止强推。客户本地变更不会随版本回滚，需用JSON恢复。

以下为1.2.0后端部署历史与未来接入清单，并非本次接入指令：

# 部署检查与回滚

用户已批准部署和少量真实接口验证；Cloudflare已登录，原Worker已部署，应用访问令牌已配置。GitHub授权与第三方密钥配置待完成。以下保留部署检查清单。

## 上线前

1. 本机运行 `scripts/本机浏览器测试.command`，两个浏览器项目通过；iPhone 实机确认布局、键盘、文件下载与添加到主屏幕。
2. 获取用户明确授权：更新原 GitHub 仓库 main 和原 Cloudflare Worker，并同意少量真实 API 验证可能消耗额度。
3. `git fetch origin`，确认远端仍为审阅过的版本；有新提交先合并、复测，禁止强推。
4. 记录当前完整 Git SHA。初次接管基线短SHA为 `4137672`，原 index 已备份在工作区 `work/leadpilot-audit/index.main-4137672.html`。

## 本机安全授权（一次只指导用户做当前一步）

- Cloudflare：`npx wrangler login`，用户在浏览器确认。不要把密码、OAuth回调或令牌发到聊天。
- 检查账号 / Worker：`npx wrangler whoami`、`npx wrangler versions list --config backend/wrangler.jsonc`。确认原 Worker 名称，记录当前版本ID用于回滚。
- Secrets 使用本机交互提示输入，不写入命令历史：
  - `npx wrangler secret put APP_ACCESS_TOKEN --config backend/wrangler.jsonc`
  - `npx wrangler secret put BRAVE_API_KEY --config backend/wrangler.jsonc`
  - `npx wrangler secret put OPENAI_API_KEY --config backend/wrangler.jsonc`（可选）
- 应用令牌由用户生成高强度随机值并保存在自己的密码管理器；这个值之后填进手机“设置”。OpenAI/Brave密钥不能填入前端。
- GitHub 使用系统钥匙串或 GitHub CLI 浏览器登录，禁止在聊天提供 PAT 或密码。

## 更新顺序

1. 查看并保存旧 Worker 的版本与配置；核实无业务会被替换。
2. `npm test`、`npm run check`、`npm run test:browser`、`npm run build:worker`。
3. 使用 `npm run deploy:worker` 更新已有 `leadpilot-search-private`；确认两个 ratelimits 绑定与 APP_ORIGIN。
4. 从授权环境运行 `python3 scripts/verify_live.py`。它在本机隐藏输入APP_ACCESS_TOKEN，每种付费功能最多调用一次；不发送消息、不保存客户。真实来源访问性需逐条核实。
5. commit / push 原仓库 main（不强推），等待 GitHub Pages 构建成功。
6. 检查线上 `/app.js`、`/core.js`、manifest、icons、sw.js 均成功加载，前端是1.2.0。使用iPhone实际操作：搜索、保存、AI评分、外语中文对照、WhatsApp预填但不发送、备份恢复、主屏幕离线打开。
7. 更新 TEST_REPORT.md，分开记录在线上游验证与模拟测试。若任何密钥缺失或功能失败，保持“未完成”状态。

## 回滚

- GitHub：在更新提交之后执行 `git revert <本次发布commit>`，检查差异后 push，不重置或强推用户的其他提交。
- Worker：用记录的旧部署版本执行 `npx wrangler rollback <旧版本ID> --config backend/wrangler.jsonc`。回滚需要用户批准；Secret或变量变动须单独核对，不能假设代码回滚会恢复全部配置。
- Service Worker：回滚旧前端时同时发布清理用 sw.js 或新版本缓存名，提示用户联网关闭并重新打开主屏幕应用，确认界面实际恢复。不要清除localStorage客户库。
- 客户数据：新版和旧版使用相同localStorage键；先导出JSON，回滚后核对数据，勿把源代码回滚当成数据恢复。
