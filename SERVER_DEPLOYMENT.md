# 自有服务器部署

2026-10-29：按维护者提供的 VPS 部署现有自托管音乐服务。Web 默认使用此 HTTPS 后端，浏览器扩展方案已废除；App 内置桥及 Apple Music 路由保留。

## 当前入口与运行方式

- 网页：<https://julyblog.party/ReiPod/>（首页为独立个人站点）
- 音乐 API：`https://julyblog.party/api/music/`
- Debian 12 x86_64，Node 24.22.1（官方发行包及 SHA-256 校验）。
- 应用目录 `/opt/reipod`；Node 目录 `/opt/reipod-node`。
- `reipod-music.service` 以独立 `reipod` 系统用户运行，只监听 `127.0.0.1:3210`。持久会话位于 `/opt/reipod/.local/music-sessions`，不得提交或复制到公开目录。
- nginx 在 8443 提供 HTTPS、静态页面及 `/api/music/` 反向代理；80 仅用于 ACME 验证。现有 sing-box 的 443/8080 保留。
- 允许网页来源为服务器 HTTPS origin 和 `https://a-asuka-a.github.io`；nginx 对 API 配置每 IP 每秒 10 次、突发 40 次的限制。此限制不等于平台限额或用户访问控制。

IP 证书通过 Certbot 5.8.0 的 `webroot` 和 `shortlived` 配置申请。Let’s Encrypt 的 IP 证书有效期约六天，必须自动续期，见 [官方说明](https://letsencrypt.org/2026/03/11/shorter-certs-certbot)。`reipod-certbot.timer` 每日两次检查，带随机延迟；续期成功后重载 nginx。80 端口与 ACME 验证目录需保持可访问。

## 更新构建

本地执行：

```sh
npm ci
VITE_MUSIC_API_URL=https://julyblog.party/api/music/ npm run build
node scripts/check-dist.mjs
npm run size
```

上传范围仅包括 `dist/`、`server/index.mjs`、`server/providers.mjs`、`server/login-links.mjs`、`server/qq-relay.mjs`、`server/vault.mjs` 和 server 的 package/lock 文件。服务器执行 `npm --prefix /opt/reipod/server ci --omit=dev --ignore-scripts`，再重启 `reipod-music`。更新前备份旧发布内容，保留服务器 `.local/`，勿用本机目录覆盖服务器会话。SSH 密钥和口令不进入构建或文档。

GitHub Pages 工作流支持仓库变量 `MUSIC_API_URL`，值为上述音乐 API 地址；未设置时使用维护者的 API 默认值。工作流修改需要发布后才生效，Pages 部署结果与匿名检查仍不能代替真实账号验收。服务器当前发布包已显式配置 API，因此该入口无需扩展。

## 运维检查

```sh
systemctl status reipod-music nginx --no-pager
systemctl list-timers reipod-certbot.timer
journalctl -u reipod-music -n 50 --no-pager
/opt/reipod-certbot/bin/certbot renew --dry-run --no-random-sleep-on-renew --run-deploy-hooks --deploy-hook 'nginx -s reload'
```

不要并发运行续期命令；Certbot 会用锁拒绝第二个实例。仅查看必要日志，勿公开会话目录、证书私钥或平台登录内容。

## 验证与限制

移除扩展后的构建通过 89 项单测、14 项音乐服务测试、40 项账号/播放/歌词/播放器/原生路由浏览器替身测试，以及生产产物和大小检查。公网 HTTPS 首页返回 200；网易云和 QQ 均成功生成二维码，测试挑战随即取消；非允许来源返回 403，Pages 来源可达。QQ 首次设备初始化曾上游超时，复查恢复。证书模拟续期及重载钩子通过，定时服务手动执行结果为 success。两平台扫码确认、资料库、会员完整播放、会话恢复及手机后台能力仍需在此 VPS 环境真实验证，不能沿用本机或扩展的验收结论。

安装时 npm audit 报告 4 个 high 条目，来自同一 `basic-ftp → get-uri → pac-proxy-agent → 网易云依赖` 链，无自动修复版本。通告为 [basic-ftp 目录列表解析拒绝服务](https://github.com/advisories/GHSA-c475-qrg2-pj4r)。当前服务不提供用户指定代理或 FTP 请求操作；尚未完成该依赖链的完整可达性审计。不要为消除报告盲目升级固定平台适配器。


2026-10-29 更新：nginx 的 8443 仅监听回环地址，公网使用现有域名入口，勿恢复对外监听或覆盖个人站点首页。手机授权需要同时发布前端、`login-links.mjs`、`qq-relay.mjs` 与 server 依赖锁文件，并重启音乐服务。QQ App 通道需服务器到固定 `wss://mu.y.qq.com` 的出站连接；桌面 QQ / 微信 HTTP 扫码通道不切换。手机登录结果通过原挑战轮询接收，不是平台 OAuth 自动回跳。真实账号验证状态见 MUSIC_SERVICES；匿名挑战不能作为授权验收。
