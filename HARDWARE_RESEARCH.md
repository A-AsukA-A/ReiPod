# iPod classic 实机、系统与动画依据

核查日期：2026-10-27。开发目标为 Apple 原版 iPod classic。My Classic 和 iPod.js 是比较样本，不能覆盖原机证据。当前机身和菜单基线为 2007 Classic 6G；资料中 6G、120 GB、7G 及不同固件的结论分开使用。

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

## 资料目录与可用范围

| 资料 | 直接用途 | 使用边界 |
| --- | --- | --- |
| [Apple 2007 发布说明](https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/) | 确定金属机身、Cover Flow、产品代际 | 没有动画毫秒数 |
| [Apple Classic 用户指南](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf) | 操作、菜单、HOLD、封面浏览、照片和播放流程 | 是后期 160 GB 指南，不能把所有新增功能套给 2007 首版 |
| [Apple 120 GB 用户指南](https://cdsassets.apple.com/live/6GJYWVAV/user/ma630_ipod_classic_120gb_en.pdf) | 对照 2008 版菜单与功能差异 | 不提供 UI 曲线 |
| [The Gadgeteer 2007 实机评测](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/) | 实物菜单、Music、Settings、播放页照片 | 静态照片不能量出时长 |
| [Ars Technica 2007 实测](https://arstechnica.com/gadgets/2007/09/the-ipod-gets-a-makeover-a-review-of-the-ipod-nano-and-ipod-classic/) | 原机过渡组织、导航响应的同期记录 | 原文涉及两种设备；整体操作耗时不是单次动画时间 |
| [Macworld 首版评测](https://www.macworld.com/article/187329/ipodclassic.html) | 同期 Cover Flow、封面读取响应 | 迟缓可能来自读盘，不能全部做成人为延迟 |
| [Macworld 1.0.1 更新实测](https://www.macworld.com/article/187476/ipodclassic101.html) | 证明固件升级会改变响应观感 | 不能把 1.0 初版卡顿认定为所有 Classic 的标准 |
| [Geekanoids 2007 实机视频出处](https://www.geekanoids.co.uk/reviews/2007/9/12/apple-ipod-classic-first-look-video-review.html) / [原视频](https://www.youtube.com/watch?v=64_CxTW7_84) | 实机菜单与 Cover Flow 的动态参考 | 视频未核实精确固件号；压缩、拍摄帧率限制测量精度 |
| [q3k 的 wInd3x 原始研究](https://q3k.org/wInd3x.html) | 理解 BootROM、解密与实际硬件需求 | 不是开源 RetailOS 源码，也不直接提供 UI 常量 |
| [freemyipod/wInd3x](https://github.com/freemyipod/wInd3x) | 官方工具 README 当前列出 Classic 的 DFU、解密支持 | 需要兼容设备；README 对 Classic 仍标 Experimental |
| [固件研究总目录](https://github.com/giek2000/ipod-classic-firmware-research) | 分代规格、系统结构和研究入口 | 是第三方分析；“完整”是作者描述，不等于本项目已验证 |
| [Cover Flow 引擎研究](https://github.com/giek2000/ipod-classic-firmware-research/blob/main/architecture/COVERFLOW_ENGINE.md) | 查找事件、投影、绘制与缓存的线索 | FPS、CPU 预算有估算成分；本文菜单入口描述与 Apple 手册有冲突，不用它覆盖官方菜单 |
| [IPSW 结构研究](https://github.com/giek2000/ipod-classic-firmware-research/blob/main/architecture/IPSW_FORMAT.md) | ZIP、IMG1、分区类型的研究线索 | 其 0x4000 表位置不匹配本轮取得的 6G 文件；不能直接照搬解析 |
| [RepriseOS / OSOS Lab](https://github.com/lgreitis/osos-lab) | 原版 RetailOS 的补丁、原生 UI 资源元数据、Ghidra 注释 | 当前基于 2.0.5；补丁中的新功能不是原机默认行为；仓库不提供完整 Apple 系统 |
| [OSOS Lab 固件输入清单](https://github.com/lgreitis/osos-lab/blob/main/firmware/apple.json) | 根据字节数和哈希区分加密输入、解密输入 | 有哈希清单不等于已经拥有对应明文 |
| [QEMU Classic 实机系统模拟项目](https://github.com/davidmonterocrespo24/qemu-ipod-classic) | 可运行原版固件、观察原版绘制输出的候选工具 | 作者明确不提供固件；部分播放功能有缺陷；模拟器速度不是实机时长证据 |
| [clicky](https://github.com/daniel5151/clicky) | RetailOS 模拟、硬件文档与调试方法 | 当前主攻 4G 灰阶，不能用其画面校准 Classic 6G |
| [Chikuma 界面研究](https://chikuma.ringum.net/architecture/ui/) / [状态](https://chikuma.ringum.net/status/) | 原机区域表面、控制器栈、资源驱动 UI 的研究描述 | 本轮只读到了文档，未取得其完整代码或独立运行验证；状态页列有未完成功能 |
| [iPod.js 动画源码](https://github.com/tvillarete/ipod-classic-js/blob/e91d2b6b8cadf72e8a807c521f9297936a51efbb/app/animation/index.tsx) | 可验证的网页实现比较：推页 300 ms，预览 400 ms | 是复刻作者选择，不是 Apple 实机常量 |
| [iPod.js Cover Flow 源码](https://github.com/tvillarete/ipod-classic-js/blob/e91d2b6b8cadf72e8a807c521f9297936a51efbb/app/components/views/CoverFlowView/AlbumCover.tsx) | 侧封面 250 ms、中心封面 300 ms、翻面 500 ms 的实现参考 | 不能据此宣称原机时长 |
| 用户提供的 My Classic 3.0 / 3.16 IPA 与两段录像 | 原生转轮反馈、分区过渡、翻面节奏的比较样本 | 旧样本元数据不等于源码；3.16 主程序 cryptid=1；录像不是 Apple 原机 |

GitHub 本轮核查快照：iPod.js `e91d2b6b8cadf72e8a807c521f9297936a51efbb`；固件研究 `2b916dc452f869d59b1819e5c2b0b06a172eddb2`；OSOS Lab `ad98aa61b4c86f3f93441b5cfcaaaf9ab2a30619`。读取的源码/研究文本及各文件 SHA 仅保存在本地 `sources/`，没有引入新的运行时依赖。

## 拿到系统能帮助什么

可以帮助恢复资源表、菜单绑定、尺寸、色值、字体度量、动画状态机、计时方式；配合 Ghidra 和可运行的原版系统，可以追踪哪些常量真正参与了过渡。它比猜测复刻 App 的实现更接近目标。

但是，Apple 更新包是编译后的 ARM 程序，Classic 系统区还有加密。取得包、完成解密、理解代码、在模拟器中正确运行、实机计时，是五个不同的进度。Rockbox/iPodLinux 是替代系统；网页 iPod.js 是复刻；RepriseOS 是原版系统加补丁；这些都不能称作 Apple 原版系统源码。此次没有找到 Apple 公开的完整 RetailOS 源码。

达到更高精度的路线：固定 6G 型号及固件版本 → 同版本明文系统与原机录像 → 确认绘制/过渡入口 → 记录输入帧、首个运动帧、归位帧 → 按位置随时间拟合 → 用相同路径的截图和动画回放回归。读盘等待、按键前的手指停顿和拍摄掉帧必须剔除。模拟器用于确认渲染、状态和资源，最后用物理设备校准墙钟时间。

## 动画校准的诚实边界

原有 280 ms 推页使用很强的前段加速曲线，视觉位移过早完成；仅延长尾部会继续显得快。本轮同时放缓主行程、减轻前段抢跑，并把不同操作分别设定，统一收在 `src/ui/motion.ts`。

### 逐帧检查

取上述 Geekanoids 原视频的 240–360 秒片段，本地文件 640 × 360、25 fps。按原帧率提取，局部裁切 LCD；单帧间隔 40 ms。以下是目视可辨的运动范围，边界至少有一帧不确定性，不能当作原机精确时钟。

| 动作 | 本地片段中的观察 | 当前处理 |
| --- | --- | --- |
| Home → Music | 片段 +1.84 到 +2.16 秒附近完成主要行程；之前已有右侧预览变化 | 推页 360 ms，改为对称加减速；不把预览变化前的等待计入菜单行程 |
| 进入 Cover Flow | +7.96 仍是菜单，+8.00 已是封面扇列；文字/状态随后在 +8.16 到 +8.40 附近补齐 | 扇列直接出现，标题/说明在 320 ms 内呈现，取消普通整页横移 |
| 封面 → 曲目背面 | +15.76 尚稳定，+15.80 起旋转，+16.12 左右趋于稳定 | 360 ms 翻面；原先来自 My Classic 的 560 ms 不再优先于原机录像 |
| 退出 Cover Flow | +27.28 附近标题/说明先退；+27.44 起两边菜单/预览合拢，+27.76 左右稳定 | 总计 480 ms：先退场，再由两边各移动半屏合拢；取消旧的全屏单向推移 |

25 fps 接触表、原帧和观察记录都保留在本地研究目录。没有把这些第三方视频或截图加入公开站点。曲线为人工校准，尚未对 LCD 上的坐标序列做定量拟合；不能声称取到了 Apple 的贝塞尔常量。

| 参数 | 原值 | 本轮值与性质 |
| --- | --- | --- |
| 菜单推页 | 280 ms，前段很快的 drawer 曲线 | 360 ms，对称曲线，参照录像可见范围 |
| 播放视图切换 | 200 ms | 300 ms，暂定校准值 |
| Cover Flow 翻面 | 560 ms | 360 ms，原机录像优先于 My Classic |
| 退出 Cover Flow | 与普通推页同为 280 ms | 480 ms，分两侧合拢 |
| 封面转动阻尼频率 | 24 | 18，单步约 99% 归位由 277 ms 延长至 369 ms；保留反向时的位置和速度 |
| 右侧图卡淡入 | 130 ms | 400 ms，参考实机预览变化与 iPod.js 的比较值 |
| 封面轮播 / 淡出 | 4.5 s / 360 ms | 6 s / 650 ms，暂定校准值，未宣称实机常量 |

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

**用户随后明确指定：这里应显示歌曲或专辑封面。以该明确要求为准。** ReiPod 的此处预览显示当前歌曲封面，没有时取同一专辑的封面；只有没有可用封面时才显示音符。封面以正向方形展示，歌名、艺人、专辑同步更新，暂停仍保留当前封面。“音乐”的右侧封面轮播保持独立。此项属于用户指定行为，不再用上述实机占位表现覆盖用户偏好。
