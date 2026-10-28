# ReiPod iPhone App

这是一层很薄的 iOS 原生容器，复用项目的 React/CSS 界面。系统音乐通过 `MediaPlayer` 的 `MPMediaLibrary`、`MPMediaQuery` 和 `MPMusicPlayerController.systemMusicPlayer` 读取、控制；不需要网页 MusicKit 的开发者 JWT，也不会把歌曲音频解密或转交给网页。

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

## 安全边界

网页资源随 App 打包在 `Web/`，由 `reipod-app://bundle/` 提供。桥接只接受该来源的主文档消息；外部导航和 iframe 不会获得音乐权限。封面在本机通过 `reipod-artwork://library/` 读取，不上传。

歌曲和歌单 ID 从 Swift 到 JS 全程使用字符串，避免 64 位 ID 超过 JS 安全整数范围后选错歌曲。系统读取、队列控制及状态通知在主线程执行。

## 验证

工作流 **Check iPhone native shell** 会在 macOS 上生成工程、不签名编译 iPhone target，并在模拟器运行边界测试和 WebKit 资源/存储/桥接冒烟测试。网页测试使用原生桥接替身验证权限、分页、完整队列、系统切歌同步、刷新恢复和本地音乐隔离。

模拟器构建使用 iOS 18.4+ 的最低目标，规避 [Apple 已确认的 Xcode 16.4 / iOS 18.5 WebKit 动态库缺失问题](https://developer.apple.com/forums/thread/785964)；真机最低版本仍为 iOS 17。

这些检查无法代替 iPhone 实测。请在真机确认：允许/拒绝权限、云端与下载歌曲、锁屏/后台连续切歌、系统音乐 App 外部切歌、来电或耳机打断、重新打开 App、系统设置撤销权限。模拟器没有你的真实音乐资料库。
