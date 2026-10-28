# App 内置音乐服务与 Web 扩展

2026-10-28 开始实现。目标架构见 [AGENTS.md](AGENTS.md) 和 [MUSIC_SERVICES.md](MUSIC_SERVICES.md)。本文件区分代码能力、工程验证和真实账号验收。

## 当前实现

`bridge/` 提供无需 Node 的共享运行时，复用 `server/providers.mjs` 的平台数据归一化、歌单顺序、歌词及 VIP／购买／试听限制判断。网易云使用 WEAPI 签名和无 DOM 的 SVG 二维码生成；QQ 复用固定版本 QQ Music API 的 serverless 运行时。这里的 serverless 是嵌入浏览器／App 的库代码，不需要部署云函数。

| 环境 | 请求路径 | 凭证存储 |
| --- | --- | --- |
| iOS App | Web UI → 原生消息桥 → 隔离 WKContentWorld 适配器 → URLSession | Keychain，仅本设备 |
| Chrome/Edge Web | Pages → 内容脚本 → 扩展后台适配器 → 平台 HTTPS | 扩展本地存储，仅可信扩展上下文可访问 |
| 开发／已有自托管部署 | 原有 HTTP 服务 | 原有后端 vault |

App 自动初始化服务，不监听 HTTP 端口。网页不接收平台 Cookie 或 QQ 密封会话，只持有 ReiPod 的不透明会话标识。登录二维码仍在 ReiPod 内显示，由用户用平台 App 扫码确认；这里尚未实现跳转平台官网登录并复用浏览器 Cookie 的方式。

HTTPS 网页在没有显式 `VITE_MUSIC_API_URL` 时使用扩展；现有 HTTP 本地开发与显式构建配置继续使用原有服务。原生 App 优先使用内置桥。扩展未安装或未启用时，页面提示安装扩展；不会自动改请求 localhost。

## 默认分发：半自动安装

Edge 开发者注册受阻后，当前采用无需商店的半自动方案。进入第三方账号页、检测不到扩展时，通过转轮选择“下载扩展安装助手”，打开同站点 `extension-install.html`。Mac 用户下载助手后在终端运行；助手将固定版本 ZIP 下载至临时目录，校验 SHA-256 后解压到 `~/Library/Application Support/ReiPod/MusicBridge`，打开 Finder 和可用的浏览器扩展管理页。用户仍需手动开启开发者模式并确认加载。Windows 等平台提供 ZIP 和手动步骤；不会声称自动安装成功。

助手不要求管理员权限、不修改浏览器策略或配置、不关闭浏览器。已有目录更新前移为备份。页面不执行下载脚本，浏览器安装权限保持由用户控制。

`npm run build` 同时构建扩展并生成下载文件、校验清单和安装页面；产物仅位于忽略的 `dist/`。发布 ZIP 仅匹配正式 ReiPod Pages，开发版 `.local/extension/` 仍支持 localhost。图标来自项目已有 SVG。安装后刷新 ReiPod，再选择扫码登录完成真实扩展检测；没有添加伪造的成功标志。

## 构建和使用扩展

```sh
npm ci
npm run bridge:build
```

开发版产物位于忽略的 `.local/extension/`。在 Chrome 的“管理扩展程序”或 Edge 的“扩展”页面启用开发者模式，选择“加载已解压的扩展程序”，加载该目录。刷新 ReiPod Pages，进入设置 → 音乐服务 → 网易云音乐／QQ 音乐，再选择扫码登录。不需要运行 `npm run music:serve`。

此为开发者加载方式，尚未上架扩展商店，也未做 Safari 扩展打包。内容脚本仅匹配 `https://a-asuka-a.github.io/ReiPod/*` 与本地开发页；自定义站点需要修改清单与后台的来源检查后重新构建。新版本构建后需在扩展管理页重新加载，再刷新网页。

扩展申请平台 HTTPS 主机权限、存储、请求头规则及响应头观察权限。它使用自己的登录会话，不读取用户已登录浏览器的 Cookie 存储。临时请求头规则限定扩展发起者和完整目标 URL，并在请求结束后清理。跨域和头部能力参考 [Chrome 网络请求](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)、[declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) 与 [webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest)。

## 构建 iOS App

```sh
npm ci
npm run ios:prepare
cd ios
xcodegen generate
open ReiPod.xcodeproj
```

`ios:prepare` 会生成内置 `music-runtime.js` 及依赖许可文件，再随 Web 资源一起打包。安装步骤与系统音乐权限说明见 [ios/README.md](ios/README.md)。已有 Apple 系统音乐桥保持独立；网易云与 QQ 使用内置网络服务，不经过 Apple Music 授权。

原生消息只接受 `reipod-app://bundle` 主文档。凭证存取和网络处理器仅注册在隔离脚本环境，页面无法直接调用。网络目标使用明确的 HTTPS 主机白名单；重定向交回适配器逐跳处理，不自动跟随到未授权目标。

当前仓库没有桌面 App 壳，尚未增加桌面安装包或 Node 子进程管理器；桌面内嵌 Node 的产品方向保留，不能把 iOS 构建当成桌面实现。

## 验证范围

- 单测覆盖签名协议向量、无 DOM 二维码生成、平台隔离、恢复、重复轮询、取消登录时迟到的会话撤销、无凭证不冒充登录、动作及目标白名单。
- 扩展浏览器测试加载实际产物，检查消息、来源与操作限制、替身二维码及缺少真实会话 Cookie 时拒绝授权。平台替身不是实际登录证据。
- 开发机匿名网络检查：Chrome 扩展成功从网易云与 QQ 获取二维码；未扫码，没有验证真实账号或会员播放。
- iOS App 与测试目标通过无签名编译；开发机没有可用 iPhone 模拟器。macOS WebKit 冒烟验证自定义协议、隔离世界运行时启动、Web Crypto 及内部处理器不向页面暴露，不能代替 iPhone 验收。
- 待实测：两平台真实扫码确认、App／扩展重启后恢复、私人歌单、完整播放及会员权限、歌词、退出撤销；iPhone 另验锁屏、后台、音频打断和返回前台。

主要检查命令：`npm test`、`npm run test:music-server`、`npm run test:browser`、`node scripts/check-dist.mjs`、`npm run size`。生成扩展与 iOS Web 资源均保持忽略；不提交真实账号凭证、二维码、录屏或构建产物。

## 来源与依赖

网易云协议参照 [api-enhanced 4.41.1](https://www.npmjs.com/package/@neteasecloudmusicapienhanced/api/v/4.41.1) 的 `module/`、`util/crypto.js`（MIT）；签名测试向量记录该版本及固定的公开测试输入。没有复制其 Node 请求层、解锁或替代音源功能。

QQ 适配器固定使用 [QQ Music API 3.3.5](https://www.npmjs.com/package/@yakult-green-tea/qq-music-api/v/3.3.5) 的 serverless 导出。CryptoJS 4.2.0、qrcode 1.5.4 仅进入内置／扩展运行时，不进入 Pages 主应用包；构建脚本随产物附带库的许可和 QQ 项目贡献来源说明。
