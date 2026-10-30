# ReiPod

[English](README.md) · [简体中文](README.zh-CN.md) · [开发总纲](DEVELOPMENT.md) · [项目结构](PROJECT_STRUCTURE.md) · [任务日志](TASK_LOG.md)

**转动转轮，听见你的音乐。**

面向网页与 iPhone 的经典风格音乐播放器。用 Cover Flow 浏览专辑，建立本地资料库、跟随歌词，或连接音乐服务——通过转轮与按键完成操作。

[在线体验](https://a-asuka-a.github.io/ReiPod/) · [安装到 iPhone](ios/README.md) · [音乐服务配置](MUSIC_SERVICES.md)

## 界面预览

|                                        资料库与菜单                                         |                                           Cover Flow                                           |                                                    正在播放                                                    |
| :-----------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------: |
| <img src="assets/screenshots/home.png" alt="ReiPod 主菜单、专辑封面与银色转轮" width="260"> | <img src="assets/screenshots/cover-flow.png" alt="ReiPod Cover Flow 专辑浏览界面" width="260"> | <img src="assets/screenshots/now-playing.png" alt="ReiPod 正在播放页面，显示封面、歌曲信息和进度" width="260"> |

截图来自当前网页版本，使用项目内置试听音乐。应用界面目前为简体中文；两版 README 是文档语言切换。以 2007 iPod classic 6G 为目标的实机 UI 校准仍在进行。

## 主要功能

- **带上自己的音乐。** 导入音频，读取歌曲标签和内嵌封面；按艺人、专辑、歌曲与风格浏览，搜索、收藏，并创建浏览器本地歌单。
- **用转轮浏览。** Cover Flow、上下文菜单预览、选中位置记忆、HOLD 锁定与键盘控制，让操作留在播放器内。
- **边听边看歌词。** 支持 LRC、内嵌歌词，以及通过 iOS 内置服务或 HTTPS 网易云 / QQ 后端获取歌词。长按中心键，确认首项“歌词”即可直达；设置中可开关。
- **选择音乐来源。** 连接 iPhone 系统音乐资料库、配置网页版 Apple Music，或通过 iOS 内置服务与 HTTPS 后端连接网易云和 QQ 音乐。各服务的账号会话和资料库独立；VIP / 付费标记与播放错误提示说明访问限制。
- **调整自己的播放器。** 银色或黑色机身、明暗背景、随机与重复播放、评分、背光及转轮声音。
- **不止音乐。** 本地相册与幻灯片、可记忆进度的播客导入，以及保存阅读位置的文本阅读器。

## 音乐来源

| 来源             | 所需条件                                             | 当前范围                                                                      |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| 本地文件         | 支持的浏览器，无需账号或后端                         | 导入、封面、歌单与播放；数据保存在当前浏览器                                  |
| iPhone 系统音乐  | 原生容器、iOS 授权，以及系统“音乐”App 中可播放的歌曲 | 通过 MediaPlayer 读取资料库、已有歌单并控制播放；无需网页 MusicKit 开发者凭证 |
| 网页 Apple Music | 站点自己的 MusicKit 开发者配置，以及用户授权         | 已实现资料库 / 目录接入；生产凭证与真实账号 DRM 验证待完成                    |
| 网易云音乐       | iOS 内置服务或 HTTPS 后端与扫码登录                  | VPS 已验证二维码生成；VPS 真实账号登录与播放待验证                           |
| QQ 音乐          | iOS 内置服务或 HTTPS 后端，通过 QQ / 微信扫码        | VPS 已验证二维码生成；真实账号登录和播放待验证                               |

**GitHub Pages 只托管静态播放器。** 网易云 / QQ 网页默认连接维护者的 HTTPS 后端；iOS App 使用内置网络桥，浏览器扩展已废除。仍保留开发自托管，推送仓库不会自动部署后端。接入使用社区接口，歌曲可用性仍受账号权限、地区与平台状态影响，不提供替代音源解锁。详见[配置和验证边界](MUSIC_SERVICES.md)。

## 开始使用

打开[网页版](https://a-asuka-a.github.io/ReiPod/)，播放内置试听曲目，或通过 **音乐 → 导入音乐** 选择自己的文件。建议使用 MP3、AAC/M4A 或 PCM WAV；实际解码能力取决于浏览器。

LCD 仅用于显示，请通过转轮和按键操作：

| 控制                  | 操作                                                         |
| --------------------- | ------------------------------------------------------------ |
| 转轮 / ↑ ↓            | 选择菜单项，或调整当前播放控件                               |
| 中心键 / Enter        | 确认；播放页依次切换封面 → 进度定位 → 随机 → 评分 → 可用歌词 |
| MENU / Escape         | 返回；长按 MENU 回主菜单，键盘可按 Home                      |
| 播放 / 暂停键 / Space | 播放或暂停                                                   |
| 上一首 / 下一首 / ← → | 切歌；长按快进或快退                                         |
| 长按中心键            | 打开歌曲选项；歌词可用或可请求时默认选中首项“歌词”           |
| HOLD 开关             | 锁定输入，音乐继续播放                                       |

iPhone 系统音量通过侧键调整。歌词阅读视图可在返回菜单或队列切歌后保留；临时进度定位、随机与评分面板会复位。详见[播放状态约定](PLAYBACK_INTERACTIONS.md)与[完整操作手册（英文）](USER_GUIDE.md)。

本地导入、设置和歌单保存在浏览器中；清除网站数据或存储被回收可能导致丢失，请保留原文件。网页版不保证后台与锁屏播放；原生系统音乐路线由 iOS 接管播放。

## 本地运行

完整配置建议使用 **Node.js 24**，仅运行网页可使用 22.12 及以上版本。

```sh
npm ci
npm run dev
```

启用可选网易云 / QQ 后端：

```sh
npm --prefix server ci --ignore-scripts
npm run build
npm run music:serve
```

打开 `http://127.0.0.1:3210/`，进入 **设置 → 音乐服务**。后端默认仅监听本机；公网网页与 iPhone 使用时需部署 HTTPS 后端并明确允许来源，配置见 [MUSIC_SERVICES.md](MUSIC_SERVICES.md)。

iPhone 安装请参照 [Mac / Xcode 指南](ios/README.md)。可使用免费 Personal Team 在个人设备上调试签名；当前并非 App Store 发行版。

## 开发

网页使用 React、TypeScript 与 Vite。iPhone 通过轻量 WKWebView / MediaPlayer 容器复用界面；可选音乐后端独立运行。

```sh
npm test
npm run test:music-server
npm run build
node scripts/check-dist.mjs
npm run size
```

浏览器回归测试：

```sh
npx playwright install chromium
npm run test:browser
```

推送到 `main` 后，GitHub Actions 会构建并部署静态站点。UI 开发以实机证据为先，已有 CSS 数值与测试通过不等于实机还原准确。

| 文档                                                      | 用途                                |
| --------------------------------------------------------- | ----------------------------------- |
| [操作手册（英文）](USER_GUIDE.md)                         | 详细浏览、按键、导入与存储行为      |
| [音乐服务](MUSIC_SERVICES.md)                             | 配置、凭证、后端部署与验证范围      |
| [iPhone App](ios/README.md)                               | 原生构建、安装与真机检查            |
| [UI 开发规范](UI_STANDARDS.md)                            | 证据分级、测量与视觉验收            |
| [硬件研究](HARDWARE_RESEARCH.md) · [复刻记录](REPLICA.md) | 资料来源、机型 / 版本边界与暂定参数 |
| [播放交互](PLAYBACK_INTERACTIONS.md)                      | 中心键顺序、歌词快捷入口与状态恢复  |
| [开发约定](AGENTS.md)                                     | 仓库规则与验证要求                  |

## 致谢

转轮几何参考自 [iPod.js](https://github.com/tvillarete/ipod-classic-js)，音频标签解析使用 [music-metadata](https://github.com/Borewit/music-metadata)，字体使用可再分发的 Noto Sans SC 子集。内置试听曲目 **Carefree**、**Monkeys Spinning Monkeys**、**Sneaky Snitch** 由 Kevin MacLeod 创作，采用 CC BY 4.0 授权；封面为 ReiPod 原创插画。完整归属与许可证见[第三方声明](THIRD_PARTY_NOTICES.md)及应用内版权页面。

ReiPod 是独立项目，与 Apple、网易或腾讯无隶属关系。相关名称与商标归其各自权利人所有。
