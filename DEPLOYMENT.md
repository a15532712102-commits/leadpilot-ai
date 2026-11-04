# 当前云端发布与回滚

正式网址：https://leadpilot-search-private.a15532712102.workers.dev/
原Worker：leadpilot-search-private。原仓库main保留共享源码和旧站迁移入口；云端站点不依赖GitHub Pages或Mac持续运行。

## 构建和发布

1. 使用现有Cloudflare登录；不要把认证令牌发到聊天或写进仓库。
2. npm ci；npm test；npm run check。
3. npm run build:worker，核对dist仅包含静态应用文件。
4. 有新SQL迁移时运行npm run db:migrate；数据库必须仍是leadpilot-cloud，不能重新建库替换。
5. npm run deploy:cloud，确认ASSETS、DB、三个限流绑定和LOGIN_PASSWORD_HASH Secret保留。
6. 执行scripts/verify-cloud.py与scripts/verify-cloud-browser.mjs。凭据路径指向项目外私人文件，报告不得记录密码、cookie或真实客户内容。

不运行旧backend/wrangler.jsonc部署覆盖云端；不购买域名；不改动账户计费方案。SEARCH_ENABLED保持false，Brave和OpenAI未接入。

## 数据库

D1名leadpilot-cloud，ID cc8d2e27-ff72-4356-bc0a-3425d1c70b8d，绑定DB。0001_cloud.sql已在远端实际执行。app_state/leads/sessions分别保存版本与公司资料、客户、登录会话。

## 回滚

发布前先从云端导出JSON，并按需要在私人位置执行D1导出；Cloudflare控制台也可查看D1恢复能力。回滚Worker代码版本不会自动回滚数据库内容。不要删除数据库或重复执行建库。代码可以git revert对应发布提交后重新构建部署；严禁强推覆盖他人代码。旧1.3客户端不读取D1，回滚到旧API会使云端入口失效，不能将此操作当作保留云端功能的普通回滚。

部署前原Worker源代码及设置已私下备份至work/leadpilot-audit/worker-before-cloud*，不包含在公开交付包中。
