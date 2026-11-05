# ReiPod iPhone App

这是一层很薄的 iOS 原生容器，复用项目的 React/CSS 界面。系统音乐通过 `MediaPlayer` 的 `MPMediaLibrary`、`MPMediaQuery` 和 `MPMusicPlayerController.systemMusicPlayer` 读取、控制；不需要网页 MusicKit 的开发者 JWT，也不会把歌曲音频解密或转交给网页。

## 网易云音乐与 QQ 音乐

App 已接入内置网络服务：Web UI 通过原生消息桥调用隔离脚本环境中的平台适配器，再由 URLSession 请求平台，用户无需启动本机 HTTP 后端。平台凭证保存在 Keychain，网页只持有不透明会话标识。此路线与下面的 Apple 系统音乐授权独立。

运行 `npm run ios:prepare` 会同时生成服务运行时和许可文件。实现、原生运行时构建和验收边界见 [MUSIC_BRIDGE.md](../MUSIC_BRIDGE.md)。目前已编译并验证部分隔离边界，真实第三方账号、会员播放和 iPhone 后台能力仍需实测。

## 在你的 Mac 上安装

需要 Xcode、Node.js 22.12+ 和一台 iOS 17+ 的 iPhone。若使用免费 Personal Team，只是个人设备调试签名，存在有效期和设备数量限制；它不是 App Store 分发，也不保证所有账号、地区及系统版本的云端歌曲都能播放。Apple Music 账号和订阅仍由系统“音乐”App 管理。

在 Mac 终端进入仓库后：

```sh
npm ci
npm run ios:prepare
brew install xcodegen
cd ios
xcodegen generate
open ReiPod.xcodeproj
```

如果没有 Homebrew，可按 [XcodeGen 官方说明](https://github.com/yonaskolb/XcodeGen) 安装它。`Web/` 是从检查过的 `dist/` 复制的生成资源，不提交 Git；每次修改网页后重新运行 `npm run ios:prepare`，无需每次重新生成 Xcode 工程。

在 Xcode 中：

1. 在 **Xcode → Settings → Apple Accounts** 登录个人 Apple 账号。
2. 选择 **ReiPod target → Signing & Capabilities**，启用自动签名并选择你的 Team。把 Bundle Identifier 改成自己的唯一值，例如 `com.yourname.reipod`。
3. 连接并解锁 iPhone，在运行设备中选择它。按 Xcode 提示完成信任、设备准备和 Developer Mode 设置。
4. 点击 Run。在 App 内选择 **音乐 → 连接系统音乐 → 允许访问音乐资料库**，接受系统弹窗。

若安装成功但首次启动提示“未受信任的开发者”，在 iPhone 的 **设置 → 通用 → VPN 与设备管理** 中找到自己的开发者账号并信任，按系统提示完成验证或重启后再打开 App。免费 Personal Team 的开发描述文件有效期为 7 天，到期后使用同一账号和 Bundle Identifier 重新构建安装。

拒绝权限后，界面提供 **打开系统设置**。原生“断开系统音乐”只断开 ReiPod 的连接，不退出手机的 Apple 账号，也不撤销 iOS 权限；权限在系统设置里管理。

参考：[Apple 的设备运行说明](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)、[免费个人开发账号限制](https://developer.apple.com/help/account/basics/about-your-developer-account)。

## 实现范围

- 显示系统音乐资料库、系统已有歌单，保留歌单的歌曲顺序。
- 系统授权恢复，不在网页中保存 Apple ID 密码或 Music User Token。
- 把选中的完整队列交给 iOS，支持播放、暂停、切歌、进度、随机/重复。系统接管后台播放；网页重新激活时读取当前真实状态，不重新开始旧歌。
- 系统输出音量通过 iPhone 侧键调整。
- 搜索只检索已读取的系统资料库。当前没有接入原生全网目录搜索、账号订阅购买、歌单写入或歌词服务。
- “本地音乐”单独存放通过 ReiPod 文件选择器导入的音频。系统“音乐”App 同步进来的音乐仍属于系统资料库。

公开 API 不能读取任意正在播放的完整系统队列。ReiPod 保存自己交给系统的队列；若不是它设置的队列，只显示可确认的当前歌曲，不能冒充完整的系统 Up Next。

## iPhone 系统播客（POD01）

新版原生 App 在启动时即检查系统权限并独立预取播客，不等待歌曲和歌单，也不改变当前选择的网易云/QQ/本地音乐来源。已有权限时进入 **播客** 直接显示预取的节目，节目是默认焦点；首批数据可先显示/播放，剩余分页继续读取。已读列表只保留在当前会话内，后台刷新时继续显示和播放，结果完成后再替换，不在未确认权限时恢复旧账户的持久列表。

尚未授权时，首次进入播客只出现 iOS 必需的媒体资料库权限弹窗，无 ReiPod 连接确认。首批查询尚未返回时显示被动读取行，重复 Center 不执行外部动作。首次授权/尚无数据不承诺零等待。授权撤销或主动断开会清空系统播客会话；迟到查询不能恢复旧数据。

**刷新系统播客、打开 Apple 播客和权限处理** 集中在 **设置 → ReiPod 设置 → 播客设置**，不占据节目列表顶部。默认入口只显示系统节目；“导入播客…”与“本地 · 节目名”都在播客设置中，本地导入不会混进系统节目选择。空库/失败有明确说明并可进入设置。手动刷新首分页显式失效 Swift 播客缓存，后续页沿用同一批查询；前台恢复和资料库变更自动更新。读取期间新到的变更合并为一次后续强制查询。系统当前播放状态也先于歌曲库分页恢复，选择正在播放的单集保留真实位置。

节目与单集按系统节目 ID 分组，不混入歌曲/专辑或本地导入。选中的节目队列交给现有系统播放器，复用暂停、切集、定位和前台状态恢复；选择单集时使用系统返回的书签，后台更新保留当前单集的已确认位置。系统音乐和播客共用媒体权限，音乐账户页的“断开系统音乐”也会断开播客。

依据 Apple 的 [MPMediaQuery.podcasts()](https://developer.apple.com/documentation/mediaplayer/mpmediaquery/podcasts%28%29)、[Media Player](https://developer.apple.com/documentation/mediaplayer/) 与 [书签属性](https://developer.apple.com/documentation/mediaplayer/mpmediaitempropertybookmarktime)，这里读取的只是系统媒体资料库向第三方公开的已下载音频播客。它不提供 Podcasts App 的完整关注/付费订阅、云端目录或跨设备进度接口；**不能保证“播客”App 下载的每一集都能被该查询返回**。无结果时明确提示“系统未提供已下载播客”，可继续导入本地文件。

**打开 Apple 播客** 通过原生桥打开固定的 `podcasts://` 目的地，允许在系统 App 内继续浏览/播放；失败会显示提示。没有接受页面传入的 URL，也不代表 ReiPod 能控制该 App 或读取其完整队列。普通网页、PWA 与没有播客能力标志的旧容器不显示这些原生入口。旧容器的音乐查询保持原协议；只有新版容器会发出播客查询。

本轮完成资源生成与无签名 iPhone 编译，JS/浏览器测试使用替身。真实设备仍须逐项核对：授权/拒绝/撤销、系统已下载节目实际可见范围、封面与书签、完整队列与切集、后台/锁屏、外部切换及重新打开，以及已安装/已卸载 Apple 播客时的唤起结果。编译与模拟结果均不计作这些项目通过。

### 任务59工程回归

POD03已补显式原生缓存失效和变更合并；POD04已移除节目页外部动作，读取行保留焦点且Center无副作用。浏览器使用可控的慢歌曲库、慢后续播客分页、后台更新和真实状态快照替身检查这些契约；实际iPhone新增/删除节目、跨App控制及后台/锁屏仍归POD02，不能由替身证明。

## 安全边界

网页资源随 App 打包在 `Web/`，由 `reipod-app://bundle/` 提供。桥接只接受该来源的主文档消息；外部导航和 iframe 不会获得音乐权限。封面在本机通过 `reipod-artwork://library/` 读取，不上传。

歌曲和歌单 ID 从 Swift 到 JS 全程使用字符串，避免 64 位 ID 超过 JS 安全整数范围后选错歌曲。系统读取、队列控制及状态通知在主线程执行。

## 验证

工作流 **Check iPhone native shell** 会在 macOS 上生成工程、不签名编译 iPhone target，并在模拟器运行边界测试和 WebKit 资源/存储/桥接冒烟测试。网页测试使用原生桥接替身验证权限、分页、完整队列、系统切歌同步、刷新恢复和本地音乐隔离。

模拟器构建使用 iOS 18.4+ 的最低目标，规避 [Apple 已确认的 Xcode 16.4 / iOS 18.5 WebKit 动态库缺失问题](https://developer.apple.com/forums/thread/785964)；真机最低版本仍为 iOS 17。

这些检查无法代替 iPhone 实测。请在真机确认：允许/拒绝权限、云端与下载歌曲、锁屏/后台连续切歌、系统音乐 App 外部切歌、来电或耳机打断、重新打开 App、系统设置撤销权限。模拟器没有你的真实音乐资料库。

### 真机验收顺序

先在系统“音乐”App 确认相同账号的歌曲能播放，并准备一个至少有 3 首歌的已有歌单，其中包括已下载歌曲和云端歌曲。

1. **授权与资料库**：连接系统音乐并允许访问，对照系统“音乐”App 检查歌曲标题、艺人、专辑及资料库搜索；不应要求输入网页开发者 Token。
2. **歌单与封面**：打开上述歌单，对照歌曲顺序；从中间一首开始播放，检查列表、正在播放和 Cover Flow 的封面。
3. **播放控制**：验证暂停/继续、上一首/下一首、进度调整、随机和重复；同时确认系统“音乐”App 中的实际播放内容一致。
4. **后台与锁屏**：回到主屏幕后锁屏，至少等待一次自然切歌，再使用锁屏控制切歌；返回 ReiPod 后，歌曲、播放状态和进度应与系统一致，不应重放旧歌。
5. **外部切歌与恢复**：在系统“音乐”App 改播另一首歌，再回 ReiPod；关闭并重新打开 ReiPod，确认它读取当前播放状态。系统外部设置的完整队列不能由公开 API 读取。

记录每项的实际结果；构建通过、安装成功或前台能播放，均不代表后台播放已经通过。出现问题时保留 iOS 版本、复现步骤、是否为云端歌曲及 Xcode 错误日志。
