# 音乐服务接入

Apple Music 是首个接入目标。设置 → 音乐服务把 Apple Music 放在首位；网站配置有效时，首次访问默认选用 Apple Music，用户手动选择本地音乐后不会被自动改回。未配置时本地播放器继续可用，也可以选择 Apple Music 查看连接状态。

## iPhone 原生路线

`ios/` 提供原生容器和系统音乐桥接。App 内优先调用 `MediaPlayer`，读取用户授权的系统资料库与已有歌单，由系统音乐 App 播放，不经过下面的网页 Developer Token / Music User Token 流程。界面沿用同一份网页代码，授权由 iOS 管理，导入本地文件的列表保持独立。目录搜索与现有资料库搜索是不同功能；此版本原生端只实现后者。安装、编译与实测范围见 [ios/README.md](ios/README.md)。

## 已实现的代码

- MusicKit JS v3 官方授权入口、退出、当前浏览器授权恢复；恢复时调用个人 storefront 验证授权，不仅凭本地标志显示已登录。
- 个人歌曲与歌单分页读取，歌单曲目按原顺序分页读取，歌曲/艺人/专辑/Cover Flow 浏览和所在 storefront 的歌曲搜索（每次最多 25 个搜索结果）。
- MusicKit 播放适配器：播放、暂停、上下首、转轮进度与音量、随机/重复和播放队列；MusicKit 负责受保护内容播放，ReiPod 不读取、保存或转换流媒体音频。
- Apple Music 和本地资料库、歌单、队列及播放位置分开。本地音乐以单独列表保留；切换实际播放来源会暂停另一播放器。切换浏览服务不强行停止当前音乐。
- 当前浏览器保存服务选择和授权凭证，重新打开时验证并恢复；授权撤销/失效后清理凭证并提示登录。浏览器清理网站数据、禁用存储、平台撤销授权等情况会要求重新登录。
- 退出或重新登录会取消旧账户的请求；分页、搜索和迟到的错误响应都受登录会话限制，旧请求的 401 不会清理新登录。
- 开发者 Token 的本地/CI 签名工具和 GitHub Pages 配置入口。私钥只交给 Node/CI，不打包进浏览器。

## 当前验证边界

项目维护者目前没有 Apple Developer 账号，因此尚未配置生产开发者 Token。真实 Apple 账号的授权、订阅权限和 DRM 播放仍需要在凭证配置后进行实机联调。浏览器测试拦截 Apple API 并注入 SDK 替身，覆盖分页、资料库隔离、播放路由、刷新恢复、失效授权及取消登录；它们不等于真实 Apple 账号验证。

网易云音乐与 QQ 音乐的现有自托管路线支持扫码登录、个人歌单、喜欢的歌曲、搜索和按需获取播放链接；App 内置服务与 Web 后端复用同一套平台数据和权限判断，验证范围另见下文。两家的资料库、队列及账号会话分别保存，本地导入列表保持独立。网易云真实账号的已验证范围见下文；QQ 真实账号扫码与播放仍待完成。浏览器替身测试不等于平台真实播放已通过。

## 网易云音乐与 QQ 音乐：架构约定

2026-10-29 产品决定：**本地 App 内置运行音乐服务能力，Web 连接维护者的 HTTPS 后端**。浏览器扩展方案已废除，网页不再要求安装扩展。

| 环境 | 实现 | 使用边界 |
| --- | --- | --- |
| 桌面 App | 目标为随 App 启停的内置服务 | 尚无桌面 App 壳 |
| iOS App | 原生网络桥承接签名、请求及会话 | 保留现有实现，真实账号与后台能力待验 |
| Web / GitHub Pages / Safari | 静态页面连接 HTTPS 音乐后端 | 不依赖扩展，后台播放仍需平台实测 |

平台 Cookie 留在原生服务或服务器加密 vault 内；网页只持有 ReiPod 不透明会话标识。服务限制操作和来源，不提供任意 URL 代理。保留网易云、QQ、本地音乐账号、资料库及队列隔离，以及 Apple Music 路线。

服务器部署与验收状态见 [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md)，原生实现见 [MUSIC_BRIDGE.md](MUSIC_BRIDGE.md)。Pages 工作流默认编入维护者的 API 地址，可通过仓库变量 `MUSIC_API_URL` 覆盖。发布与真实扫码验收分别记录；不能把匿名二维码检查当作登录或播放成功。

## 可选实现：免费自托管接口

维护者的 VPS 部署入口、HTTPS、自动续期和验收边界见 [自有服务器部署](SERVER_DEPLOYMENT.md)。服务器发布包显式配置远程 API，无需安装 Web 扩展；此部署选择保留现有 App 内置桥。

后端位于 `server/`，使用固定版本的社区项目 [NetEase Cloud Music API Enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 和 [QQ Music API](https://github.com/yakult-green-tea/qq-music-api)。它们不是两家平台的官方 SDK；接口代码可自行部署，无需购买 API 调用套餐。歌曲能否播放取决于当前账号和平台返回结果。后端只调用原平台的读取与播放链接接口，关闭替代音源及解锁功能；不会把试听当作完整歌曲。

在这台 Mac 上运行：

```sh
npm ci
npm --prefix server ci --ignore-scripts
npm run build
npm run music:serve
```

打开 `http://127.0.0.1:3210/`，进入 **设置 → 音乐服务 → 网易云音乐 / QQ 音乐**，再选择扫码登录。网易云使用网易云音乐 App；QQ 音乐可选择手机 QQ 或微信扫码。网页不收集账号密码。

账户页显示平台提供的昵称、ID 和头像，头像不可用时显示默认图标；资料库数量与账户操作分组显示。同步期间，焦点停留在“正在同步”项，不会自动落到“退出登录”；用户仍可主动选择退出以中断请求。原生 Apple 系统音乐不提供 Apple ID 或头像，界面不伪造这些资料。

默认只监听本机 `127.0.0.1`。平台 Cookie 保留在后端，浏览器只持有独立会话标识；后端会话与密钥保存在忽略的 `.local/music-sessions/`，会话文件加密存储。保留该目录才能跨重启恢复会话，不能提交或分享。退出登录会撤销当前后端会话。

开发界面可单独运行 `npm run dev`，Vite 将 `/api/music` 转发到本机后端。接口测试使用 `npm run test:music-server`；浏览器测试覆盖扫码、歌单顺序、播放路由、服务隔离与后端离线状态。

播放时如果平台明确返回会员、购买或试听限制，LCD 会显示对应权限提示；空链接但原因未知时会列出可能限制，不直接判定为 VIP。错误面板保留中心键重试、下一首跳过。已有会员且平台返回完整链接的歌曲正常播放。

选歌前也会在歌名旁显示 `VIP`／`付费` 角标，涵盖歌曲、歌单、专辑曲目、Cover Flow 二级菜单、搜索及队列等共用歌曲列表。网易云依据歌曲 `fee`，QQ 依据歌曲的付费播放标志；仅下载收费不标作 VIP。角标表示平台对歌曲的分类，即使账号有会员仍显示；它不替代播放时的当前账号权限检查。没有明确平台标记的歌曲不猜测标签。

**设置 → 歌词显示** 默认开启并保存选择。在播放页连续短按中心键，按「封面 → 进度 → 随机 → 评分 → 歌词」切换；再次短按返回封面。也可长按中心键，直接确认默认选中的首项“歌词”。重复播放留在设置中，无歌词时跳过歌词页；具体恢复粒度见 [播放交互约定](PLAYBACK_INTERACTIONS.md)。网易云歌词优先读取 YRC 逐字时间，缺少时回退 LRC；QQ 保留逐行歌词。词内渐进高亮、轻微弹簧强调与距离模糊是 ReiPod 新增效果，减弱动态效果下关闭位移/缩放与模糊。实现与复用许可见 [Lazer 研究](LAZER_RESEARCH.md)。网易云与 QQ 歌词在进入页面时按需读取，按歌曲与会话隔离缓存，切歌后更新并跟随时间戳高亮，转轮可浏览歌词。关闭开关后跳过歌词页；无歌词或读取失败时显示原因，失败可退出歌词页再进入重试。本地同名 LRC／YRC 和内嵌歌词可导入，Apple 系统音乐当前不提供歌词。

本机真实网易云账号已验证登录、个人歌单、播放、进度、暂停、切歌及带时间戳歌词接口；用户已确认歌词与 VIP 播放提示正常。资料库 VIP 元数据接口已验证返回，列表角标另有浏览器测试。QQ 账号扫码与播放的用户实测仍待完成；浏览器替身测试仅验证应用行为。

### GitHub Pages 与 iPhone 使用边界

GitHub Pages 只部署 `dist/`，不能运行 Node.js 后端。在当前自托管实现下，公网网页和 iPhone 打包资源可以通过可访问的 HTTPS 后端接入：构建时配置 `VITE_MUSIC_API_URL=https://你的后端域名/api/music/`，并在后端用 `REIPOD_MUSIC_ORIGINS` 显式允许对应网页来源。这是当前 Web 部署路线；iOS App 继续优先使用内置服务。后端端口默认为 3210，可用 `REIPOD_MUSIC_PORT` 调整；监听地址由 `REIPOD_MUSIC_HOST` 设置。

本机运行不产生 API 服务费用，但 Mac 必须保持运行；长期公网部署的主机费用由选择的托管方案决定，不能保证免费。没有配置可用后端时，界面显示连接失败，不会冒充已登录。此接入使用网页音频播放器；新服务在 iPhone 上的后台与锁屏能力需要另行真机验证，不能沿用 Apple 系统音乐路线的验收结论。

## 配置 Apple Music

官方先决条件与流程：

1. [创建 Media ID 和 Media Services 私钥](https://developer.apple.com/help/account/capabilities/create-a-media-identifier-and-private-key/)，启用 MusicKit。
2. 按 [生成开发者 Token](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens) 使用 ES256 签名，设置 Team ID、Key ID、过期时间和站点 origin。签名脚本默认 180 天，符合 Apple 的最大有效期限制；到期前需要重新部署新 Token。
3. 页面从 [Apple 官方 CDN](https://js-cdn.music.apple.com/musickit/v3/docs/iframe.html?path=/story/get-started--page) 加载 MusicKit。用户通过 Apple 授权界面登录；[Music User Token](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit) 用于个人资料库请求。完整播放还取决于用户的订阅、地区版权和浏览器播放支持。

开发者 Token 会提供给网页，属于预期的公开配置；`.p8` 私钥永远不能放在 `public/`、`VITE_` 环境变量或 Git 仓库中。

### 本地或静态部署

复制 `.env.example` 为忽略的 `.env.local`，填入公开的 `VITE_APPLE_MUSIC_DEVELOPER_TOKEN`，然后重启 Vite。也可以在未设置构建环境变量时配置 `public/music-services.json` 的 `appleMusic.developerToken`。

有私钥时可以在本机通过进程环境设置 `APPLE_MUSIC_TEAM_ID`、`APPLE_MUSIC_KEY_ID`、`APPLE_MUSIC_PRIVATE_KEY_FILE`（本机 `.p8` 路径）以及 `APPLE_MUSIC_ORIGINS`（逗号分隔、无末尾斜杠的站点 origin），运行：

```sh
node scripts/apple-music-token.mjs
npm run build
```

脚本把签名后的公开 Token 写入忽略的 `.env.production.local`，不输出 Token 或私钥。它不自动读取 `.env.local` 中未导出的私钥环境变量。开发服务器可单独在 `.env.local` 填公开 Token。

### GitHub Pages

仓库 Actions secrets 配置 `APPLE_MUSIC_TEAM_ID`、`APPLE_MUSIC_KEY_ID`、`APPLE_MUSIC_PRIVATE_KEY`（完整 PEM）。Pages 工作流会在构建前生成公开 Token，origin 固定为 `https://a-asuka-a.github.io`。也可以直接设置 `APPLE_MUSIC_DEVELOPER_TOKEN` secret。未配置 secrets 时不生成任何假 Token。

### 自有 Token 服务

设置 `VITE_APPLE_MUSIC_TOKEN_URL` 或运行时 JSON 的 `appleMusic.tokenUrl`，指向返回 `{ "developerToken": "..." }` 的 HTTPS 地址。跨域服务需要允许站点 origin。签名在该服务端完成，前端不接受私钥。重新打开页面会取得当前 Token；静态 Token 或长时间打开的 MusicKit 播放实例到期后可能需要刷新网页。不要把短时 Token 的更新误认为用户授权需要重新取得。

## 官方 SDK 核对

2026-10-27 核对 Apple 官方 v3 SDK 的队列描述符：传入未加载歌曲时使用 `{ id, kind: "song" }`，而不是缺少 attributes 的 `{ id, type }` API resource；SDK 根据 library ID 加载个人歌曲。监听 `playbackStateDidChange`、`playbackTimeDidChange` 和 `mediaPlaybackError`。SDK 文件只保留在忽略的本地研究目录，产品运行时从官方 CDN 加载，不重新托管。

### 手机 App 授权与结果接收（2026-10-29）

手机网页（含 iPad 桌面 UA）与 iOS App 先向自己的服务创建登录挑战，再打开与该挑战绑定的官方授权链接。网易云链接携带 `codekey`；QQ 手机入口使用 `qqmusic` 通道，从平台实际 PNG 二维码提取官方短链，仅解析固定的 `c6.y.qq.com/base/fcgi-bin/u` 到 `y.qq.com/m/client/qr_code_login/authorize.html`，不提供任意 URL 代理。QQ 授权事件连接保留在服务器或原生隔离环境内。桌面原有手机 QQ / 微信扫码通道不变。

用户确认后返回 ReiPod，客户端继续用同一不透明挑战查询结果；后端验证平台返回的凭证与账号，再返回 ReiPod 会话和公开资料。平台 Cookie 不进入 UI。这里采用轮询结果接收，不宣称平台支持自动跳回 ReiPod。手机浏览器可能拦截异步唤起，此时再按中心键“打开…确认”，复用已有挑战。未完成的挑战暂存在当前标签页 sessionStorage，有效期三分钟；刷新会恢复查询，不新建另一会话。取消、过期与成功均清理暂存。

唤起协议参照平台自身公开脚本：网易云 [移动端脚本 app.665f3835.js](https://s3.music.126.net/mobile-new/app.665f3835.js) 使用 `orpheus://openurl?url=`；QQ [H5 SDK music-react-2.3.0](https://y.qq.com/lib/commercial/h5/music-react-2.3.0.min.js) 将 `ui.openUrl` 编码为 `qqmusic://qq.com/ui/openUrl?p=`。原生仅允许指定平台、路径和参数，无法打开时回退对应官网。浏览器不能可靠检测 App 是否安装，只在唤起标签页保持可见时尝试延时官网回退；进入 App 或平台接管导航后取消回退。

验证边界：浏览器替身覆盖会话绑定、唤起拦截后重试、刷新恢复、确认后保存会话与资料库同步；原生需重新打包安装。匿名真实挑战仅验证链接生成、解码和 QQ 事件订阅，不能证明真实账号授权已通过。尤其网易云通用 openurl 是否直接进入扫码确认页，仍需手机实测；不得把打开普通登录页面误记为授权成功。两家真实手机授权确认、未安装回退和返回后完整播放尚待验证。
