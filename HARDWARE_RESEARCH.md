# iPod classic 实机、系统与动画依据

核查日期：2026-10-27。全系列模拟范围见下节；本文已有研究集中于 Apple 原版 iPod classic。My Classic 和 iPod.js 是比较样本，不能覆盖原机证据。当前机身和菜单基线为 2007 Classic 6G；资料中 6G、120 GB、7G 及不同固件的结论分开使用。

## 已取得的原版固件

从 [Apple 服务器](https://secure-appldnld.apple.com/iPod/SBML/osx/bundles/061-4306.20080430.Gtr54/iPod_24.1.1.2.ipsw) 下载了 Classic 6G 的 **1.1.2** 更新包，只保存在忽略目录 `.local/retailos-research/`，不进入网站或公开仓库。

- 文件：`iPod_24.1.1.2.ipsw`，60,444,886 字节。
- SHA-1：`797fae12a97442a82fc5b078228c821bfdd1ffed`，与 [The Apple Wiki 固件目录](https://theapplewiki.com/wiki/Firmware/iPod#iPod_classic) 一致。
- ZIP 内实际文件：`manifest.plist` 与 `Firmware-24.9.1.2`。不能从内部文件名猜测对外版本号。
- manifest：UpdaterFamilyID 24，FamilyID 11，BuildID 152207360，VisibleBuildID 17989632。
- 实际 `!ATA` 分区表位于 **0x5000**，不是所读社区通用说明中的 0x4000。头中的 0x4000 不是可直接当作绝对表位置使用的充分证据。
- 实际分区：RSRC 0x6000 / 81,788,928 字节；OSOS 0x4e07000 / 9,925,603 字节；AUPD 0x5780000 / 1,165,491 字节；HASH 0x589e000 / 4,096 字节。OSOS 以 `8702` / IMG1 头开始。
- 本轮没有原机 USB 连接，没有完成 OSOS 解密，没有恢复 Apple 源码，也没有运行或刷写这份固件。分区存在不等于已经掌握内部 UI 格式。

原始检查记录：本地 `firmware-inspection.json`。第三方资料可能混用版本，后续所有偏移必须先核验输入文件的哈希。

## 全系列模拟范围与 MacDB 参考（2026-10-29）

用户确认 iPod nano、iPod mini、iPod/classic 全系列、全代际均为模拟目标，包含 classic 命名前的 iPod 主线。本文现有 2007 classic 6G 研究是当前实现基线；其他机型的证据、实现与验证进度需分别记录，不从该基线外推。

- 来源：[MacDB「历代 iPod classic 参数」](https://macdb.cn/ipod-classic)，第三方参数汇编；核查日期 2026-10-29，页面标示更新于 2026-10-10，列出 14 款设备。
- 可用范围：作为 iPod/classic 主线机型、年代、容量/颜色、机身尺寸、显示屏和接口等规格的检索入口，并沿其链接查找对应 Apple 技术文档。页面也列出 classic 命名前的 iPod，不能把页面名称理解为全部条目都采用 2007 classic 界面。
- 证据边界：汇编规格在采用前需与对应 Apple 文档核对；本次未逐项验证其参数。该页不是 nano/mini 的完整资料源，也不能证明菜单几何、字体、动画、输入方式或固件行为。固件版本未核实；本次未进行图像测量、坐标归一化或误差估计，不产生新的 UI 数值。
- 后续资料按系列 → 代际/年份 → 容量及硬件修订 → 固件组织；nano、mini 分别补充对应官方规格、手册与实机资料。不同屏幕与输入方式按各机型建立规范，不统一套用 classic 的 320 × 240、分屏或转轮操作。

## 资料目录与可用范围

| 资料                                                                                                                                                                                   | 直接用途                                               | 使用边界                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [Apple 2007 发布说明](https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/)                                                                                     | 确定金属机身、Cover Flow、产品代际                     | 没有动画毫秒数                                                                   |
| [Apple Classic 用户指南](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf)                                                                      | 操作、菜单、HOLD、封面浏览、照片和播放流程             | 是后期 160 GB 指南，不能把所有新增功能套给 2007 首版                             |
| [Apple 120 GB 用户指南](https://cdsassets.apple.com/live/6GJYWVAV/user/ma630_ipod_classic_120gb_en.pdf)                                                                                | 对照 2008 版菜单与功能差异                             | 不提供 UI 曲线                                                                   |
| [The Gadgeteer 2007 实机评测](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/)                                                                                                | 实物菜单、Music、Settings、播放页照片                  | 静态照片不能量出时长                                                             |
| [Ars Technica 2007 实测](https://arstechnica.com/gadgets/2007/09/the-ipod-gets-a-makeover-a-review-of-the-ipod-nano-and-ipod-classic/)                                                 | 原机过渡组织、导航响应的同期记录                       | 原文涉及两种设备；整体操作耗时不是单次动画时间                                   |
| [Macworld 首版评测](https://www.macworld.com/article/187329/ipodclassic.html)                                                                                                          | 同期 Cover Flow、封面读取响应                          | 迟缓可能来自读盘，不能全部做成人为延迟                                           |
| [Macworld 1.0.1 更新实测](https://www.macworld.com/article/187476/ipodclassic101.html)                                                                                                 | 证明固件升级会改变响应观感                             | 不能把 1.0 初版卡顿认定为所有 Classic 的标准                                     |
| [Geekanoids 2007 实机视频出处](https://www.geekanoids.co.uk/reviews/2007/9/12/apple-ipod-classic-first-look-video-review.html) / [原视频](https://www.youtube.com/watch?v=64_CxTW7_84) | 实机菜单与 Cover Flow 的动态参考                       | 视频未核实精确固件号；压缩、拍摄帧率限制测量精度                                 |
| [q3k 的 wInd3x 原始研究](https://q3k.org/wInd3x.html)                                                                                                                                  | 理解 BootROM、解密与实际硬件需求                       | 不是开源 RetailOS 源码，也不直接提供 UI 常量                                     |
| [freemyipod/wInd3x](https://github.com/freemyipod/wInd3x)                                                                                                                              | 官方工具 README 当前列出 Classic 的 DFU、解密支持      | 需要兼容设备；README 对 Classic 仍标 Experimental                                |
| [固件研究总目录](https://github.com/giek2000/ipod-classic-firmware-research)                                                                                                           | 分代规格、系统结构和研究入口                           | 是第三方分析；“完整”是作者描述，不等于本项目已验证                               |
| [Cover Flow 引擎研究](https://github.com/giek2000/ipod-classic-firmware-research/blob/main/architecture/COVERFLOW_ENGINE.md)                                                           | 查找事件、投影、绘制与缓存的线索                       | FPS、CPU 预算有估算成分；本文菜单入口描述与 Apple 手册有冲突，不用它覆盖官方菜单 |
| [IPSW 结构研究](https://github.com/giek2000/ipod-classic-firmware-research/blob/main/architecture/IPSW_FORMAT.md)                                                                      | ZIP、IMG1、分区类型的研究线索                          | 其 0x4000 表位置不匹配本轮取得的 6G 文件；不能直接照搬解析                       |
| [RepriseOS / OSOS Lab](https://github.com/lgreitis/osos-lab)                                                                                                                           | 原版 RetailOS 的补丁、原生 UI 资源元数据、Ghidra 注释  | 当前基于 2.0.5；补丁中的新功能不是原机默认行为；仓库不提供完整 Apple 系统        |
| [OSOS Lab 固件输入清单](https://github.com/lgreitis/osos-lab/blob/main/firmware/apple.json)                                                                                            | 根据字节数和哈希区分加密输入、解密输入                 | 有哈希清单不等于已经拥有对应明文                                                 |
| [QEMU Classic 实机系统模拟项目](https://github.com/davidmonterocrespo24/qemu-ipod-classic)                                                                                             | 可运行原版固件、观察原版绘制输出的候选工具             | 作者明确不提供固件；部分播放功能有缺陷；模拟器速度不是实机时长证据               |
| [clicky](https://github.com/daniel5151/clicky)                                                                                                                                         | RetailOS 模拟、硬件文档与调试方法                      | 当前主攻 4G 灰阶，不能用其画面校准 Classic 6G                                    |
| [Chikuma 界面研究](https://chikuma.ringum.net/architecture/ui/) / [状态](https://chikuma.ringum.net/status/)                                                                           | 原机区域表面、控制器栈、资源驱动 UI 的研究描述         | 本轮只读到了文档，未取得其完整代码或独立运行验证；状态页列有未完成功能           |
| [iPod.js 动画源码](https://github.com/tvillarete/ipod-classic-js/blob/e91d2b6b8cadf72e8a807c521f9297936a51efbb/app/animation/index.tsx)                                                | 可验证的网页实现比较：推页 300 ms，预览 400 ms         | 是复刻作者选择，不是 Apple 实机常量                                              |
| [iPod.js Cover Flow 源码](https://github.com/tvillarete/ipod-classic-js/blob/e91d2b6b8cadf72e8a807c521f9297936a51efbb/app/components/views/CoverFlowView/AlbumCover.tsx)               | 侧封面 250 ms、中心封面 300 ms、翻面 500 ms 的实现参考 | 不能据此宣称原机时长                                                             |
| 用户提供的 My Classic 3.0 / 3.16 IPA 与两段录像                                                                                                                                        | 原生转轮反馈、分区过渡、翻面节奏的比较样本             | 旧样本元数据不等于源码；3.16 主程序 cryptid=1；录像不是 Apple 原机               |

GitHub 本轮核查快照：iPod.js `e91d2b6b8cadf72e8a807c521f9297936a51efbb`；固件研究 `2b916dc452f869d59b1819e5c2b0b06a172eddb2`；OSOS Lab `ad98aa61b4c86f3f93441b5cfcaaaf9ab2a30619`。读取的源码/研究文本及各文件 SHA 仅保存在本地 `sources/`，没有引入新的运行时依赖。

## 拿到系统能帮助什么

可以帮助恢复资源表、菜单绑定、尺寸、色值、字体度量、动画状态机、计时方式；配合 Ghidra 和可运行的原版系统，可以追踪哪些常量真正参与了过渡。它比猜测复刻 App 的实现更接近目标。

但是，Apple 更新包是编译后的 ARM 程序，Classic 系统区还有加密。取得包、完成解密、理解代码、在模拟器中正确运行、实机计时，是五个不同的进度。Rockbox/iPodLinux 是替代系统；网页 iPod.js 是复刻；RepriseOS 是原版系统加补丁；这些都不能称作 Apple 原版系统源码。此次没有找到 Apple 公开的完整 RetailOS 源码。

达到更高精度的路线：固定 6G 型号及固件版本 → 同版本明文系统与原机录像 → 确认绘制/过渡入口 → 记录输入帧、首个运动帧、归位帧 → 按位置随时间拟合 → 用相同路径的截图和动画回放回归。读盘等待、按键前的手指停顿和拍摄掉帧必须剔除。模拟器用于确认渲染、状态和资源，最后用物理设备校准墙钟时间。

## 动画校准的诚实边界

原有 280 ms 推页使用很强的前段加速曲线，视觉位移过早完成；仅延长尾部会继续显得快。本轮同时放缓主行程、减轻前段抢跑，并把不同操作分别设定，统一收在 `src/ui/motion.ts`。

### 逐帧检查

取上述 Geekanoids 原视频的 240–360 秒片段，本地文件 640 × 360、25 fps。按原帧率提取，局部裁切 LCD；单帧间隔 40 ms。以下是目视可辨的运动范围，边界至少有一帧不确定性，不能当作原机精确时钟。

| 动作            | 本地片段中的观察                                                            | 当前处理                                                          |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Home → Music    | 片段 +1.84 到 +2.16 秒附近完成主要行程；之前已有右侧预览变化                | 推页 360 ms，改为对称加减速；不把预览变化前的等待计入菜单行程     |
| 进入 Cover Flow | +7.96 仍是菜单，+8.00 已是封面扇列；文字/状态随后在 +8.16 到 +8.40 附近补齐 | 当时实现为扇列直接出现、标题/说明320ms；2026-10-29用户要求的分半退场扩展见文末         |
| 封面 → 曲目背面 | +15.76 尚稳定，+15.80 起旋转，+16.12 左右趋于稳定                           | 360 ms 翻面；原先来自 My Classic 的 560 ms 不再优先于原机录像     |
| 退出 Cover Flow | +27.28 附近标题/说明先退；+27.44 起两边菜单/预览合拢，+27.76 左右稳定       | 总计 480 ms：先退场，再由两边各移动半屏合拢；取消旧的全屏单向推移 |

25 fps 接触表、原帧和观察记录都保留在本地研究目录。没有把这些第三方视频或截图加入公开站点。曲线为人工校准，尚未对 LCD 上的坐标序列做定量拟合；不能声称取到了 Apple 的贝塞尔常量。

| 参数             | 原值                           | 本轮值与性质                                                       |
| ---------------- | ------------------------------ | ------------------------------------------------------------------ |
| 菜单推页         | 280 ms，前段很快的 drawer 曲线 | 360 ms，对称曲线，参照录像可见范围                                 |
| 播放视图切换     | 200 ms                         | 300 ms，暂定校准值                                                 |
| Cover Flow 翻面  | 560 ms                         | 360 ms，原机录像优先于 My Classic                                  |
| 退出 Cover Flow  | 与普通推页同为 280 ms          | 480 ms，分两侧合拢                                                 |
| 封面转动阻尼频率 | 24                             | 18，单步约 99% 归位由 277 ms 延长至 369 ms；保留反向时的位置和速度 |
| 右侧图卡淡入     | 130 ms                         | 400 ms，参考实机预览变化与 iPod.js 的比较值                        |
| 封面轮播 / 淡出  | 4.5 s / 360 ms                 | 6 s / 650 ms，暂定校准值，未宣称实机常量                           |

选中条仍即时响应转轮，不人为模拟读盘卡顿；减少动态效果继续跳过运动。所有动画继续可中断。保留输入/播放状态，不为了让动画看起来慢而延迟执行按键。

尚未从已解密的同版本固件中提取过渡常量。因此本轮代码参数属于根据参考材料和用户反馈作出的校准值，不能标成“Apple 官方毫秒数”或“已完美复刻”。后续测得同版本实机曲线后，应替换这些参数并保留测量过程。

## 已有逆向成果用于浏览器开发

继续读取了 OSOS Lab 的 [原生接口符号](https://github.com/lgreitis/osos-lab/blob/ad98aa61b4c86f3f93441b5cfcaaaf9ab2a30619/payload/native/bindings.h)、[UI 资源标识](https://github.com/lgreitis/osos-lab/blob/ad98aa61b4c86f3f93441b5cfcaaaf9ab2a30619/payload/native/ui.json) 和 [资源元数据](https://github.com/lgreitis/osos-lab/blob/ad98aa61b4c86f3f93441b5cfcaaaf9ab2a30619/firmware/ui.json)。它们分别标出了 Artists / Albums / Songs 的容器、浏览过滤入口、专辑副标题与封面入口。这里读到的是研究者恢复的地址和元数据，不是完整 Apple 源码，也不能从资源 ID 猜出行高。

同时阅读其 `payload/album_artists.c`，用于理解该项目如何在原生浏览容器上添加功能。**Album Artists 是 RepriseOS 的扩展；不能据此把原机 Artists 改成按 Album Artist 分组。** ReiPod 的普通“艺人”仍按每首歌的 Artist 标签筛选，合辑的 Album Artist 仅参与专辑归组。

两项独立原机依据确认了浏览行为：

- [2007 年实机艺人专辑列表照片](https://the-gadgeteer.com/assets/apple-ipod-classic-26.jpg)：进入艺人后显示专辑缩略图，首行为 All Songs，副标题为歌曲数。结合 [Chikuma 对浏览范围与汇总行的研究](https://chikuma.ringum.net/architecture/ui/)，补上 Artists → Albums → Songs 与“全部专辑／全部歌曲”入口。
- Apple 160 GB 用户指南第 26 页明确说明 Cover Flow 按艺人名排序；第 29 页说明正在播放的附加命令可浏览艺人与专辑。浏览命令参照后期 Classic 指南，不宣称它们在 2007 首版固件中已经存在。

本轮独立实现了以下行为，没有复制 OSOS Lab 的补丁代码或系统资源：

1. 普通专辑列表保持按专辑名排列，Cover Flow 独立按艺人、专辑名排列。
2. 艺人浏览先筛选该艺人的歌曲，再生成专辑列表；进入合辑中的专辑时，不会带入其他艺人的歌曲。全局专辑入口仍包含专辑全部曲目。
3. 返回栈与选中位置包含艺人范围；同名专辑在不同艺人浏览下分别记忆位置，播放队列也从当前范围生成。
4. 艺人专辑列表的汇总行显示歌曲数与音符图标；缺少内嵌封面或图片加载失败时显示音符占位，取消与实机无关的自动彩色封面。
5. 歌曲选项新增“浏览艺人／浏览专辑”；播客不混入音乐艺人浏览。Music 主分类移除不见于对照照片的计数值。

验证覆盖合辑范围隔离、不同排序不互相影响、选中记忆，以及从真实 RIFF INFO 元数据导入后经转轮完成浏览、播放、返回与歌曲选项操作。

## 主菜单“正在播放”的预览

用户截图暴露了此前自行设计的倾斜小封面卡片。核对 [Classic 用户的实机录像讨论](https://www.reddit.com/r/IpodClassic/comments/1ez09hh/now_playing_artwork_problems/) 和 [固件研究作者帖下的同一现象反馈](https://www.reddit.com/r/ipod/comments/1v67uyf/204_osos_has_been_decrypted/)，多个原机使用者（包括 7G 用户）确认：Classic 主菜单的 Now Playing 预览使用音符占位，不显示当前封面；Nano 的表现可能不同。这是原机行为的用户观察，尚非已提取的 UI 绑定或本项目持有实机的直接验证。

**用户明确指定：这里应显示歌曲或专辑封面，而且展示形式与右侧轮播的大封面一致。以该明确要求为准。** 此处直接复用 `AlbumPreview` 的满幅大封面、裁切与缓慢平移动效，移除自行设计的小封面及歌名、艺人、专辑文字卡片。图片固定为当前歌曲封面，没有时取同一专辑封面；暂停保留，切歌更新，不轮换无关专辑。只有没有可用封面时才显示音符。“音乐”的右侧封面轮播保持独立。上述用户观察资料尚不足以确认各固件版本的全部预览行为，也不应以此为自行设计卡片的依据。

## UI 标准化资料补充 — 2026-10-28

后续采用 [UI_STANDARDS.md](UI_STANDARDS.md) 的证据分级、320 × 240 坐标归一化、测量误差和截图验收流程。本轮整理来源和开发约束，没有把播放条、音量条或封面角度改成另一套估值。

### 官方来源与版本

| 来源                                                                                                                                                                                                                                                                    | 本轮确认的用途与限制                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2007 classic 发布资料](https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/)                                                                                                                                                                    | 确认本项目既有 6G 基线、金属机身和 Cover Flow；没有给出条高或投影角度                                                                                       |
| [2008 120GB 规格](https://support.apple.com/en-us/112321) / [Late 2009 规格](https://support.apple.com/en-gb/112601)                                                                                                                                                    | 2.5 英寸、320 × 240、103.5 × 61.8 mm；分别标记后续版本，不能单独推出内部布局                                                                                |
| [Apple 机型识别](https://support.apple.com/en-au/103823)                                                                                                                                                                                                                | 区分代际；A1238 被多个版本使用，不能只靠型号代码确认固件                                                                                                    |
| [后期 160GB 手册](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf)                                                                                                                                                              | 已查看印刷页 24 播放示意图：透视/倒影封面、元数据、评分、队列位置、底部进度与时间。示意图不是原始 LCD 截图，不能据此声称像素或 CSS 角度准确                 |
| 同一手册印刷页 25、26、29                                                                                                                                                                                                                                               | 中心键依次进入定位、条件性的 Genius、随机、评分、条件性的歌词；长按打开额外命令；重复在设置。这里是后期指南的行为说明，恢复颗粒度另见 PLAYBACK_INTERACTIONS |
| [2008 120GB 手册](https://cdsassets.apple.com/live/6GJYWVAV/user/ma630_ipod_classic_120gb_en.pdf)                                                                                                                                                                       | 用于对照版本，不与 2007 首版混称                                                                                                                            |
| Apple HIG：[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)、[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)、[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | 指导账户/VIP/错误等新增界面的分组、层级、对齐和减少动态效果；不是旧固件的尺寸、字体或材质规范                                                               |

[The Gadgeteer 2007 第一手评测](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/) 的 [Music 照片](https://the-gadgeteer.com/assets/apple-ipod-classic-7.jpg) 和 [Settings 照片](https://the-gadgeteer.com/assets/apple-ipod-classic-42.jpg) 本轮可访问。其播放页图片 `https://the-gadgeteer.com/assets/apple-ipod-classic-8.jpg` 本轮返回 404，不能当作当前可用量尺。照片的固件未知，并受拍摄透视、曝光和压缩影响；同期评测可支持可见关系，不能自动提供精确色值、条高与动画常量。

### robbiebyrd/ipod_ui 的实际参考价值

已读取 [仓库](https://github.com/robbiebyrd/ipod_ui) 和固定修订 [f4fc1de095e064de9db79729eeb8585d10e840cb](https://github.com/robbiebyrd/ipod_ui/tree/f4fc1de095e064de9db79729eeb8585d10e840cb)（2026-04-06），并在本机渲染其页面检查菜单与播放视图。它派生自 `mitchivin/ipod-classic`；README 称 fifth-generation，界面又使用 Classic 标签，未提供同型号原机测量过程。README 的 `https://mitchivin.github.io/ipod/` 演示地址本轮返回 404。

- 封面实现使用父级 `perspective: 600u`，`rotateY(35deg) scaleX(1.04)`，原点在左侧中部。这是该网页的组合参数，不能只复制 35° 作为原机角度。
- 进度条高 13u；其中 u 按外壳宽度 / 371 缩放，不是 LCD 单位。本机一次渲染 LCD 宽 298.5625px、条高 12.59375px，归一到 320 宽约 13.5px。此数仅描述该网页，不是实机测量，也不是 ReiPod 的拟定标准。
- 没有可比较的音量条。播放页转轮直接按时长的 2% 定位，中心键没有完整 classic 面板循环，不能用作本项目控制顺序依据。
- Myriad Pro / Source Sans 回退栈不能证明原机字体；没有取得字体使用许可的依据，不随 ReiPod 复制分发。
- 适合比较视觉组织与 CSS 方法，尚不足以确认还原精度。渲染截图和源码仅作本地研究，不加入发布产物。

### iPod.js 的边界

对照 [e91d2b6b8cadf72e8a807c521f9297936a51efbb 的 Controls](https://github.com/tvillarete/ipod-classic-js/blob/e91d2b6b8cadf72e8a807c521f9297936a51efbb/app/components/Controls/index.tsx)：封面/定位状态以及音量互斥可供实现比较，但并未覆盖后期 classic 手册的全部中心键序列。固定 commit 避免之后仓库更新导致研究描述漂移；通过其实现只能证明作者选择，不能证明 Apple 常量。

### 接下来需要补齐的证据

先处理播放条、定位状态、音量条和播放封面的四角/倒影；再处理字体、菜单、状态栏和动画。需要同版本、可辨识状态的原机画面，记录 LCD 四角和误差后测量。现有 CSS 数值、自动化测试及本轮网页截图均不是实机真值。具体优先级与验收矩阵维护在 UI_STANDARDS；当前阶段不宣称 UI 标准化已经完成。

## 播放页整体对照 — 2026-10-29

本轮撤回未经原机图像支持的 9u 玻璃轨道、淡色定位填充及独立封面角度改动，重新核对以下第一手评测。两者均为 2007 年首代 Classic；**精确固件未知**。

- [iLounge，Jeremy Horwitz，80GB/160GB 实测](https://www.ilounge.com/index.php/reviews/entry/apple-ipod-classic-80gb-160gb)：[播放照片](https://www.ilounge.com/wp-content/uploads/2021/05/529_12.jpg)，当前页面迁移日期 2021-05-15 不当作拍摄日期。文章描述旧 Aqua 音量/滚动条改为更实、较少玻璃感的样式。图中无评分，队列为 1 of 2。原图 400×300，目视 LCD 内角约 TL(76,50)、TR(325,51)、BR(324,238)、BL(76,237)，角点约 ±2 原图像素。轻微透视，用双线性四角插值归一到 320×240，仅作粗测，不能当高精度固件截图。
- [The Register，Tony Smith，2007-09-13 原机评测](https://www.theregister.com/2007/09/13/review_apple_ipod_classic/?page=3)：[播放画面](https://image.theregister.com/208118.webp?imageId=208118&width=960&format=jpg)。图为独立 LCD 裁图，当前服务输出 960×723，原始像素分辨率/裁切过程未知，不把插值放大的像素当作新增细节。归一 x=x_raw×320/960，y=y_raw×240/723；边缘/文字锚点误差约 ±3–4 LCD 单位。有 3 星评分，队列为 2 of 13。不可将画面当作已验证精确固件的无损 framebuffer。

两图共同支持的关系及粗测范围（LCD 坐标）：

| 项目 | 归一化观察 | 实现性质 |
| --- | --- | --- |
| 封面投影四角 | 约 (10,35)、(146,42)、(146,168)、(10,169)，各 ±4u | 按投影四角拟合；不是 Apple CSS 角度 |
| 文字左锚 | x≈160±3u；有评分时标题可见顶约60u，无评分时约70u | 信息组随内容围绕封面中部组织 |
| 标题/艺人/专辑 | 标题最突出；后两者仍清楚可读，非浅灰辅助文案 | Noto 仍为替代字体，未测得原版字形 |
| 评分/队列 | 有评分时在专辑后显示已保存星数，随后显示当前/总数；无评分时仍显示队列 | Apple 手册亦明确列出评分、序号 |
| 普通播放条 | x≈57..264，y≈207..222，边界 ±3u；下方有淡倒影 | 高约14–16u；不能将颜色直接取成固件 RGB |
| 时间 | 左右各在轨道外侧，中轴约215u，误差±3u | 低/中/高位置检查几何稳定 |
| 状态图标 | 上述关闭随机/重复画面没有常驻队列、歌词及灰色随机工具图标 | 移除装饰性图标，启用的模式仍显示 |

封面采用 138u 方形、左中原点、550u perspective、rotateY(22deg) scaleX(1.18) 拟合上述四角；这是一组浏览器投影解，不是实机角度测量。倒影与封面共用变换，遮罩约38u。普通条采用15u外高及淡倒影；渐变颜色仅为曝光未知条件下的视觉近似。定位和音量尚无同等级 2007 三状态直接图像，本轮保留定位隐藏填充/菱形和既有音量几何，不宣称已校准。后续仍需同版本低/中/高音量及定位画面。

原图、裁切放大及来源清单仅存 `.local/playback-ui-research/`，不加入发布资源。测试截图证明工程属性，不证明实机精确还原。

### 后续视频筛查与端点检查

2026-10-29 又读取了以下视频，原文件/接触表继续仅保存在忽略研究目录。筛查结果不等于逐帧穷尽全部状态：

- [iLounge 新界面演示](https://www.youtube.com/watch?v=DUTl9sJEAo4)，来自上述 2007 实测的直接链接；精确固件未知。按5秒采样，主要可辨识视频播放、菜单、游戏和搜索，没有取得可测量的音乐定位/音量三状态。
- [Geekanoids 2007-09-12 Classic 160GB 评测](https://www.youtube.com/watch?v=64_CxTW7_84)，精确固件未知。按10秒采样并检查菜单/Cover Flow片段，未补齐音乐定位和低/中/高音量画面；不能以视频播放浮条替代音乐控制条。
- [Stuff 2007-10-04 Classic 160GB 实测](https://www.youtube.com/watch?v=n-QVZUX6WGM)，精确固件未知。按2秒采样，可辨设备和菜单，但播放控制状态/细节不足以测量，未产生新 UI 数值。
- [For Dummies 2009-11-19 音量教学](https://www.youtube.com/watch?v=B_QJSG9tGiI)，按2秒采样可见采用短宽蓝色 nano 外壳。虽标题包含 Classic，不作为当前 2007 Classic 播放页几何依据；固件未知，未从其画面取 Classic 尺寸。

网页端定位起点0与终点205.078639秒、音量0%与100%另以暂停的 Carefree 演示曲目和转轮按键回归，检查菱形不覆盖时间、填充不越界及切换时封面不移位。此为 ReiPod 工程属性检查，不补足原机外观证据。

## 音量态与第一次中心键定位态 — 2026-10-29 后续

针对用户指出的两种未校准状态，重新检索直接操作演示，而非将普通播放截图外推。

1. [bigern1990，iPod Classic: The New User Interface](https://www.youtube.com/watch?v=ge56Li0PuQ0)，上传 2007-10-24。银色长机身 Classic，画面有实际播放时间与连续中心键切换；精确容量和固件未知。取得 320×240 / 30fps H.264 流，原始相机分辨率未知。文件时间约133–170秒包含普通进度 → 定位 → 评分 → 随机 → 普通进度；138–145.5秒可见菱形及转轮定位，左右保留时间。提取133秒起42秒片段，按0.5秒检查，原文件哈希及详细出处在忽略目录。LCD角点约(39,30)、(282,30)、(282,216)、(39,216)，角点约±2源像素；用四角映射到320×240，边界误差约±3–4u。定位轨道约7–9u高，菱形投影宽高约12–15u；下方有淡的镜像/反射。以9u方形旋转45°近似菱形，约12.7u投影；**不是9u实机方形资源的测量结论**。先前移除定位反射、使用7u方形导致标记偏小，应修正。
2. [eHow，iPod Help: How to Use an iPod](https://www.youtube.com/watch?v=qYmOjuYXz70)，上传2009-07-04。75–90秒可见银色Classic播放、旋轮调音量、浮条消退和中心键定位；约76–80秒包括接近空、较低和较高填充的连续状态。外壳可排除nano与5G塑料壳，但无法仅由视频确认2007/2008修订，固件未知，**是跨修订辅助实拍，不能声称2007同固件精确校准**。提取75秒起18秒片段按0.5秒检查。现有提取器将画面等比缩到540宽；约79秒LCD角点(213,84)、(315,86)、(312,161)、(211,158)，角点约±2px，因此轨道高度归一误差约±6u。可见音量填充为宽面而非7u细线；粗测约12–18u，左右扬声器、中央横向轨道。与普通15u条共用材质是该误差范围内的实现选择。图标/轨道的横向内缩采用约20u以匹配可见关系，仍属低分辨率近似；低/高扬声器矢量与RGB未从固件恢复。视频未明确展示100%端点，不将“较高填充”写成实机满值验证。

[同站Classic操作图](https://www.ipodwave.com/ipod/ipodmusicplay_classic.htm)也展示中心键后的灰色轨道和蓝色菱形，但使用泛化歌曲信息，属于说明图，不作为硬件像素量尺。eHow另一个音量视频只见远景；Videojug教程采用旧塑料壳iPod，均排除几何测量。

工程实现区分三态：普通15u填充轨道；定位7u轨道配约12.7u投影菱形及反射；音量15u填充轨道配两端扬声器，并保留独立的内缩。此前“缺直接定位资料”的记录由本节补充；字体、色值、精确图标、2007匹配固件及实机满音量端点仍未恢复，不以“完整资料”表示不存在这些未知项。

### 音量两端图标 — 2026-10-29

用户确认音量条本体后，只修正两端图标。复查 eHow 上述约80秒实拍：左端为小实心扬声器，右端为较大实心扬声器与较浅声波。旧实现两端共用现代空心扬声器/双声波，仅将左端整体缩小，轮廓与实拍不符。改为独立低/高音量矢量，保留18u布局框、现有轨道与间距，以图形内部的轮廓区分大小，不再用整体缩放。实拍局部只有数个像素，不能确认原资源路径、每道声波或精确RGB；当前路径、1.6/24视框的声波线宽与颜色仍为独立重绘近似，不冒充提取的固件资源。

## 用户指定 My Classic 控制条动画与图标 — 2026-10-29

本节按用户新提供的18.09秒录屏、HEIC静帧及IMG_1140.PNG优化，优先执行明确的参考要求。它们是My Classic比较样本（确切版本未知），不是2007实机或固件输出；只采用底部控制区的视觉，不复制样本中额外的重复面板顺序，不改变ReiPod已有中心键循环和歌词入口。

- 录屏按0.5秒筛查、0.1秒细查；0.1–0.4秒、1.3–1.6秒、6.4–6.7秒、8.2–8.5秒可见旧面板向左、新面板从右进入。主要行程约300ms，采样边界误差至少±100ms；使用既有对称曲线近似，未从画面精确拟合贝塞尔。封面与元数据保持不动。
- 音量出现约11.4–11.5秒、退出约16.1–16.2秒，未见整面板横移；以100ms透明度交叉过渡实现，属于≤100ms采样边界内的ReiPod适配，不声称取得其精确时长。
- HEIC转换PNG原尺寸1206×2622；LCD内边近似TL(47,230)、TR(1155,230)、BR(1155,1208)、BL(47,1208)，边界约±3px。蓝色定位点约(396,1105)..(431,1140)，色差阈值与抗锯齿带来约±2px不确定性。按X宽度归一到320后宽约10.4±0.7u。参考LCD本身不是4:3，不把其纵向比例套给classic；以7.5u圆角方形旋转45°（约10.6u外宽）保持ReiPod逻辑LCD中的方正菱形，半径1.5u和渐变为独立重绘近似。
- 用户截图音量条左端为实心扬声器加一道短声波，右端为实心扬声器加多道声波，整体深色；替换此前无声波的左端以及偏灰的矢量。当前按参考重绘一/三道圆端声波与圆角扬声器，既有18u布局框及已获用户确认的轨道几何不变。不是固件图标资源，也不把路径当作精确测量值。

实现入口：`src/ui/PlaybackControlBay.tsx`；参数仍集中在`src/ui/motion.ts`。动画采用transform/opacity和WAAPI，快速操作取消旧动画并从当前可见位置继续；退场快照aria-hidden且inert，不重复暴露进度语义。减少动态效果直接切换。图片、视频、原始哈希与接触表只在忽略目录保存。

## Cover Flow 进入过渡扩展 — 2026-10-29

用户反馈进入Cover Flow没有可见动画，确认原实现只淡入状态栏与说明，封面扇列直接出现。按用户要求添加菜单左右半屏分别向外退开、露出扇列的进入过渡，沿用320ms暂定参数与既有对称曲线；是退出合拢过渡的空间反向，是ReiPod适配，**没有新实机测量，不将其写成2007固件已验证行为**。中途返回时保留父级裁切范围，避免捕获两半内部未显示的完整页面。减少动态效果跳过过渡；浏览器检查覆盖中间帧、反向返回、专辑翻面和快进快出，不能替代设备帧率验证。
