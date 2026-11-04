# 音乐服务接入

Apple Music 是首个接入目标。设置 → ReiPod 设置 → 音乐服务把 Apple Music 放在首位；网站配置有效时，首次访问默认选用 Apple Music，用户手动选择本地音乐后不会被自动改回。未配置时本地播放器继续可用，也可以选择 Apple Music 查看连接状态。

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

打开 `http://127.0.0.1:3210/`，进入 **设置 → ReiPod 设置 → 音乐服务 → 网易云音乐 / QQ 音乐**，再选择扫码登录。网易云使用网易云音乐 App；QQ 音乐可选择手机 QQ 或微信扫码。网页不收集账号密码。

账户页显示平台提供的昵称、ID 和头像，头像不可用时显示默认图标；资料库数量与账户操作分组显示。同步期间，焦点停留在“正在同步”项，不会自动落到“退出登录”；用户仍可主动选择退出以中断请求。原生 Apple 系统音乐不提供 Apple ID 或头像，界面不伪造这些资料。

默认只监听本机 `127.0.0.1`。平台 Cookie 保留在后端，浏览器只持有独立会话标识；后端会话与密钥保存在忽略的 `.local/music-sessions/`，会话文件加密存储。保留该目录才能跨重启恢复会话，不能提交或分享。退出登录会撤销当前后端会话。

开发界面可单独运行 `npm run dev`，Vite 将 `/api/music` 转发到本机后端。接口测试使用 `npm run test:music-server`；浏览器测试覆盖扫码、歌单顺序、播放路由、服务隔离与后端离线状态。

播放时如果平台明确返回会员、购买或试听限制，LCD 会显示对应权限提示；空链接但原因未知时会列出可能限制，不直接判定为 VIP。错误面板保留中心键重试、下一首跳过。已有会员且平台返回完整链接的歌曲正常播放。

选歌前也会在歌名旁显示 `VIP`／`付费` 角标，涵盖歌曲、歌单、专辑曲目、Cover Flow 二级菜单、搜索及队列等共用歌曲列表。网易云依据歌曲 `fee`，QQ 依据歌曲的付费播放标志；仅下载收费不标作 VIP。角标表示平台对歌曲的分类，即使账号有会员仍显示；它不替代播放时的当前账号权限检查。没有明确平台标记的歌曲不猜测标签。

**设置 → ReiPod 设置 → 歌词显示** 默认开启并保存选择。在播放页连续短按中心键，按「封面 → 进度 → 随机 → 评分 → 歌词」切换；再次短按返回封面。也可长按中心键，直接确认默认选中的首项“歌词”。重复播放留在设置中，无歌词时跳过歌词页；具体恢复粒度见 [播放交互约定](PLAYBACK_INTERACTIONS.md)。网易云歌词优先读取 YRC 逐字时间，缺少时回退 LRC；QQ 保留逐行歌词。词内渐进高亮、轻微弹簧强调与距离模糊是 ReiPod 新增效果，减弱动态效果下关闭位移/缩放与模糊。实现与复用许可见 [Lazer 研究](LAZER_RESEARCH.md)。网易云与 QQ 歌词在进入页面时按需读取，按歌曲与会话隔离缓存，切歌后更新并跟随时间戳高亮，转轮可浏览歌词。关闭开关后跳过歌词页；无歌词或读取失败时显示原因，失败可退出歌词页再进入重试。本地同名 LRC／YRC 和内嵌歌词可导入，Apple 系统音乐当前不提供歌词。

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

### 手机扫码与授权结果接收（2026-10-30 修正）

网易云在手机网页、iPad 与原生容器中都显示真实二维码：截图后在网易云音乐 App 的扫一扫中从相册识别，确认授权，再手动返回 ReiPod；也可由另一台设备扫描。必须扫描 ReiPod 生成的这张码，普通网页登录不授权当前挑战。桌面继续直接扫码。相册识别及实际账号结果仍需对应 App 版本实测。

移除了网易云通用 `orpheus://openurl?url=` 登录入口。官方 [移动端脚本 app.665f3835.js](https://s3.music.126.net/mobile-new/app.665f3835.js) 只能证明这个协议会打开网页；2026-10-30 用户实测也确认打开的是 App 内网页，不能据此认定会进入扫码确认。未发现可验证的直接扫码授权/自动回跳契约，不拼造新的深链或回调参数。

QQ 手机入口仍使用 `qqmusic` 通道，从平台 PNG 二维码提取官方短链，仅解析固定的 `c6.y.qq.com/base/fcgi-bin/u` 到 `y.qq.com/m/client/qr_code_login/authorize.html`；协议来自 [H5 SDK music-react-2.3.0](https://y.qq.com/lib/commercial/h5/music-react-2.3.0.min.js)。桌面手机 QQ / 微信通道保持。QQ 真实手机授权尚待验证。

用户确认后手动返回 ReiPod，客户端以同一不透明挑战查询结果。手机挑战与网易云二维码暂存于当前标签页 sessionStorage，有效期三分钟；刷新恢复，取消/成功清理。旧版本没有二维码的网易云挑战不再恢复，需重新扫码。平台凭证只保留在服务端或原生隔离存储。

临时网络错误、429 和 5xx 在原挑战期限内重试；过期或取消终止。确认 cookie 在查询账户前保留于服务边界，账户端点短暂未就绪先重试，后续轮询复用确认结果。HTTP 后端成功响应在挑战到期前可重取，避免手机收不到响应后误报二维码过期；取消会撤销该挑战生成的会话。重启 HTTP 服务仍使未完成的内存挑战失效，已完成的持久会话保留。

验证边界：单元与浏览器替身证明客户端恢复/重试和凭证隔离，不证明真实账号成功。本次线上匿名生成/轮询/取消正常；本轮未取得真实 iPhone/网易云账号授权和完整播放结果，不沿用此前本机账号结果。

### 2026-11-04 子路径与首次连接状态修正

未显式配置 VITE_MUSIC_API_URL 时，公网页面默认使用维护者 HTTPS 后端；本地开发默认使用当前 origin 的 `/api/music/` 根路径。不得从 `/ReiPod/` 页面路径拼接为 `/ReiPod/api/music/`。显式自托管配置仍优先且必须使用 HTTPS（本机开发除外）。首次无会话的状态检查保留未登录状态与扫码按钮，不把后端探测当作用户授权；真正开始生成二维码才进入登录等待，已有会话恢复仍检查真实授权。

### 2026-11-04 真实手机授权反馈

用户报告网易云提示设备环境异常并拦截操作；当前真实手机授权未通过。提示不能单独证明设备越狱或确定具体触发因素，需补提示发生环节及官方 App 正常登录的对照。暂停频繁尝试，按平台提示处理；匿名 API/二维码与浏览器替身通过不代表平台接受该账号授权。

### 2026-11-04 扫码协议一致性修正

官方电脑版可登录；本地经代理/换节点/用户声明 DIRECT 的测试仍被平台拦截，尚无成功账号结果。HTTP QR 生成与轮询现显式选择 `crypto=api`、`music.163.com` 与桌面 UA，匹配现有原生扫码表单流程，避免依赖库默认 EAPI/桌面字段与 iPhone UA 的混合。来源为固定依赖源码、bridge/netease.mjs 与 LAZER_RESEARCH 对应固定修订研究；这能证明实现差异，不能证明它是此次安全拦截的唯一原因。8821 明确终止并提示官方安全验证；不随机改 IP 或绕过检查。

### 2026-11-04 海外后端与登录可靠性研究（任务 42）

结论：美国出口是需要验证的部署变量，尚非已确认根因。现有失败至少分为网易云扫码设备风控、QQ 登录票据/播放 RPC、单曲权限与 CDN 获取四个阶段，不能以“两个平台封 IP”统一解释。本节为研究建议，未更改当前 Web HTTPS / App 内置服务产品决定，未购买或迁移主机。

| 证据 | 对 ReiPod 的意义与限制 |
| --- | --- |
| 网易云 [issue #1](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/issues/1) 报告第三方扫码设备异常而官方网页扫码正常；[#4](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/issues/4) 给出官方网页登录思路并链接 [4f4aa134](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/commit/4f4aa134d53704932b9fe0e09b7170f2a2451731) 修复 | 与用户现象相似，但这是 2025 年历史问题，不是本次根因证明；当前已固定 Enhanced 4.41.1，不能把采用 Enhanced 或盲目升级作为新方案。需对比修复、固定包与宿主实际请求 |
| 网易云 [#176](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/issues/176) 记录 randomCNIP 缺陷并由 #178 关闭 | realIP/randomCNIP 是请求参数/头层面的处理，不能证明真实网络出口已改变；该记录针对 check/music，不证明 8821 登录问题可解 |
| QQ [当前上游说明](https://github.com/yakult-green-tea/qq-music-api) 提醒宿主间播放差异、稳定设备文件/会话密钥、设备数限制和续期边界 | ReiPod 已用该库 3.3.5。不能仅凭容器、Serverless 或新实例启动成功认定播放可靠；不要重建身份来反复扫码 |
| Music Assistant [#6628](https://github.com/music-assistant/support/issues/6628) 用户报告同账号同歌 UrlGetVkey=104003、CgiGetEVkey 成功，并验证完整音频；后续注明英国环境 | 这是用户个案，部分分析由 AI 辅助，未形成通用正式修复。值得与当前 Node 库进行受控对照，不能照抄或当成官方地区判据 |
| 本地固定包 `node_modules/@yakult-green-tea/qq-music-api/dist/src/services/auth/playback.js` 对应[上游源码](https://github.com/yakult-green-tea/qq-music-api/blob/main/src/services/auth/playback.ts) | 当前登录态确实使用 music.vkey.GetVkey / UrlGetVkey，未发现 CgiGetEVkey；因此上条线索与实际调用路径有关。但尚未以用户账号测试替代 RPC |
| [L-1124/QQMusicApi](https://github.com/L-1124/QQMusicApi) 为独立 Python 封装；[ncm-api-rs](https://github.com/SPlayer-Dev/ncm-api-rs) 为 Rust 原生网易云实现 | 可用于协议交叉核对或未来原生技术评估；换语言本身不会消除相同平台的权限/风控条件，不建议立即全量替换 |

建议按以下顺序推进：

1. QQ 先做隔离的取链接协议对照：同账号、同歌曲版本/音质、同出口，比较当前 UrlGetVkey 与候选 CgiGetEVkey。检查登录票据是否具备播放能力、media_mid/文件名、返回 sip；只记布尔状态和白名单数字码，不输出票据或签名链接。拿到 URL 后仍须验证客户端 Range/解码/完整时长及听感，不能把 URL 非空当成成功。失败时保留现有权限反馈，不自动换源或绕过付费。
2. 网易云先审查单个挑战的上下文：QR key/check 的设备标识、cookie jar、UA、os/appver 和协议是否一致，确认临时 cookie 是否应在服务端保留。当前依赖 processCookieObject 在缺失时逐次生成部分标识；这只说明应检查会话连续性，尚非已确诊缺陷。任务 38 普通 API/桌面 UA 修正后仍缺真实验收，不反复叠加未验证参数。
3. Web 部署做同版本的美国出口与中国大陆真实出口对照。优先临时测试节点或用户本机真实直连，固定版本/设备上下文并遵守平台冷却要求，得到结果后才选择常驻主机。香港仍不是大陆出口，不应承诺能解决。验收包括生成码、确认、资料库、指定歌曲完整播放、刷新恢复与重启恢复。
4. 如果大陆节点验证稳定，可保留现有美国静态站，将受限音乐操作放在维护者控制的大陆 HTTPS 服务；若保留美国 API 入口，则仅认证转发白名单操作至固定大陆服务。登录、轮询、资料库、取链接在同一服务/稳定出口完成，挑战固定路由，平台凭证保留在该边界。前端仍只接现有不透明会话协议。音频 CDN 通常由浏览器访问，API 换地区不能保证客户端音频可达；本轮不引入任意音频代理。
5. App 继续内置本机服务，减少对集中美国出口的依赖。网易云官方登录页作为原生宿主内候选备用流程，只能由宿主隔离处理凭证，需另做平台与安全边界验证；普通网页无法跨域读取官网 cookie，不采用手动复制 cookie 或恢复浏览器扩展作为默认体验。

本轮只做公开资料和本地固定源码核对、文档 diff/链接检查；没有新增扫码、读取真实账户凭证、迁移部署或运行播放验证。O06/U04 保持开放。

### QQ 104003 兼容重试（任务 44）

HTTP 后端在固定 3.3.5 CommonJS 服务图中安装显式兼容钩子，不改 node_modules 文件或原生服务。原请求成功、试听、非 128 音质、明确权限分类均不改；仅 `url_unavailable + 104003/1` 才按同会话/设备重新读取曲目 media_mid，使用 `music.vkey.GetEVkey/CgiGetEVkey` 请求同歌同 128 音质，最多十首。候选必须明确 result=0、songmid 与文件匹配，只用响应 sip 中 QQ HTTPS CDN（禁止跳转），限时 Range 探测 MP3 头；拒绝、异常、非 MP3 均保留原权限提示。没有解密、替代音源或绕过会员/地区授权。

候选来源为 [Music Assistant #6628](https://github.com/music-assistant/support/issues/6628) 的同症状实测个案；不是官方通用修复。数据头检查不证明完整时长/解码或听感，真实账号仍须验收。依赖版本变更必须审查内部模块接口，不静默继续 hook；CJS/ESM 会话封装契约由固定库提供，原生保留旧路径，未宣称原生已修复。

### 任务 46：候选真实验收失败，默认关闭

用户重试表明原 UrlGetVkey=104003/1，网页信封候选 CgiGetEVkey=104003/0，均无 purl；不进入 CDN 检查。另一个歌曲也同样失败，候选并未修复当前环境。生产默认关闭候选额外请求，仅保留 REIPOD_QQ_EVKEY_EXPERIMENT=1 的隔离实验入口和安全失败诊断。不得把任务 44/45 的单元/匿名结果宣传为账号播放通过。下一步必须受控核对 QQ 会话播放票据与真实出口；此前网易云本地测试不是 QQ 大陆出口对照。

### 2026-11-04 用户候选仓库核对（任务 47）

[xgxdmx/NeteaseMusic-API](https://github.com/xgxdmx/NeteaseMusic-API) 为 Enhanced 的 fork；本次固定 main 提交 `0395d087d9e99ceef480c54e7932c2332e5c0c39`（提交日期 2026-04-19），package.json 仍为 @neteasecloudmusicapienhanced/api 4.32.0、MIT；GitHub 元数据 pushed_at 2026-04-21，非 archived。源码只下载至忽略研究目录，未安装或运行。

与当前安装的 4.41.1 逐字节比较，module/login_qr_key.js、login_qr_check.js、login_qr_create.js、login_status.js 四文件完全相同。候选默认 encrypt=true，request 仍生成缺失标识并默认采用 iPhone UA；未见所查扫码核心提供与当前症状相关的新机制。README 的“增强/维护”以及历史 CHANGELOG“修复登录冻结”不能证明当前账号设备拦截已修复。未断言整个仓库完全相同，也未做真实账号验证。

结论：不为名称/功能列表全量替换现有依赖；如将来发现具体有效提交，再按挑战 cookie/设备上下文和真实账号结果作隔离对照。该项目是网易云适配器，不是 QQ 播放 104003 的解决方案；当前两个服务故障仍开放。

### 网易云单挑战 cookie 连续性（任务 49）

HTTP 生成二维码后曾丢弃上游 Set-Cookie，未提供稳定匿名标识，后续轮询可能与生成阶段上下文不一致。现为每个挑战保留独立 _ntes_nuid/_ntes_nnid 及上游临时 cookie，确认时合并轮换 MUSIC_U/__csrf 等；成功、过期、取消释放，三分钟/20项上限，不返回网页。原生适配器补齐与固定库一致的 result.cookie 元数据，供特权服务合并，不暴露给 UI；需新安装资源才生效。

这修正状态管理缺陷，不证明设备拦截已解除；此前失败不据此改记成功。HTTP 内存挑战在进程重启后失效，既有授权会话不迁移；本轮仍未完成原生进程重启期间未确认挑战的持久恢复验收。QQ 已有会话与 QQ 单曲播放失败分开，继续保持失败候选关闭，不再次要求 QQ 登录。
