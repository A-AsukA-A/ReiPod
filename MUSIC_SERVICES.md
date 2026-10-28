# 音乐服务接入

Apple Music 是首个接入目标。设置 → 音乐服务把 Apple Music 放在首位；网站配置有效时，首次访问默认选用 Apple Music，用户手动选择本地音乐后不会被自动改回。未配置时本地播放器继续可用，也可以选择 Apple Music 查看连接状态。

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

网易云音乐与 QQ 音乐目前只显示明确标注的待接入项，不能选择为已连接服务。未实现它们的登录、歌单或播放，也没有使用公共逆向代理或借用其他网站的 Apple Token。后续需根据获得的接入权限实现对应适配器。

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
