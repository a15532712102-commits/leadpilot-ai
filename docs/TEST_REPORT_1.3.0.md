# LeadPilot 1.3.0 免费版测试报告

日期：2026-11-04（Asia/Shanghai）

## 本次范围

用户要求暂停Brave和需绑卡付费服务，优先可运行免费版。默认关闭所有联网API；保留未来接口。新增免费搜索方案导出、Bing入口、客户导入入口及空白CSV模板、批量规则筛选/排序/分数过滤、手动AI指令与评分回填、三种英文话术、Mac启动器。

没有接入Brave或OpenAI；没有模拟成真实企业搜索；本地评分明确为规则。手动AI测试中的评分来自测试数据，不代表模型质量测试。没有发送WhatsApp消息。本次不修改原Worker。

## 已完成检查

- 47/47 Node核心、DOM操作及Worker回归测试通过。包含CSV/JSON导入原子性与拒收保护、免费流程零API请求、评分排序、英文及中文对照变化、撤销WhatsApp审核、手动AI结果ID/数值校验和过期资料保护。Worker上游均为mock。
- app.js、core.js、backend/src/worker.js语法检查通过；git diff --check通过。
- Mac本机Python服务实际启动成功，根页面、app.js、core.js、manifest及图标HTTP 200且MIME正确；.git/config、后端配置和启动脚本HTTP 404。验证使用直连localhost，不经过系统代理。
- 与远端main比较，开始修改时为1ed575356e61dee56b24742e1ba0c072f24ab54f，无其他人更新。

## 浏览器及手机限制（不可视为通过）

已更新24项Playwright用例，覆盖Chromium390×844和WebKit430×932。此次环境无法启动浏览器：Chromium MachPortRendezvousServer Permission denied；WebKit进程退出134。24项均因浏览器启动失败而未执行应用操作，不是24项通过，也不能据此判断页面功能失败。

上一版1.2.0曾由用户在Mac正常终端执行20/20浏览器用例通过；这不是免费版1.3.0的验收结果。免费版需在正常Mac会话双击 scripts/本机浏览器测试.command 重新验证，并在实际iPhone检查布局、键盘、下载、主屏幕与WhatsApp唤起。

## 部署状态

免费版发布提交：4a7fca39324cb210f2751dedeb0f4c79e582e4d5。已推送原仓库main，GitHub Pages构建成功（built，无错误）。index.html、app.js、core.js、app.css、manifest.webmanifest、sw.js及3个图标均HTTP 200，内容哈希与本地一致。原线上网址保持 https://a15532712102-commits.github.io/leadpilot-ai/ 。原Worker未修改。线上核对仅证明交付文件正确，不等价于真实浏览器操作验收。

本机代码和免费工作流已完成；真实浏览器、实际AI评分质量、WhatsApp手机唤起仍未验收。搜索方案需要用户打开公开搜索网站核实企业，不能声称已自动找到真实客户。
