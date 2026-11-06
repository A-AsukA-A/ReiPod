# App 内置音乐服务

2026-10-29：按维护者决定，Web 改用自有 HTTPS 后端，浏览器扩展方案已废除。扩展消息传输、下载助手、安装页面、打包脚本和扩展专用浏览器测试已移除。历史实现可从 Git 历史查看；不再要求更新或安装扩展。Web 部署见 [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md)。

## iOS 内置服务

`bridge/` 保留无需 Node 的运行时，复用 `server/providers.mjs` 的平台数据归一化、歌单顺序、歌词及 VIP／购买／试听限制判断。原生 App 优先调用内置桥；普通网页使用 HTTPS 音乐后端，不能通过页面 postMessage 调用已废除的扩展通道。

请求路径：Web UI → 原生消息桥 → 隔离 WKContentWorld 适配器 → URLSession。平台凭证保存在本设备 Keychain；网页只持有不透明 ReiPod 会话标识。登录二维码仍在 ReiPod 内显示，用户用平台 App 扫码确认。

原生消息只接受 `reipod-app://bundle` 主文档。凭证存取和网络处理器仅注册在隔离环境，页面无法直接调用。网络目标使用 HTTPS 主机白名单，重定向交回适配器逐跳处理，不能提供任意 URL 代理。Apple 系统音乐桥保持独立。

## 构建

```sh
npm ci
npm run ios:prepare
cd ios
xcodegen generate
open ReiPod.xcodeproj
```

`ios:prepare` 生成 Web 资源、内置 `music-runtime.js` 和依赖许可。生成文件保持忽略。仅更新原生音乐运行时可用 `npm run bridge:build`。安装说明见 [ios/README.md](ios/README.md)。当前没有桌面 App 壳，不能把 iOS 构建当成桌面实现。

## 实现与验证边界

网易云协议参照 [api-enhanced 4.41.1](https://www.npmjs.com/package/@neteasecloudmusicapienhanced/api/v/4.41.1)，扫码按 [Lazer 固定修订研究](LAZER_RESEARCH.md) 使用原始 `/api/` 表单，其他适用接口使用 WEAPI/EAPI。QQ 使用固定版本 [QQ Music API 3.3.5](https://www.npmjs.com/package/@yakult-green-tea/qq-music-api/v/3.3.5) 的 serverless 运行时；此处指嵌入 App 的库，不需要云函数。CryptoJS 4.2.0、qrcode 1.5.4 仅进入内置运行时，不进入 Web 主包，构建附带许可与贡献来源。

单测覆盖协议向量、二维码、服务与会话隔离、取消登录及目标白名单。此前 iOS App 与测试目标通过无签名编译；macOS WebKit 冒烟验证了隔离世界与内部处理器边界，不能代替 iPhone 验收。本次移除扩展不构成新一次原生编译或真机验证。

待实测：两平台真实扫码确认、重启恢复、私人歌单、完整播放及会员权限、歌词、退出撤销；iPhone 另验锁屏、后台、音频打断和返回前台。真实平台若返回 8821，需平台安全验证，不能用模拟成功替代。逐字歌词需求仍记录于 LAZER_RESEARCH.md。


### 2026-10-30 手机网易云登录修正

网易云前端统一显示扫码二维码，手机需截图后在官方 App 扫一扫中从相册识别并手动返回；不再调用旧 openurl 网页登录桥。桥的原始动作仍兼容旧资源，但不作为有效授权入口。原生服务复用 `server/login-confirmation.mjs`，确认凭证先持久化，再查询账户；失败可恢复，成功/取消沿用不透明会话契约。须重新执行 ios:prepare 并安装才能更新原生打包资源；本轮无新增真机安装/账号结果。


## 2026-11-05 / POD01 系统播客边界

系统播客沿用独立的 Apple MediaPlayer 桥，不经过网易云/QQ 隔离运行时或 HTTPS 音乐后端。`podcasts` 返回分页的系统可访问已下载音频播客及节目 ID/书签，不返回原始媒体 URL；`openPodcasts` 只打开固定 Apple 播客目的地。原主文档来源校验不变。能力标志、入口、官方来源与真实 iPhone 待验收项见 [原生说明](ios/README.md#iphone-系统播客pod01)。本次无后端迁移、真实第三方账户或原生设备播放验收。


任务59更新：系统播客读取与歌曲/歌单分别调度，启动时预取、首批展示、会话内保留列表，失败不阻断音乐读取。`podcasts`首分页的`refresh=true`仅失效固定媒体库播客缓存；变更/前台恢复自动刷新，旧授权结果不回写。没有新增页面URL或凭证能力。管理入口改至ReiPod设置，详见原生说明。


## 2026-11-05 / 任务69真机结果与POD05目标

当前版本已签名安装到iPhone17 Pro/iOS27.3，6项原生测试实际通过；用户确认下载播客可见、前台控制/进度/封面、后台/锁屏控制及返回同步通过。用户同时指出与Apple播客当前播放不同步，并要求完整Apple播客清单和直接控制该App播放；现有MediaPlayer下载项路径不满足，POD05未完成。具体证据、公开接口核查和未验项见[ios/README.md](ios/README.md#pod05完整apple播客接入目标与现有路线差距)。没有新增第三方真实账号验收或后端变更。


任务70最终决定替代上述完整Apple播客接管目标：用户受控对照后确认My Classic也不双向同步，选择ReiPod内独立播放系统可读播客并支持后台/锁屏。保持现有原生媒体边界，本轮只接通主页播客封面预览，不新增账号/URL/播放命令；POD05原完整清单目标未实现且不再作为本轮验收要求。当前决定、安装与待验项见ios/README任务70。


## 2026-11-05 / PHOTO01独立照片桥（任务71）

PhotoKit照片桥独立于音乐服务与账号，主文档限定、只读动作、不透明句柄和固定图片规格；不会开放任意URL/文件路径或新增提供方凭证能力。iPhone用户已确认实际系统相册/缩略图/单图正常，并确认播客列表/播放正常；真实边界及8项Swift测试见[ios/README.md](ios/README.md#iphone-系统相册photo01)。没有后端迁移/新真实音乐账号验收。
