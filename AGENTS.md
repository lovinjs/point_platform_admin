# point_platform_admin 开发说明

本仓库是积分平台管理后台，远端为 lovinjs/point_platform_admin，源自 Vben Admin。实际业务应用为 apps/web-antd。本文路径均相对本仓库，优先用中文沟通。

## 协作方式

用户选择“云端阅读和修改代码，本地运行与验收”：云端实现和执行必要的类型、构建检查；浏览器操作、完整业务联调及预发布验收默认在本地完成。不要默认将 Vite 服务部署到公网或重建云端业务数据库。

- 开始前核对分支、提交和工作区，保留已有未提交内容。云端与本地通过 Git 同步；不覆盖、reset 或 clean 用户修改。
- 本次交接由用户自行提交推送，后续 Git 和部署操作按用户任务授权执行。业务改动推送自己的 origin，不推送模板 upstream。
- 优先修改 apps/web-antd，只有共享能力确实需要调整时才改 packages/ 或 internal/；不要顺带改其他 UI 模板、文档站、示例应用。
- 检查按影响范围执行，避免为单页改动运行整个工作区的所有应用构建。不要将文档里历史构建通过当作本次结果。
- 交接说明列出页面/API 变化、实际检查结果、跨仓库待办和本地验收步骤；本地验证反馈应带分支、提交、复现步骤和关键日志。

## 技术与目录

Vue 3、TypeScript、Vite、Ant Design Vue、Vben、pnpm/Turbo 工作区。Node 要求 ^22.18.0 || ^24.0.0，packageManager 固定 pnpm@10.33.4。使用 pnpm-lock.yaml，不改用 npm/yarn，也不随意升级依赖。

- apps/web-antd/src/views/：dashboard、merchant、customer、operation、finance、settlement、staff、settings 等业务页面。
- apps/web-antd/src/api/core/：后台认证、收银、订单、退款、门店、结算和报表等接口。
- apps/web-antd/src/api/request.ts：统一请求、Bearer 令牌、响应和错误拦截。
- apps/web-antd/src/router/routes/modules/：业务路由；src/router/access.ts、guard.ts：访问控制。
- apps/web-antd/src/store/：应用状态；src/preferences.ts：应用偏好。
- packages/、internal/：Vben 共享库及构建工具，修改影响多个应用。
- apps/web-antd/README.private-backend.md、README.staging-deployment.md：联调及预发布说明。

## 运行与检查

以下命令从仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm dev:antd
pnpm --filter @vben/web-antd typecheck
pnpm build:antd
pnpm build:antd:staging
```

修改 TypeScript/Vue 代码时执行受影响应用的 typecheck，有页面/运行配置变化时构建相应环境；改共享库时扩大到受影响应用。

纯文档变更也要通过项目格式检查：先对修改文件运行 pnpm exec oxfmt AGENTS.md，再运行 pnpm exec oxfmt --check AGENTS.md；其他文档使用其对应路径。提交前钩子会执行 pnpm lint 和管理端 typecheck，格式检查也会发现尚未暂存的 AGENTS.md。不要通过跳过钩子或全仓库自动格式化来处理单文件格式错误。

仓库有 pnpm lint、pnpm check:type、pnpm test:unit，按实际改动和既有测试选择，不把模板测试通过等同于资金业务验收。

本地默认地址为 http://127.0.0.1:5666，/api 由 Vite 代理到本地后端 http://localhost:8888；以实际启动输出为准。

需要通过现有 SSH 隧道访问预发布时，在 apps/web-antd/.env.development.local 设置 DEV*API_PROXY_TARGET=http://127.0.0.1:18888。此变量由 Vite 服务端读取，仅允许本机 HTTP origin 和端口；不要改成 VITE* 变量或取消现有目标校验。具体隧道和联调流程见 README.private-backend.md。

## 接口与业务约束

- 使用已有 API 层、类型、表单及请求拦截，不在页面直接拼接散落的后端地址。请求 baseURL 与单接口路径配套，避免重复 /api/v1/admin 前缀。
- 当前私有后端响应沿用 code/data，成功码 200；JWT 使用 Bearer，当前不提供刷新令牌，不恢复模板 Mock 或凭空添加 refresh-token 流程。
- 菜单与按钮权限只能辅助体验，实际角色和门店范围由后端校验；不能在前端自行授予超管身份或扩大员工门店范围。
- 1 元 = 1 积分，金额传输单位为分、积分为整数、费率为基点。输入显示与后端字段转换保持一致，不通过前端直接改余额。
- 员工创建待客户确认消费，不直接扣款；客户 PIN 在客户自己的设备输入，后台不得收集或保存客户 PIN。
- 新业务请求生成新的幂等键，失败重试保留原键和相同请求体，避免重复充值、消费或退款。
- 全额充值退款仅超管可操作。先读取退款资格，资格通过才打开登记窗口；请求失败、订单不匹配、已退款时不能绕过检查。查询通过不保证提交时仍可退，保留后端重新校验及错误展示。
- 普通消费退款不属于 V1，异常冲正使用独立受控入口；结算只支持已结束自然月。费率调整影响新订单，不重算历史金额。
- 沿用 Vben 主题、偏好、组件和项目当前页面布局，不重新引入模板营销文案、无关统计或通用示例页面。

## 环境与发布

- development、staging、production 分开处理；staging 使用独立标题和缓存空间，关闭 Mock，后台 API 为 /api/v1/admin。
- .env.staging 只能包含浏览器可公开配置；.env.\*.local、JWT、数据库密码、微信 AppSecret、短信 AccessKey 和 SSH 凭证不提交。
- staging 产物为 apps/web-antd/dist.zip，发布时保留 \_app.config.js，ZIP 根目录直接包含入口和静态资源。普通 production 构建会覆盖同名产物，核对环境和版本。
- dist、ZIP、node_modules 等产物不纳入 Git。候选包构建通过与服务器发布成功分别记录。
- 预发布使用测试账本，界面提醒不能替代认证和权限，不用真实收付款测试。页面自动检查优先使用模拟 API；完整人工验收由用户在本地或预发布完成。

## 跨仓库接续

后端为 lovinjs/point_platform，消费者端为 lovinjs/point_platform_customer_app。可用时先读后端 docs/cloud-development-handoff.md 和对应接口文档；不能假定同级目录存在。

后台域名代理方案在后端 docs/admin-staging-deployment.md 和 deploy/openresty/admin-stage-api.conf。前端类型检查不能证明代理或服务器发布完成；后台代理仅应用到后台站点，不复制到消费者 H5 站点。

当前主要待验收项包括完整自然月结算和正式上线配置；状态以最新有日期的交接记录及用户反馈为准。修改接口契约时列明后端和消费者端需要同步的内容。
