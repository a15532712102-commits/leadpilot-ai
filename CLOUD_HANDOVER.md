# LeadPilot 云端交付与维护

## 正式入口和登录

https://leadpilot-search-private.a15532712102.workers.dev/
账号owner。初始密码只保存在本机私人文件：
/Users/yangyaqing/Documents/Codex/2026-10-26/ni/work/leadpilot-auth/cloud-login/LeadPilot_云端登录凭据.txt

请自己打开文件，将登录保存到密码管理器后在iPhone使用；不要把该文件、密码或cookie发到聊天。公开源码、dist和备份导出均不含密码。平时登录、搜索方案、客户管理、下载和WhatsApp草稿完全不需要Mac在线。

## 使用

1. iPhone Safari打开正式入口，使用owner及私人文件中的初始密码登录。
2. 生成搜索方案并打开Google/Bing，人工核实公司官网和主营。添加记录或导入表格，不会自动生成假的企业名单。
3. 客户库点击免费筛选客户，查看分数理由；本次为规则模式。外语消息是模板模式，可编辑并查看中文。
4. 核实国际号码和明确联系许可、审核草稿，再点击打开WhatsApp，由本人在WhatsApp发送。系统不群发、不读取聊天。
5. 设置中下载JSON备份，或刷新云端读取其他设备的修改。修改冲突时停止覆盖，先刷新核对。
6. 分享→添加到主屏幕；主屏幕如要求登录，仍用同一账号，不需重新迁移数据。

## 旧数据迁移（一次）

旧站 https://a15532712102-commits.github.io/leadpilot-ai/ 增加了旧客户JSON导出和进入云端入口。若记录在localhost，仍需在保存它的原Mac浏览器、相同地址和端口打开一次并导出（localhost与127.0.0.1也属于不同来源）。将JSON存入自己的文件/iCloud Drive，再在云端设置导入。不要清除旧站数据，直到确认云端数量和历史正确。

服务器不能主动读取另一个网站或设备的localStorage。当前没有取得你的真实旧客户备份，因此实际旧记录是否已迁移仍需核对；迁移功能和历史兼容已用合成记录真实在线测试。

## 维护

- 平时使用不需要启动Mac。定期从手机导出JSON；清理浏览器不会删除已保存的D1记录。
- 免费配额耗尽或Cloudflare故障会阻止读取/保存，界面不应提示成功。没有购买域名、接入付费搜索或升级计费套餐；按Cloudflare现有账户配额运行。
- 客户库最多3000条、规范化内容总量1MB；过长历史应先导出归档。每客户联系历史保留最近200项。
- 登录会话7天到期；退出会话会在D1失效。服务端只保存密码的PBKDF2哈希，不提供密码找回邮件。
- 密码遗失：由维护者在新私人目录执行scripts/create-login.mjs，使用生成的哈希文件安全设置Cloudflare Secret LOGIN_PASSWORD_HASH，然后清除D1 sessions以撤销旧会话。不要在网页、聊天或仓库粘贴新密码/哈希。生成脚本不会覆盖已有凭据文件。
- 开发更新按DEPLOYMENT.md执行；数据库ID不可替换，迁移SQL留在backend/migrations。普通前端更新不需要重建数据库。
- 规则评分与模板无密钥即可用；未来只有明确确认服务费用、搜索结果使用权限并配置服务端Secret后才启用API。当前SEARCH_ENABLED=false。

## 验收边界

报告见TEST_REPORT.md。真实线上D1持久化与访问控制已测试；远程Chromium手机尺寸检查与实际iPhone Safari是不同的测试。实际iPhone网络可达性、主屏幕安装和WhatsApp应用唤起仍需本人在手机确认。没有发送任何WhatsApp消息。站点在Cloudflare运行，具体地区的网络访问不作无条件保证。

## 官方维护参考

- Workers静态资源：https://developers.cloudflare.com/workers/static-assets/
- D1迁移：https://developers.cloudflare.com/d1/reference/migrations/
- D1恢复：https://developers.cloudflare.com/d1/reference/time-travel/
