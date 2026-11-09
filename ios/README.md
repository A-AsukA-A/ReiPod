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

## iPhone 系统相册（PHOTO01）

在新版原生App中进入 **照片**，直接由PhotoKit读取系统相册和照片；首次仅出现iOS照片访问弹窗。支持系统的全部/有限照片授权，拒绝后可在 **设置 → ReiPod 设置 → 照片设置** 打开系统设置，有限授权可选择更多可访问照片。只列有授权图像的相册，排除隐藏相册和视频；iCloud图片由系统按需提供，网络失败不代表已在本机下载完整原图。

相册行显示缩略图/名称/数量，Center打开选定相册的5×3缩略图视图，再次Center查看单图；转轮/前后键选图，MENU返回原范围，播放键沿用幻灯片。相册名成为缩略图页标题，日期使用系统提供的拍摄日期。本地导入继续使用文件修改日期，不能冒充拍摄日期。系统照片选项只提供浏览/幻灯片，不提供删除；不会修改系统照片。

**导入照片… / 导入相册文件夹…** 唯一入口集中在照片设置；iPhone旧的导入副本可从这里的 **本地 · 已导入照片** 继续查看，网页则继续在照片主列表查看导入相册。照片和播客浏览页不混入导入动作。播客的文件导入仍统一在播客设置。

原生桥 `reipodPhotos` 仅接受打包主文档，能力标志为 `__REIPOD_NATIVE_PHOTOS_VERSION__`。相册/图像只在会话内用不透明句柄索引，不给页面原始PhotoKit标识、任意文件路径或网络代理。`reipod-photo://library/<opaque-handle>` 只提供固定thumb/full规格的JPEG；缩略图240px、大图1600px为ReiPod资源适配上限，不是原机UI尺寸。原生在每次图像请求/完成时检查权限与库代际，取消WK请求后不再回写；元数据每页最多100项、页面仅渲染附近最多100张缩略图，切换范围/撤销后迟到分页不能恢复旧内容。图片不复制进网页IndexedDB或上传服务器；本地导入副本保持原存储方式。

依据：[PhotoKit授权](https://developer.apple.com/documentation/photokit/phphotolibrary/requestauthorization(for:handler:))、[有限照片访问](https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app)、[按需图像请求](https://developer.apple.com/documentation/photokit/phimagemanager/requestimage(for:targetsize:contentmode:options:resulthandler:))。照片权限与音乐账户独立，进入相册不改变音乐/播客队列、账号或后台播放会话。

### 2026-11-05 / 任务71实际验收

- iPhone17 Pro / iOS27.3：当前资源与签名构建/严格校验/同Bundle ID更新安装通过；解锁后在物理设备实际执行8项Swift Testing（2组、0失败）通过，含照片句柄URL/无写命令和真实WebKit桥status冒烟。
- 用户实际进入照片并授权后确认系统相册、缩略图、单张照片全部正常；确认照片浏览页无导入按钮。用户另确认播客全宽封面列表/单集数量/播放/返回正常。未记录用户所选授权范围类型，不能将本轮写成真实有限权限/拒绝撤销均通过。
- 260项单元、35项服务端、127项完整浏览器、player-core/ios:prepare/dist/size通过。浏览器替身另覆盖有限权限/撤销/迟到分页/350图相册/仅附近100图渲染，以及浏览照片时本地音乐持续进度；不计真机边界验收。
- 待验PHOTO02：真实有限访问增减、拒绝/撤销、相册增删/照片变更、仅iCloud内容与离线失败；原机完整幻灯片设置、字体、精确像素与固件时序继续O03/C-F08。证据见UI_METRICS任务71，私有截图/日志在`.local/photos-71/`，不发布个人图片。

## iPhone布局、触觉与性能（任务72）

宿主WKWebView覆盖完整视图，SwiftUI容器允许背景延伸到屏幕边缘；原生视图、网页和滚动底层均清除固定底色。窗口安全区通过`--host-safe-*`传入CSS，转轮/机身按宽高约束缩放，刘海与底部横条不遮挡控制。透明指播放器外侧不绘制固定底色，页面自身仍可选择浅/深色背景；截图通常由显示器以白色合成透明区域，不将其误报为壁纸透视。

`reipodExperience`仅接受打包主文档的`press`/`step`及固定字段的`appearance`消息；后者仅同步三种背景与常亮布尔值，不接受URL或账户字段。按下用UIKit轻触，转轮移动用选择反馈，松手不重复震动；前后端均节流，后台和HOLD不产生反馈。**设置 → ReiPod设置 → 触觉反馈**独立保存开关，即使关闭转轮声音也能使用；网页未声明此原生能力时不显示原生开关，不宣称普通Safari有相同触觉能力。[Apple选择反馈](https://developer.apple.com/documentation/uikit/uiselectionfeedbackgenerator)、[预备触觉引擎](https://developer.apple.com/documentation/uikit/uifeedbackgenerator/prepare())。

主页焦点「照片」时，已有授权会调用只读`preview`按时间倒序先取最近8张，批内随机且已显示项在本批内不重复；连续可见停留约10秒后再取更早的下一批8张，直到末批保持轮播。离开焦点/休眠/后台后从最近一批重新开始；单图保持，减弱动态/休眠/不可见时停止轮换。主页不调用authorize，不读取全部照片元数据；需要授权时仍进入照片页。预览与音乐/播客来源隔离，离开焦点取消预取，撤销/库变更清图并重新检查权限。网页使用本地导入照片的最多8项样本。

PhotoKit按`creationDate`倒序查询，相册封面也取最新照片；本地导入按文件修改日期倒序，不伪造缺失的拍摄日期。前端只读当前与相邻页（每页100项、最多3页元数据）并渲染最多100缩略图；相册快照与JPEG会话缓存避免重复生成，JPEG缓存预算12MiB/120条，内存告警/资料库失效清理，命中缓存前仍检查权限与可访问资产。系统照片不持久化到网页，也不上传。长菜单只渲染焦点附近最多40行，从最终计算样式实测行高作为空白占位，不另造固件行高。照片快速切换保留旧图直到新图解码，复用已加载DOM节点直接替换；最多同时两层图，迟到加载不能覆盖新选择，撤销权限立即清图。避免重复克隆照片退场树和卸载旧图造成短暂黑屏。

高刷新率：Info.plist设置`CADisableMinimumFrameDurationOnPhone=true`，按[Apple公开配置](https://developer.apple.com/documentation/quartzcore/optimizing-iphone-and-ipad-apps-to-support-promotion-displays)开放应用高刷新率资格；不运行无用的常驻显示定时器来伪造帧率。当前物理iPhone17 Pro/iOS27.3、低电量关闭、硬件上限120Hz，WebKit动画期120次rAF间隔中位/p95均17ms，约59fps。此结果不代表显示面板实际扫描率，也不能证明网页120fps；[WebKit问题294338](https://bugs.webkit.org/show_bug.cgi?id=294338)仍为NEW，当前SDK公开WKPreferences未提供对应帧率开关。APP02保留未完成，需可用公开平台能力或原生呈现路径并重新实测，不能改私有偏好后宣称已交付。

## 实现范围

- 显示系统音乐资料库、系统已有歌单，保留歌单的歌曲顺序。
- 系统授权恢复，不在网页中保存 Apple ID 密码或 Music User Token。
- 把选中的完整队列交给 iOS，支持播放、暂停、切歌、进度、随机/重复。系统接管后台播放；网页重新激活时读取当前真实状态，不重新开始旧歌。
- 系统输出音量通过 iPhone 侧键调整。
- 搜索只检索已读取的系统资料库。当前没有接入原生全网目录搜索、账号订阅购买、歌单写入或歌词服务。
- “本地音乐”单独存放通过 ReiPod 文件选择器导入的音频。系统“音乐”App 同步进来的音乐仍属于系统资料库。

任务67：新原生容器返回系统曲目的`discNumber`（来源：[Apple MPMediaItem](https://developer.apple.com/documentation/mediaplayer/mpmediaitem/discnumber)），与已有`albumTrackNumber`供共享队列排序；旧容器缺碟号时按现有兼容回退处理，不能靠刷新旧容器获得新增原生字段。专辑随机在ReiPod可确认的队列内生成顺序，系统播放器继续设置为关闭系统二次随机；更新时传入当前曲/位置/暂停状态。外部系统队列不可确认时不改变模式，明确提示先在ReiPod选歌。新编译/替身通过不代表真实云端多碟专辑、后台或锁屏已通过。On-The-Go只管理ReiPod本地导入，不写系统歌单。

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


## 2026-11-05 真机验收（任务69，需求差距待解决）

基线为9682b9e（产品功能0aac8d8），iPhone 17 Pro / iOS 27.3（24C5037i），Xcode27.1，Personal Team有线调试。已生成当前Web/内置服务资源、签名校验并更新安装同一Bundle ID，未卸载。首次运行被设备的开发者信任检查拦截；用户完成信任后重试，在这台物理设备实际执行6项Swift Testing（2组、0失败）通过，随后正常启动App。证据保存在忽略目录`.local/device-69/`，不包含在发布资源中。

| 实测项 | 当前结果与依据 |
| --- | --- |
| 原生资源/桥接/存储/边界测试 | 物理设备6项通过；不是实际音乐/账号播放证明 |
| 系统播客可见范围 | 用户确认Apple播客已有下载，ReiPod显示对应节目/单集；截图可见故事FM/5集。仅限此设备本次内容，未证明完整订阅覆盖 |
| 播客前台播放/控制/返回 | 用户确认有声及进度、暂停/继续、快进、下一集、重选当前集保留位置和封面全部正常；原生日志显示5个非云端项目入队、prepareToPlay无错误 |
| 后台/锁屏/返回同步 | 用户确认回主屏幕/锁屏约30秒、锁屏暂停继续/下一集、回App状态与进度均正常；未把此结果等同自然切集 |
| 自然切集/冷启动 | 未验；用户反馈不同步不能推断冷启动结果 |
| Apple播客当前会话同步 | 用户报告与Apple播客当前播放不同步；完整Apple播客控制目标未通过 |
| 新增删除下载/权限拒绝与撤销/Apple播客唤起 | 未验 |
| 系统音乐专辑随机/云端多碟/真实第三方账号 | 未验 |

POD02/U04/U06只按上表逐项收敛；保留原有未验项，未将安装或自动测试写成完整真机验收。


### POD05：完整Apple播客接入目标与现有路线差距

本节保留任务69历史核查；任务70用户已撤回完整会话接管验收目标，采用下节的独立播放体验，不表示旧目标已由代码实现。

2026-11-05用户明确：ReiPod需要看到Apple播客里的完整播放清单，并直接调用Apple播客播放，当前播放应一致；仅读取系统公开下载项不满足目标。POD01保留为下载项播放工程能力，完整目标未完成；不把前台/锁屏通过写成Apple播客接入验收通过。

现有`NativeMusicService`使用`MPMediaQuery.podcasts()`读取公开媒体库、`MPMusicPlayerController.systemMusicPlayer`自建队列及读取状态。Apple的[systemMusicPlayer说明](https://developer.apple.com/documentation/mediaplayer/mpmusicplayercontroller/systemmusicplayer)明确其共享对象是Music App；[MPNowPlayingInfoCenter](https://developer.apple.com/documentation/mediaplayer/mpnowplayinginfocenter)用于发布本App播放信息，不提供其他App完整清单查询。因此从这些接口与代码可确定：现有路线不能实现用户要求的Apple播客会话接管。此次公开接口检索未找到完整读取Apple播客个人清单并控制其会话的原生接口；这是当前可行性结论，不声称已穷尽未公开实现。

[快捷指令URL](https://support.apple.com/guide/shortcuts/apd624386f42/ios)可以运行用户已保存的指令，仍需实测具体播客动作及返回数据，不能直接承诺完整待播队列或双向状态。[Apple官方网页版](https://podcasters.apple.com/support/5462-apple-podcasts-available-on-the-web)支持Apple Account登录后资料库、Up Next和进度，官方同时注明Safari会跳原生App；未验证WKWebView登录/同步或为ReiPod提供数据的能力，网页版播放亦非控制iPhone原生Apple播客会话。未替用户登录、提取凭证或实现这些替代路线。

任务69原接续建议为先证明完整清单/会话接口；已由任务70用户最终选择替代，现不继续此同步接管研究。


## 2026-11-05 My Classic体验与主页封面（任务70）

对照手机上My Classic3.16后，用户先判断两边同步，随后按Apple播客定位约2:00再返回My Classic的受控步骤确认不跟随，并主动纠正判断；最终明确选择ReiPod内独立播放系统可读播客、后台和锁屏控制，优先UI还原。此决定替代任务69完整个人清单/直接接管Apple播客的本轮要求；保留当前已部分真机通过的原生媒体播放路径，不通过添加跳转来冒充App内播放。

POD06：主页焦点「播客」原被错误映射为静态图标卡片，且预览仅注入音乐专辑；现注入与播客浏览菜单一致的节目集合（iPhone为系统可读节目、网页为本地导入），按节目封面随机轮换且不连续重复，单节目保持。空库显示播客说明、无图沿用封面占位；切换音乐/播客清除前一个来源的过渡图片。焦点和轮播不授权、不点播、不改变来源/队列；减少动态、休眠及页面不可见时暂停轮换。铺满裁切/缓动/淡入沿用已实现的音乐预览，参数证据与工程截图查[UI_METRICS.md](../UI_METRICS.md#2026-11-05-主页播客封面轮播pod06--任务70)。

当前Web/内置服务资源已重新生成，签名iPhone构建、严格codesign校验及同Bundle ID更新安装成功，正常App已启动。用户已在主页将焦点移到播客并停留后确认「封面已显示，表现正常」，实际截图存.local/podcast-70。此手机可见一节目时只确认真实封面/单图行为，多节目随机由浏览器fixture另验。259单元、35服务端、124完整浏览器及核心/构建/产物检查通过；此前任务69的后台/锁屏实测不重复记为本轮新增通过。未提交/部署本轮代码。

### 最近优先、冷启动和默认常亮（任务72追加）

照片预览每批8张/每图6秒/每10秒向前推进8张是用户指定体验的ReiPod适配，不是原机固件时序；减弱动态下既不换图也不推进批次。

背光默认“始终开启”。旧版未带backlightVersion的10秒默认迁移到常亮，其他时长保留；新版本手动选择10秒也会按版本标记保留。前台且未手动休眠、选择常亮时，原生通过isIdleTimerDisabled防止系统自动锁屏；后台或手动休眠释放，用户仍可侧键锁屏。网页不宣称具备同等原生常亮能力。

系统启动屏以LaunchBackground黑色底替代空白白底（匹配透明模式的iOS合成底色）；容器在第一帧布局前从UserDefaults恢复上次浅/深/透明背景，Web端改变背景后只同步该枚举和keepAwake。iOS系统启动屏是静态资源，任意自选浅/深背景不能动态写入该系统画面；此限制与网页载入期间使用上次背景的行为分开报告，不宣称所有主题启动屏完全相同。[Apple启动配置](https://developer.apple.com/documentation/bundleresources/information-property-list/uilaunchscreen)、[静态启动界面限制](https://developer.apple.com/documentation/xcode/specifying-your-apps-launch-screen/)。UserDefaults仅保存本App非敏感外观/常亮配置，PrivacyInfo按CA92.1声明；不保存媒体或服务凭证。


## iPhone电池与充电状态（BAT01 / 任务74）

App优先使用只读`reipodBattery`桥与`__REIPOD_NATIVE_BATTERY_VERSION__=1`，不依赖Safari/WKWebView的网页电池接口。仅打包主文档可发送version1/status，返回0…1电量及charging布尔值，不含设备标识、账户、URL或持久化电池记录。原生开启UIDevice电池监测，监听电量/供电变更；满电且接通电源也显示闪电。未知状态/负数/非有限值不伪造百分比或充电状态，沿用无读数占位。

回到前台、页面恢复/焦点回归都会重新读取；退出可见状态/后台停止监测并恢复此前监测设置，没有定时轮询或额外授权。客户端丢弃晚于新事件返回的旧快照；原有普通网页BatteryManager事件/恢复/失败重试继续保留，网页不据此获得原生能力。此为宿主状态同步，不改变iPod图标几何、音乐来源、队列或播放。

依据：[Apple电量/未知值](https://developer.apple.com/documentation/uikit/uidevice/batterylevel)、[监测开关](https://developer.apple.com/documentation/uikit/uidevice/isbatterymonitoringenabled)、[电池状态变化通知](https://developer.apple.com/documentation/uikit/uidevice/batterystatedidchangenotification)。2026-11-06实际iPhone17 Pro/iOS27.3测试返回电量1、接通电源true，而navigator.getBattery不可用；11项Swift真机测试通过，包含真实桥读取与状态栏标志对照。签名更新安装后用户实际拔插充电线确认「正常」，记录见TASK_LOG任务74。

## 2026-11-10 开发包交付（PACK95）

本轮未改原生Swift能力。使用当前未提交工作区，`npm run ios:prepare`重生成全部Web/内置服务资源，再对generic iOS device做Release archive；沿用项目版本0.2.0/build 2。安装文件为私有`.local/extras-95/ReiPod-2026-11-10-development.ipa`，不纳入版本库。使用本机已有Apple Development身份和已安装的Xcode管理profile签名，无上传或自动续签；仅登记设备适用。当前profile到期2026-11-12 12:52:04 UTC（北京时间20:52:04），开发包不是长期分发版。

验收边界：archive/codesign严格验证、IPA压缩完整性、App/Web与本轮dist逐文件哈希对应；包清单与SHA256保存在同目录install-manifest.json。此次未安装/连接手机、未运行新真机测试，也未验证真实账户/权限/锁屏/后台或系统照片边界；已有真机结论不升级。精确字体和新增附加功能原机几何仍P/U，见UI_METRICS任务95。

## 2026-11-10 连接设备更新（REL98）

用户明确要求更新已连接iPhone。检测到配对可用的物理iPhone17 Pro后，重新严格校验任务95的Release签名App，55份App/Web文件与当时dist逐文件SHA一致、profile包含当前设备且仍有效；功能代码对应3954076，此后提交只有任务日志。使用该已验证产物更新，不为仅提交标识变化重复编译。

通过devicectl对com.reipod.player作覆盖安装，未先卸载、清理容器或改系统授权；正常启动成功，设备安装清单确认0.2.0/build2、新应用安装路径，进程列表确认ReiPod运行。证据在私有`.local/release-98/`的install/launch/installed-apps/processes与iphone-verification.json。没有读取/导出个人媒体或平台凭证。没有新增真实账户、后台/锁屏、冷启动/常亮、权限边界或新附加功能的实机验收，原开放项保留。

沿用Apple Development/Personal Team签名，当前profile仍到2026-11-12 12:52:04 UTC（北京时间20:52:04）；需要到期前续签，非长期分发版。VPS及Pages同步3954076；Pages流程42658164246成功，但云端iPhone流程42658164245本轮结束前仍queued，不将实际安装成功混同该流程通过。
