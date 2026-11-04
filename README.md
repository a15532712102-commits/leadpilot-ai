# LeadPilot AI 1.2.0

单用户外贸客户助手：真实网页搜索候选、本地规则 / AI 辅助评分、五种语言话术和中文对照、CRM、人工确认的 WhatsApp 草稿、JSON / CSV 备份、离线应用外壳。

**目前是待部署修复版。代码测试通过不等于生产服务已验证。** 详情见 `TEST_REPORT.md`。

## 既有资源

- 前端：https://a15532712102-commits.github.io/leadpilot-ai/
- 仓库：https://github.com/a15532712102-commits/leadpilot-ai （main）
- 后端：https://leadpilot-search-private.a15532712102.workers.dev
- APP_ORIGIN：`https://a15532712102-commits.github.io`

保留这三个地址。不得另建仓库或 Worker。APP_ORIGIN 是 origin，不带 `/leadpilot-ai/` 路径。

## 本地运行与测试

需要 Node.js 22+、npm、Python 3。

```sh
npm ci
npm test
npm run check
npx playwright install chromium webkit
npm run test:browser
npm run build:worker
```

Mac 用户也可双击 `scripts/本机浏览器测试.command`（使用此电脑已安装的 Node）。浏览器测试需要正常的本机进程权限；在受限环境启动失败不代表功能测试通过。测试仅使用 example.org 和 +1 202 555 01xx 虚构号码，拦截 WhatsApp 打开动作，不发送消息。

查看本地页面：`python3 -m http.server 4173 --bind 127.0.0.1`，浏览器打开 http://127.0.0.1:4173 。

## 使用与数据

- 搜索结果是 Brave 网页标题及摘要，**不代表认证企业、已核实国家、可采购客户或联系许可**。每次搜索一条组合查询，最多 7 个结果，按网站主机名去重。点击来源自行核实企业及网页是否可访问。
- 规则评分仅依据标题、摘要中的关键词，界面标注来源。AI评分不改变已确认国家和客户类型，预测仅作为参考。
- AI 利用当前客户资料、产品和已确认需求写个性化消息；加入最近3条人工确认发送的消息以避免机械重复。不会为了逃避检测随机改写。资料不足时提示补充，不编造事实。
- 离线模板覆盖英语、土耳其语、俄语、西班牙语、法语；三个产品方向均有对应译名。自定义产品保留用户原文，模板明确提示人工核对翻译。模板不理解客户备注，深度个性化需 AI 或手动编辑。
- WhatsApp 必须有联系许可、依据、国际号码、人工审核。只打开 `wa.me` 草稿，用户在 WhatsApp 内自己点击发送。返回不会自动标记发送。拒收后停联，导入旧备份也不能撤销拒收。改变客户或内容会撤销审核。
- 最近发送话术与当前内容的词集合相似度达80%会提醒。此规则不是平台检测模型，不承诺免于限制或封号。
- localStorage 保持旧 `leadpilot_mobile_v1` 键，内容迁移为 version2。客户只存在当前设备 / 浏览器；清理数据、隐私模式、空间不足都可能影响保存。Safari 与主屏幕容器不保证共享数据。
- JSON 是完整备份（包括联系历史与公司资料），不包含访问令牌。CSV 用于表格交换，不含完整历史。合并按ID或相同网站主机名处理；跨同域公司需要人工分开核实。导入前请备份。
- 应用访问令牌仅保留当前标签页 sessionStorage，不是 Brave / OpenAI 密钥。关闭会话后可能需要重新输入。
- 需要联网成功加载一次后，主屏幕应用外壳、客户库和模板可离线使用；搜索和AI始终需要网络。

## 安全与费用边界

所有第三方密钥只放 Cloudflare Secrets：APP_ACCESS_TOKEN、BRAVE_API_KEY、可选 OPENAI_API_KEY。没有 AI 密钥时仍可使用明确标注的基础模板。health 只检查密钥是否配置，不能证明密钥有效。

请求体上限40KB；每次最多评分20条。认证前按 IP 限30次/分钟；认证后的付费功能共用6次/分钟限流。Cloudflare 原生限流是**按数据中心的近似限流，不是全球硬费用上限**；在 Brave / OpenAI 账号内另设预算。缺少限流绑定时关闭API，避免退化成无保护代理。每次上游调用有16秒超时，前端22秒，不自动重试付费调用。原始上游错误体不返回客户端。

来源文档：
- Cloudflare Rate Limiting：https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Brave Web Search：https://api-dashboard.search.brave.com/api-reference/web/search/get

## 部署与回滚

见 `DEPLOYMENT.md`。必须先完成本机浏览器检查并获得用户的远程更新授权。不得把未完成的真实上游测试标成上线成功。
