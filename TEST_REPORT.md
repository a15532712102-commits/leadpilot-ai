# LeadPilot AI 接管测试报告

日期：2026-11-04（Asia/Shanghai）
状态：**本地修复版代码检查与20项浏览器自动化测试通过；用户已批准部署；原Worker已更新并通过在线认证检查。GitHub网页更新、真实搜索/AI及iPhone实机验收未完成。**

## 检查到的现网事实

- 原 GitHub Pages 地址 HTTP 200，可访问，但仍是旧版。
- 原 Worker 根路径 HTTP 200，正文为 `Hello World!`。这不是搜索 / AI 代理成功。
- clone 的 main 基线：`4137672d616af0a8b3db5ef08cae294bffca4800`。
- 已比较仓库旧版与下载交付包，交付包新增 WhatsApp 页面和后端草稿；旧 index 在工作区 `work/leadpilot-audit/index.main-4137672.html` 另行保存。
- 用户已明确批准部署与少量真实API验证。Cloudflare授权已完成，APP_ACCESS_TOKEN已安全配置，原Worker已实际部署。GitHub授权仍在进行。
- 当前Worker版本：`35d98b28-a96b-4d87-90c2-a82e026bdcba`；可回滚旧版本：`ff99eaa8-0f01-4cfb-acf0-68aedbaf0e26`。旧源码和设置已另存工作区审计目录，未放进公开仓库。
- 真实在线认证检查：正确令牌200（version1.2.0），错误令牌401，非允许来源403。searchReady=false、aiReady=false，第三方密钥仍未配置。
- Python默认User-Agent被边缘检查返回1010；部署验证使用明确的LeadPilot-Deployment-Check/1.2标识后通过。未关闭任何安全检查。

## 已完成验证

| 项目 | 结果 | 实际覆盖 |
|---|---|---|
| npm install / lockfile | 通过 | 依赖锁定，安装审计未发现已知漏洞（不代表无未知漏洞） |
| npm test | **38/38通过** | 核心数据函数、真实DOM事件逻辑、Worker请求处理；上游网络为mock |
| npm run check | 通过 | app.js、core.js、worker.js语法检查 |
| Wrangler dry-run | 通过 | 原Worker名称、APP_ORIGIN、两个限流绑定、Worker打包 |
| git diff --check | 通过 | 已跟踪文件无空白错误 |
| 常见密钥格式扫描 | 未发现 | 检查代码文件中常见OpenAI/GitHub令牌形状，不保证识别所有秘密 |

38项测试覆盖：
- 认证、精确Origin、OPTIONS、不合法Origin、配置缺失时关闭服务。
- 限流429与Retry-After、付费请求限流、输入大小/数组/类型/ID校验。
- Brave主机名去重、危险URL过滤、一键只调用一次搜索、ALL地区参数。
- 上游失败不泄露原始响应、超时提示、AI评分完整性与范围、话术格式。
- 国际号码和联系许可独立校验、重复话术提示。
- CSV多行/引号/逗号/公式防护、JSON/CSV合并、拒收保护与联系历史保留。
- 五个页面初始化、客户增删改、存储失败回滚、旧数据迁移、令牌不写localStorage。
- WhatsApp仅打开预填URL，不自动变为“已发送”；切换客户/改语言后重新审核。
- AI请求期间换客户或生成本地稿，旧AI结果被丢弃。
- 搜索标题中的HTML作为文本显示，不伪造已核实国家或客户类型。

**DOM测试不进行真实浏览器渲染，不等价于Safari验收；所有mock均不是正式在线数据。**

## 浏览器自动化验收：20/20通过

用户在Mac正常会话执行测试，开始时间2026-11-04 21:07:26（北京时间），耗时41.1秒；20项通过、0失败、0跳过、0不稳定重试。

覆盖 Chromium 390×844 与 WebKit 430×932：五个页面、横向溢出、16px输入字体、客户增删改与重载保存、WhatsApp审核与客户切换、异步AI旧结果丢弃、搜索与AI模拟响应、导入导出、拒收保护、存储失败、API错误、主屏幕资源与离线缓存。

已读取 test-results/browser-results.json 与 test-results-local.log，核对用户截图，并查看 WebKit 设置页全页截图，未发现横向溢出或文字遮挡导致不可操作的问题。固定底部导航在全页截图中显示于初始视口位置，属于固定定位。

此前受限环境启动失败已通过用户本机执行解决。真实Brave/OpenAI调用未包含在这些测试中。iPhone实机键盘、下载、分享、WhatsApp唤起与添加主屏幕仍需确认。

## 尚未完成的真实功能验证

| 功能 | 当前状态 / 阻碍 |
|---|---|
| 新版GitHub Pages | 已获授权；等待GitHub账号授权，未push |
| 新版原Worker | 已部署原Worker，在线认证/来源检查通过 |
| Brave真实企业搜索 | 已获调用授权；缺少Brave密钥，未实际调用 |
| 候选网站实际可访问 | 未获取真实候选，未逐个核实 |
| OpenAI真实评分与五语中文对照 | 未配置密钥，未实际调用；译文质量仍需人工复核 |
| WhatsApp手机预填 | 本地DOM测试通过，手机实际唤起未验收；从未发送消息 |
| PWA主屏幕与离线 | 浏览器资源及离线缓存测试通过；iPhone主屏幕实机行为未验收 |

线上入口保持原地址：
https://a15532712102-commits.github.io/leadpilot-ai/

在本报告更新为真实部署验证通过前，这个地址不能当成新版交付成功。

## 下一步

本机浏览器测试已通过。已获部署授权，下一步完成GitHub登录和第三方Secret配置。密钥不发聊天。部署操作和回滚方案见 DEPLOYMENT.md。
