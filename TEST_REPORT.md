# LeadPilot 云端2.0.0 实际验收记录

日期：2026-11-04至2026-11-05（Asia/Shanghai）。本报告更新覆盖旧1.3本地版状态，历史见docs/TEST_REPORT_1.3.0.md。

## 已完成部署

正式HTTPS网址：https://leadpilot-search-private.a15532712102.workers.dev/

原Worker已升级为Static Assets + Workers API + D1，不是只上传界面。D1实际新建leadpilot-cloud（cc8d2e27-ff72-4356-bc0a-3425d1c70b8d），0001_cloud.sql远端迁移成功，创建app_state/leads/sessions及索引。ASSETS和DB绑定已实际部署；原Worker源码和配置已有私人备份。

当前线上Worker版本：64b88ad2-3c89-4b53-8d7b-25be70a4d17f。LOGIN_PASSWORD_HASH已通过Cloudflare Secret安全配置；未接Brave/OpenAI，不购买域名，不开通付费计划。

## 代码及数据库验证

61项核心/DOM/SQLite/Worker测试通过。新增认证、CSRF、密码哈希、会话撤销、持久化CRUD、SQL批处理回滚、多设备旧版本冲突、同网站改ID仍保留拒收、JSON/CSV服务器备份、客户资料不写浏览器存储、等待数据库确认再显示成功、保存失败保留编辑窗口，以及旧JSON历史迁移。SQLite是真实执行SQL；不能将其称为Cloudflare D1线上测试。

构建、语法及Wrangler dry-run通过。免费原功能回归保留；npm test会先生成dist，源码克隆后不依赖已存在的构建产物。

## 真实线上HTTP与D1

已验证：正确密码登录并发出Secure/HttpOnly/SameSite=Strict cookie；未登录401；跨站/错误CSRF403；旧版本写入409。真实D1客户新增、编辑、独立HTTPS请求重读、跟进日期及联系历史保存、服务端关键词查找、规则评分、退出撤销会话。测试记录明确标注为合成验收资料，已删除，未当作真实客户；没有发送消息。

实际线上HTTP/D1共11项流程检查通过。认证服务器JSON/CSV导出均返回正确attachment文件名，JSON不含密码、令牌或CSRF。最新D1查询版本26、客户数0：合成测试记录已清理，不代表用户旧浏览器没有客户。

## 真实浏览器与边界

Cloudflare远程Chromium访问实际正式网址，12项流程检查通过。包括真实登录、390/430px五页布局无横向溢出、16px输入、Google/Bing查询链接按钮、真实表单新增/编辑刷新读取、CSV及旧JSON历史导入、备份真实下载、英文表达切换、WhatsApp审核与wa.me预填、“已打开”历史写入D1、独立浏览器登录后读取相同客户且无localStorage、没有页面JS错误、测试数据清理。首次Blob文件名问题已改为服务器attachment，并复验下载的JSON文件名正确。WhatsApp链接在测试中拦截并检查，未发送。

实际iPhone Safari、主屏幕安装、当地网络和WhatsApp应用唤起尚未实机确认；远程Chromium不能代替这些检查。测试仅验证预填链接和“已打开但未发送”逻辑，不发送消息。没有搜索API，因此不能声称系统自动找到真实企业；真实模式是搜索链接+人工核实/导入。没有大模型密钥，评分/话术显示规则/模板。

最终版另已实际验证：退出登录清空未保存的客户字段和备注，已撤销会话再访问API返回401。最终10个静态资源均HTTP 200，SHA-256与dist完全一致。

## 旧用户数据

没有在工作区找到真实客户备份，也无法跨站读取旧浏览器localStorage。已提供旧站导出入口和云端合并导入，兼容性经合成记录实际在线验证；用户现存旧记录尚未自动迁移，需一次导出导入并核对。
