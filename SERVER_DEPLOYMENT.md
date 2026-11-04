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

上传范围仅包括 `dist/`、`server/index.mjs`、`server/providers.mjs`、`server/login-links.mjs`、`server/login-confirmation.mjs`、`server/qq-playback-compat.mjs`、`server/qq-relay.mjs`、`server/vault.mjs` 和 server 的 package/lock 文件。服务器执行 `npm --prefix /opt/reipod/server ci --omit=dev --ignore-scripts`，再重启 `reipod-music`。更新前备份旧发布内容，保留服务器 `.local/`，勿用本机目录覆盖服务器会话。SSH 密钥和口令不进入构建或文档。

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

## 2026-10-30 发布记录

代码提交 `8ed4065` 已推送 origin/main，VPS 静态页面同步至该版本。显式使用维护者 HTTPS API 构建；程序资源 8700706 bytes，程序 gzip 261090 bytes。167 项单元、22 项服务端和 71 项完整浏览器回归通过，生产产物检查通过。

逐文件 SHA-256 确认线上 5 个后端模块及 package/lock 与仓库一致，本次只更新静态页面，未重装后端依赖或重启服务。旧静态内容备份为 `/opt/reipod/backups/dist-before-8ed4065-20261030T052622Z.tgz`；新资源先复制、index.html 最后原子替换，保留旧哈希资源供已打开的页面使用。未覆盖 `.local/`、会话、证书或个人站点；个人首页文件校验和保持一致。服务器 `/opt/reipod/release.json` 记录应用代码版本。

公网首页和 `/ReiPod/` 均为 HTTP 200，公开入口及引用 JS/CSS 与发布包字节一致；网易云/QQ 匿名 status 为 200、未授权，Pages 来源为 200、非允许来源为 403；nginx 与音乐服务保持 active。首次服务器 Python urllib 请求公网返回 403，随后通过 curl 从服务器和本机交叉检查正常；未更改 CDN 安全配置。这些是发布/匿名接口检查，无新增真实账户授权、会员播放或 iPhone 后台验收。

## 2026-10-30 历史备份清理

按维护者要求，历史备份从 7 组收敛为 2 组：保留上述最新静态回滚包，以及 `/opt/reipod-backups/20261029T054107Z-8ebd9e5/server` 后端备份（历史版本，不称当前完整发布备份）。删除 5 组更旧备份、旧 318285d 发布目录及后端备份中重复的旧 dist，释放磁盘 237522944 bytes（约 238 MB）。删除旧发布前，已逐文件核对其全部内容均被最新回滚包覆盖。当前发布上传包/暂存目录保留；会话、个人站点、证书未清理。完成后服务保持 active，公网 ReiPod 返回 200。

## 2026-10-30 试听音频瘦身发布

代码 `f1fd4f7` 已推送并部署。三首完整曲长 AAC-LC/M4A（64 kbps、32 kHz 立体声）合计 3816471 bytes，较原 MP3 的 17038863 bytes 减少约 77.6%；总构建 12518239 bytes。原音频标签和署名补齐；167 项单元、22 项服务端、71 项完整浏览器回归、产物检查与 4 MB 音频预算通过。

公网入口/引用资源及三首音频的哈希与发布包一致，旧 MP3 已移出线上静态目录；个人首页未改，音乐 API 与服务保持正常。最新静态回滚包为 `/opt/reipod/backups/dist-before-f1fd4f7-20261030T054311Z.tgz`。核对其覆盖旧发布全部文件后清理上一次静态备份与旧 8ed4065 发布暂存，继续保留一份静态回滚包和已有后端备份。没有重新部署后端、配置 CDN 或重打 iOS 安装包；没有新增真实平台账号/原生播放验收。

## 2026-10-30 媒体菜单边界发布

源码 `4b5a188` 已推送并同步 VPS，仅更新静态页面。174 项单元、22 项服务端、71 项完整浏览器回归及构建/产物检查通过；程序 gzip 261492 bytes，试听仍为 3816471 bytes，总构建 12518261 bytes。上传约 250 KB 的入口/代码增量，复用已有音频/字体后对照完整本地文件哈希清单验证；公网入口及引用资源一致，首页/匿名 API/来源限制正常，个人首页校验不变，服务保持 active。

最近静态回滚包更新为 `/opt/reipod/backups/dist-before-4b5a188-20261030T112340Z.tgz`；逐文件确认覆盖旧发布后清理旧 f1fd4f7 暂存与旧静态备份，继续保留后端备份。未修改后端、会话或 CDN 配置，无新增真实账号/iPhone 验收。

## 2026-10-30 共享播放核心端口发布

源码 `1d27dd8` 已推送并同步静态版本。无 DOM 核心编译、175 项单元、22 项服务端、71 项完整浏览器回归、生产产物检查通过；总构建 12518383 bytes，程序 gzip 261494 bytes，试听 3816471 bytes。增量与已有静态资源组装后，完整文件哈希清单通过；公网入口/引用资源、首页、匿名 API 和来源限制通过，个人首页校验不变，服务保持 active。原生桥仅为既有替身/单元覆盖，无新增 Xcode/iPhone 实测。

最近静态回滚包为 `/opt/reipod/backups/dist-before-1d27dd8-20261030T113515Z.tgz`；核对覆盖旧发布后清理旧 4b5a188 暂存/旧静态备份，继续保留后端备份。后端和会话未重装或重启。

## 2026-10-30 会话保存边界发布

源码 `6cc6393` 已推送并同步静态版本。无 DOM 核心编译（含持久化控制器）、184 项单元、22 项服务端、71 项完整浏览器回归、生产产物检查通过；总构建 12518922 bytes，程序 gzip 261593 bytes，试听 3816471 bytes。完整暂存文件哈希与本地构建匹配，公网入口/引用资源、首页、匿名 API/来源限制通过，个人首页校验不变，服务 active。保存键和原有会话格式保持，未重装后端或修改服务器会话。

最近静态回滚包为 `/opt/reipod/backups/dist-before-6cc6393-20261030T115919Z.tgz`；核对覆盖旧发布后清理旧 1d27dd8 暂存/旧静态备份，继续保留后端备份。没有新增原生打包、iPhone 或真实账号验收。


## 2026-10-30 本地导入与恢复边界发布

源码 `9d0701b` 已推送并同步静态版本。无 DOM 编译（含导入协调器）、195 项单元、22 项服务端、71 项完整浏览器回归和生产产物检查通过；总构建 12519881 bytes，程序 gzip 261989 bytes，试听 3816471 bytes。完整暂存哈希与本地构建一致，公网入口/引用资源、首页、匿名 API/来源限制正常，个人首页校验不变，服务 active。

最近静态回滚包为 `/opt/reipod/backups/dist-before-9d0701b-20261030T121149Z.tgz`；逐文件确认覆盖旧发布 41 个文件后，清理旧 6cc6393 暂存/旧静态备份，继续保留已有后端备份。未重装后端或修改服务器会话；本次修复的是浏览器本地导入/恢复竞态，无新增 iPhone/真实账号或实机 UI 验收。


## 2026-10-30 音频 IndexedDB 一致性发布

源码 `4bfdc07` 已推送并同步静态版本。195 项单元、22 项服务端、79 项完整浏览器回归（含新增 8 项原生 IndexedDB）、无 DOM 编译和生产产物检查通过；总构建 12520443 bytes，程序 gzip 262166 bytes，试听 3816471 bytes。数据库版本/字段保持；修复本地读写顺序、整批回滚与连接失效，不迁移或删除用户库。

完整暂存与线上文件哈希一致，公网入口/引用资源、首页、匿名 API/来源限制及服务正常，个人首页校验不变。最近静态回滚包为 `/opt/reipod/backups/dist-before-4bfdc07-20261030T121943Z.tgz`；核对覆盖旧发布 41 个文件后清理旧 9d0701b 暂存/旧静态备份，继续保留后端备份。未重装后端或修改服务器会话，无新增 WKWebView/iPhone/真实账号或实机 UI 验收。


## 2026-10-30 删除与清库协调发布

源码 `02e9923` 已推送并同步静态版本。210 项单元、22 项服务端、82 项完整浏览器回归、无 DOM 编译和生产产物检查通过；总构建 12521928 bytes，程序 gzip 262783 bytes，试听 3816471 bytes。新增删除/清库的延迟及失败协调，数据格式保持；附属资料保存失败明确反馈，不宣称跨 IndexedDB/localStorage 原子提交。

首轮浏览器回归 80/82，外观保留播放与 QQ 同步歌词各一次暂停/进度停滞；移除新增删除测试的无关音频播放后，相关 19 项、重复 15 项和完整 82 项通过。未修改旧播放断言或播放器实现，原因未确诊，按 TASK_LOG 的 U05 保留证据和再现条件。

完整暂存/线上哈希一致，公网入口/引用资源、首页、匿名 API/来源限制及服务正常，个人首页校验不变。最近静态回滚包为 `/opt/reipod/backups/dist-before-02e9923-20261030T123406Z.tgz`；核对覆盖旧发布 41 个文件后清理旧 4bfdc07 暂存/旧静态备份，继续保留后端备份。未重装后端或修改服务器会话，无新增 iPhone/真实账号或实机 UI 验收。


## 2026-10-30 classic 菜单 UI 局部还原发布

源码 `aa97b50` 已推送并同步静态版本。修正分屏菜单箭头过小/非选中显示及预览投影被内容覆盖的问题；证据、误差、P/M 状态与真实同状态对照见 [UI_METRICS](UI_METRICS.md#2026-10-30-菜单箭头与分屏投影c-m01-局部修正)。字体/完整 C-M01 实机还原仍待验收。

210 项单元、22 项服务端、85 项完整浏览器回归、无 DOM 编译和生产产物检查通过；总构建 12522204 bytes，程序 gzip 262800 bytes，试听 3816471 bytes。首轮外观用例在音频 time=0、未暂停状态下失败，补实际起播前置及媒体事件附件后，12 项重复和完整 85 项通过；原播放连续性断言保留，旧 U05 的暂停/QQ 现象未据此关闭。

完整暂存/线上哈希、公网入口/引用资源、首页、匿名 API/来源限制及服务正常，个人首页校验不变。最近静态回滚包为 `/opt/reipod/backups/dist-before-aa97b50-20261030T130531Z.tgz`；核对覆盖旧发布 41 个文件后清理旧 02e9923 暂存/旧静态备份，继续保留后端备份。未修改后端或服务器会话，无新增 iPhone/真实账号验收。


## 2026-10-30 网易云手机登录故障修复（任务 28）

用户实测证实网易云 openurl 进入普通网页，不能完成扫码授权；前端改为手机截图后从网易云扫一扫相册识别。账户查询失败保留已确认凭证，网络/5xx 在挑战期限内重试；HTTP 成功结果可重取，取消撤销会话。新后端模块 `login-confirmation.mjs` 必须与 `index.mjs` 一起部署。当前登录挑战在 HTTP 内存中，服务重启后需重新生成二维码；已有持久会话不迁移。

匿名线上检查：原版本服务 active，网易云生成二维码、waiting 轮询与取消正常；日志曾有 QQ 上游 credential-exchange 超时，不据此归因为网易云故障。真实手机/账号授权与播放仍未新增验收。修复部署与最终验证见 TASK_LOG 任务 28。


## 2026-11-04 网易云登录修复发布

应用代码 `479c107` 已部署至现有 VPS，更新静态页面、`server/index.mjs` 与新增 `server/login-confirmation.mjs`；43 个发布文件与本地 SHA-256 清单一致。先生成回滚包 `/opt/reipod/backups/before-login-479c107-20261104T063827Z.tgz`，保留原有持久会话，个人首页校验一致。此次未清理历史备份；旧版本不含新增确认模块，回滚时恢复旧入口及静态页面即可，新增未引用模块不影响旧入口。

公网 /ReiPod/ 为 200，入口及两份直接引用 JS/CSS 与发布包匹配；两平台匿名 status、Pages 来源、非允许来源 403、网易云临时 QR 生成/waiting/取消检查通过，nginx 与音乐服务 active。11-04 重跑 213 项单元、25 项服务端及 dist 校验；85 项完整浏览器与 ios:prepare 是 10-30 同应用代码的历史结果，本日未重跑。没有新增真实 iPhone/网易云账号授权与播放结果。

GitHub main 推送此前被自动审批拒绝；2026-11-04 用户明确授权后，已常规推送修复 479c107 与部署记录至 1b7cbcd。Pages 工作流结果尚未检查，不据此宣称 Pages 已发布成功。下一步在上述 VPS 网页进行真实手机相册识别/授权/返回后资料库与播放验收。


## 2026-11-04 子路径 API 与未登录状态修复（任务 31）

应用 `9b8f2df` 已部署，43 文件哈希匹配，个人首页及会话保留；回滚点 `/opt/reipod/backups/before-login-9b8f2df-20261104T065334Z.tgz`。无配置时公网默认维护者 HTTPS API，本地开发使用 origin 根路径；不再由页面 /ReiPod/ 相对拼出 /ReiPod/api/music/。匿名后端状态检查不会锁住扫码按钮。本轮后端源码未改，发布包复核同版后端文件。

此前顶层 API 冒烟未验证前端实际地址，导致漏掉真实网页 HTML 404；本轮先用线上旧页面转轮重现，再在新页面用真实请求复验 status/login-start=200、扫码按钮、二维码加载及 /api/music/ 轮询。匿名生成/轮询/取消、来源限制、公网入口和引用资源、服务状态正常。218 项单元、25 项服务端、86 项完整浏览器通过；首轮与原生资源构建并行时两项失败的证据与不确定性见 TASK_LOG，未改旧断言。原生资源已生成，未安装；真实手机账号确认与播放仍未新增验收。


## 2026-11-04 HTTP 扫码协议一致性（任务 38）

后端 provider `05db8e9` 已部署并重启，文件 SHA-256 一致；旧文件保留于 `/opt/reipod/backups/providers-before-05db8e9-20261104T072152Z.mjs`。静态前端仍 9b8f2df，本次没有更新静态资源、个人首页、会话目录或依赖版本。release.json 另记 backendRevision/frontendRevision。

QR key/check 显式采用既有原生的普通 API 与桌面 UA；修正此前依赖库默认 EAPI/桌面字段/iPhone UA 差异。8821 返回明确的终止错误，保留官方安全验证要求。218 单元、27 服务端、6 定向浏览器、构建/dist/size通过；本地与公网匿名生成/轮询/取消、来源限制和服务状态正常。用户此前官方电脑版扫码成功、ReiPod 三次本地条件测试仍被拦截，最后一次 DIRECT 是用户配置声明而非逐请求验证；以上发生在协议修正前。修正后未再要求用户扫码，不能声称真实授权或播放通过。

## 2026-11-04 QQ 单曲播放失败诊断（任务 41）

后端 `1b2f167` 仅增加失败日志：公共歌曲 ID、音质、是否有服务会话、限制提示类别及白名单整数错误码；不记录账号标识、凭证、URL 或原始响应，前端响应/授权/播放请求保持。旧 index/providers 与 release 备份 `/opt/reipod/backups/backend-before-1b2f167-20261104T073344Z.tgz`，部署两文件哈希一致，服务 active；静态前端未改、持久会话保留。218 单元、28 服务端、6 定向浏览器与构建/dist/size通过。

用户报告 Bishop Briggs 的 River 在官方 QQ App 同账号可播放，ReiPod 提示可能地区限制；公开搜索原版 songmid 0001AV2L4JYlzN（Church Of Scars），混音等版本独立。不能据此认定封 IP。下一步用户在已有会话中重试实际歌曲一次，以新日志核对单曲错误码与提示来源，不读取会话 vault 或再次要求登录。真实播放故障仍未解决。


## 2026-11-04 QQ 104003 兼容修复（任务 44）

后端 a8b8a20 部署 index 与新增 qq-playback-compat，哈希核对通过；回滚包 /opt/reipod/backups/backend-before-a8b8a20-20261104T075044Z.tgz，恢复旧 index 即不再加载新增钩子。静态前端/账户持久会话保持。HTTP 固定 3.3.5 通过显式 CJS 服务图钩子接入有界同账号 EVkey 重试；不是写入 node_modules 的隐式补丁。部署必须一起包含新增模块，变更依赖版本需先审查钩子。

本地 218 单元、33 服务端、6 定向浏览器、构建/dist/size 与真实 CJS 服务启动通过。候选要求明确单曲授权、精确曲目/文件、QQ HTTPS CDN、限时无跳转 MP3 Range 数据头，失败保留原限制。真实账号完整播放仍待用户重试；MP3 数据头/非空 URL 均不能替代完整解码/时长/听感验收，原生路线未更新。


## 2026-11-04 QQ 候选请求信封补齐（任务 45）

首版 EVkey 兼容在用户两次真实重试中 granted=false、未进入 CDN 探测，未修复该账号播放。复查发现仍使用库默认 Android comm，与候选网页 ct24/cv0 参数不一致；afd0bfb 补显式网页 comm/uin，保留同一 authst/tmeLoginType，并新增序列化测试与候选白名单错误码日志。仅兼容模块更新，哈希一致，服务 active，备份 /opt/reipod/backups/backend-before-afd0bfb-20261104T075542Z.tgz。218 单元、34 服务端、6 定向浏览器、构建/dist/size通过，匿名 QQ status 正常；真实播放仍待用户复验，不能记作通过。


## 2026-11-04 关闭未奏效 QQ 候选（任务 46）

用户真实验收仍失败，候选返回 104003/subcode0、无链接，原请求104003/subcode1。c0300b3 将候选安装改为显式实验环境开关（REIPOD_QQ_EVKEY_EXPERIMENT=1）；生产默认不装，避免持续无效 RPC。入口哈希一致、服务 active，备份 /opt/reipod/backups/backend-before-c0300b3-20261104T080104Z.tgz，前端/会话保留。218 单元、34 服务端、构建/dist/size通过，不能称 QQ 播放故障已修复。接续为真实出口/票据播放能力对照，非继续随机 RPC 参数。


## 2026-11-04 网易云挑战上下文（任务 49）

HTTP provider 最终 abf75e2：单挑战隔离稳定匿名标识和生成/轮询/确认cookie；Set-Cookie属性不作为Cookie键发送，不把临时cookie返回页面。35服务端/218单元/6定向浏览器、构建/dist/size和ios:prepare通过。参考仓库被Vitest默认扫描的问题通过独立测试配置排除研究目录解决，首轮第三方7套件失败不记为项目成功。

最终文件哈希一致、服务active，备份 /opt/reipod/backups/backend-before-abf75e2-20261104T081510Z.tgz；此前状态修正前备份 /opt/reipod/backups/backend-before-128fdb7-20261104T081419Z.tgz。前端和持久会话未改，QQ实验保持关闭。真实网易云手机授权仍未重新验收，不因匿名生成/轮询正常宣称风控解决；原生资源未安装。


## 2026-11-04 classic 电池与LCD图标修订（任务51）

前端 `f516b54` 已推送并部署至VPS。首稿99e35fb被用户指出白色内空隙和图标风格问题，未替换VPS，最终修订取消电池内边距，统一蓝色传输/实心模式矢量，并将随机/重复成组放在播放页右上。依据与暂定边界见 UI_METRICS，本轮不宣称固件资源已恢复。

最终218项单元、88项完整浏览器、显式维护者HTTPS API生产构建、dist/size、文档链接/diff通过。总构建12523631 bytes、程序gzip263417 bytes、试听3816471 bytes。41文件暂存/线上SHA-256全部匹配，公网入口、直接JS/CSS匹配；浏览器实际播放/暂停后确认电池padding=0和新LCD图标。个人首页文件与后端provider哈希保持，nginx/music均active，没有重启服务或改持久会话。

回滚包 `/opt/reipod/backups/dist-before-f516b54-20261104T151611Z.tgz` 包含旧dist和release.json，旧哈希资源保留供已打开页面使用。release.json记录前端f516b54、后端abf75e2。GitHub Pages源码工作流 [41855801368](https://github.com/A-AsukA-A/ReiPod/actions/runs/41855801368) 成功，公网CSS与最终构建匹配；iPhone工作流仍待执行/核验，未进行安装、真实账号或后台播放验收。


## 2026-11-05 classic 银黑外观与菜单修正（任务53）

应用代码 `ef0e180` 已推送并部署VPS静态前端：设置值恢复蓝色/选中白色，曲目列表使用紧凑传输轮廓，银黑中心键改为内凹明暗，黑色轮盘标记对比度及HOLD可见绘图缩放修正。来源/工程适配/暂定色值见 [UI_METRICS任务53](UI_METRICS.md#2026-11-04-主菜单与银黑机身外观任务53)。用户澄清要求现在自主实施，误建的定时任务已删除。

218项单元、92项完整浏览器、显式HTTPS API生产构建、dist/size、文档链接/diff通过。总构建12524057 bytes、程序gzip263518 bytes、试听3816471 bytes。41文件暂存及线上SHA-256一致，公网HTML及直接JS/CSS匹配，实际线上黑色设置页核对蓝色值、浅色印刷标记、中心键内阴影和HOLD比例/54×44点击区域。

回滚包 `/opt/reipod/backups/dist-before-ef0e180-20261104T160350Z.tgz` 包含旧dist/release.json；个人首页与后端provider哈希保持，nginx/music active，没有重启后端、修改凭证或会话。前端ef0e180，后端abf75e2。GitHub Pages应用提交流程41863532749在VPS核验时仍排队，后续发布记录提交会触发同应用代码的新流程；镜像新版尚未核验，不宣称已上线。iPhone流程亦未核验，不增加真实账号/原生安装/后台能力结论。
