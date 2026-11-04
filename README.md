# LeadPilot 云端手机工作台 2.0.0

正式入口：https://leadpilot-search-private.a15532712102.workers.dev/

Cloudflare Workers Static Assets + Workers API + D1。页面、登录、客户库和跟进记录均运行在Cloudflare，不需要Mac开机、localhost或本机文件服务。保留中文界面、农机/润滑油/输送机资料、Google/Bing搜索方案、规则评分、五语模板及中文参考、WhatsApp人工审核和CSV/JSON导入导出。

## 登录和数据

单用户账号 owner，初始随机密码在本机私人凭据文件中，未放入仓库或聊天。服务端仅保存Cloudflare Secret中的PBKDF2密码哈希。登录使用Secure/HttpOnly/SameSite=Strict cookie，7天到期；D1保存哈希后的会话标识，退出后会话失效。API受身份验证、同源检查、CSRF令牌、输入校验和请求限流保护。公开静态代码不包含客户资料或密钥。

客户实际写入D1 leads表，公司资料和版本号写入app_state。云端构建不把客户数据写入localStorage或离线缓存。成功保存必须等待数据库确认；保存失败不显示成功；旧版本写入返回409，防止另一设备的新记录被覆盖。云端客户库限制3000条、规范化JSON总量1MB，联系历史每客户保留最近200项。

设置里可以刷新其他设备的最新数据、下载服务器提供的JSON/CSV备份。JSON包括公司资料及联系历史，CSV是表格交换格式。导入按ID/同网站合并；拒收保护保留。断网时不能保存云端数据。

## 旧版数据迁移

旧入口：https://a15532712102-commits.github.io/leadpilot-ai/

旧GitHub Pages和localhost的浏览器数据不会被服务器自动读取或删除。请在原来的浏览器打开旧版，点击“导出本页旧客户JSON”，再登录云端，在设置中选择该JSON合并导入。跨网站localStorage受浏览器隔离，不能绕过。

迁移流程已用明确标注的合成记录在线验证，包括联系历史。没有读取用户旧浏览器中的真实记录，不能声称实际用户数据已全部迁移。当前工作区没有发现真实客户备份文件。

## 搜索、评分和话术

- 免费搜索生成Google/Bing链接，用户打开公开来源核实官网和主营，再添加或导入。没有搜索API时不自动产生企业名单，不虚构联系人、号码或邮箱。
- 本地规则评分可立即使用；可以复制AI辅助指令到已有工具，再粘贴JSON结果，经人工确认应用。规则与模板明确标注，不能视为大模型调用。
- 保留服务端search/score/message接口；搜索当前返回501并指引免费工作流，大模型密钥缺失时返回501。不会请求Brave或OpenAI，也没有新购服务。
- 英文模板提供三种表达，支持中文参考、编辑和人工审核。其他四种语言模板保留。
- WhatsApp只打开wa.me预填链接，号码、许可依据和审核必须齐备；实际发送由用户自己操作，打开不自动标为发送。变化会撤销审核；拒收后停止联系。不承诺避免封号。

## iPhone / PWA

Safari打开正式HTTPS入口，登录后点击分享→添加到主屏幕。Safari和主屏幕可以分别登录同一账号，数据来自同一D1数据库。Mac可以关闭。静态外壳可缓存，API和客户内容不进入缓存；联网登录后才能读取和保存云端数据。

## 开发、测试和部署

Node 22.13+（需要node:sqlite用于测试）、npm、Cloudflare授权。

```sh
npm ci
npm test
npm run check
npm run build:worker
npm run db:migrate
npm run deploy:cloud
```

npm test自动构建dist，再运行核心/DOM/SQLite/Worker回归。dist由scripts/build-cloud.mjs从共享源码生成，不提交；运行时不需要Node服务器。npm run deploy:worker已指向云端部署，避免误把旧API配置覆盖到正式站。

权威配置是backend/wrangler.cloud.jsonc。backend/wrangler.jsonc和旧verify_live.py仅保留历史参考，不能用于覆盖当前云端部署。Cloudflare授权与Secret设置均在本机安全完成，禁止提交密码或密钥。

交付和维护见CLOUD_HANDOVER.md，真实测试证据见TEST_REPORT.md。当前自动浏览器验证采用Cloudflare远程Chromium，不等价于真实iPhone Safari或WhatsApp应用发送验收。
