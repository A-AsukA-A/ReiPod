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
