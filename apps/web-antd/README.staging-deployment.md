# 后台预发布静态包

在管理端仓库根目录执行：

```powershell
pnpm --filter @vben/web-antd typecheck
pnpm build:antd:staging
```

产物为 `apps/web-antd/dist.zip`。`staging` 使用独立标题与浏览器缓存空间，API 相对地址为 `/api/v1/admin`；正常 production 和 SSH 开发代理配置保持不变。登录页明确提醒不要登记真实收付款，显示现有 ICP 备案链接；模板百度统计脚本已移除。

- 域名：`admin-stage.qiongyintech.com`。
- 网站宿主机根目录：`/opt/1panel/www/sites/point-platform-admin-stage/index`。
- 后端仍为现有预发布 Java，不需要新增容器或在服务器运行 Node。
- 用户暂不添加 IP 白名单或站点密码；账号登录、角色和门店权限仍必须校验。
- 发布文件必须包含 `_app.config.js`。ZIP 根目录直接包含入口和静态资源，不额外套一层目录。
- `.env.staging` 仅可公开的前端配置可以提交；真实服务器环境文件、私钥、ZIP 和 dist 不能提交或放到公开根目录。

完整的代理片段、只读验收和回退步骤见同级后端仓库的 `deploy/openresty/admin-stage-api.conf` 与 `docs/admin-staging-deployment.md`。不要把后台代理片段添加到消费者 H5 站点。
