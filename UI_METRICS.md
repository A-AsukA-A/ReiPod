# UI 指标与逐状态验收台账

统一入口：[DEVELOPMENT.md](DEVELOPMENT.md)。核查日期：2026-10-29。机型来源见 [DEVICE_STANDARDS.md](DEVICE_STANDARDS.md)，测量操作见 [UI_STANDARDS.md](UI_STANDARDS.md)。

本文件给每类指标规定来源、单位、状态与验收方式，**并未补齐所有代际的实机数值**。禁止把“已建指标规范”写成“已完成像素还原”。当前只有 classic 2007 基线有实现与部分粗测。

## 证据与完成规则

- D：官方明示，仅用于原文明确规定的字段，不推导未知公差。
- M：直接证据测量，必须带样本、归一方法和误差；跨固件样本不能合并成精确值。
- P：暂定实现，工程回归可验收，实机还原未通过。
- A：ReiPod 产品适配，保持用户决定，不宣传为固件默认。
- U：无足够证据。记录研究对象和所需材料，禁止补一个猜测数字关闭任务。

每条记录要有 metricId、device/firmware/locale/orientation、state、value/unit、evidenceStatus、sourceId/revision/page/timecode、normalization、uncertainty、implementationLocation、comparisonResult。没有这些字段的截图不能成为还原基线。适用范围不符时即使数字相同也不能复用结论。

“通过还原”要求该状态所有可见指标为 D/M，或明确批准的 A；P/U 不计通过。工程测试、参考覆盖、视觉对照、平台实测四种进度分别报告。待证据的组件可继续修复工程缺陷，不能宣称已经校准。

## 指标全集与责任边界

所有长度在目标 LCD 原生坐标使用 u；外壳使用 mm 或归一到设备宽度；时间 ms；角度 °；透明度 0–1。CSS transform 只记录实现，不替代投影测量。

| metricId | 必填指标 | 证据与验收要求 | 当前 classic 状态 |
| --- | --- | --- | --- |
| HW.identity | 代际、修订、容量、固件、语言 | 官方规格 + 实物身份，未知项明确标出 | 2007 基线；照片固件多未知 |
| HW.body | 高宽厚、轮廓、圆角、材质分区 | 对应尺寸图/标尺实拍，分容量；曲面不从平面图推断 | 高宽厚 D；局部曲率 U |
| HW.controls | 轮盘内外径、中心、四键区域、HOLD/端口位置 | 尺寸图或正对实物测量；可视与命中区域分别登记 | P/U |
| LCD.geometry | 像素宽高、物理开口、边框、原点、缩放 | 分辨率 D；开口须另证，不能以对角线反算边框 | 320 × 240 D；开口 P |
| TEXT.font | 字体身份/许可、字形、字号、字重、字距、数字等宽性 | 中英数字分别对照，同文本、基线/可见边界；禁止靠行高遮掩字形差异 | 替代字体 A；原字体 U |
| TEXT.layout | 行盒、基线、左右锚点、截断/跑马灯、空白行 | 记录字体加载与 computed style，短长中英四组 | P/U |
| CHROME.header | 标题栏高、渐变、分隔线、标题/状态图标坐标 | 相同播放/电量/HOLD 状态对照；图标边界分别测 | P/U |
| MENU.grid | 列宽、分隔线、首行/行距、选中框、箭头、可见行数 | 主菜单/子菜单/设置分别测，首尾与滚动后状态 | P/U |
| MENU.preview | 预览边界、裁切、封面更新条件、进入/退出 | 固定封面/无封面；原版与全封面扩展分开 | 全封面 A，原版几何 U |
| NP.artwork | 投影四角、可见尺寸、文字间距、倒影起点/高度/衰减 | 去除相机透视后拟合；禁止直接规定 CSS 角度 | M 粗测 + P 拟合 |
| NP.metadata | 曲名/歌手/专辑/曲序锚点、字距、缺失回退 | 长短文本、中文、无封面/无专辑 | P/U |
| NP.progress | 轨道/填充/边缘、时间字、共同轴、端点 | 0/50/100%，播放/暂停分别核 | M 粗测，未逐状态通过 |
| NP.seek | 轨道、定位菱形尺寸/投影/端点、确认/取消 | Center 进入、轮盘移动、返回，音乐状态保持 | M 原机粗测；当前样式 A |
| NP.volume | 轨道/填充/扬声器尺寸/轴、0/50/100% | 每个端点单独证据，不从中间帧推断 | 原机 M 低精度；比较样式 A |
| NP.rating | 星形/点、间距、选中值、未评分 | 0/1/5 与轮盘修改；按固件验证入口 | P/U |
| NP.modes | shuffle/repeat/Genius/lyrics 面板条件与顺序 | 对应版本手册 + 连续操作，不用静态图推断顺序 | 后期手册 D；2007 精确循环待核 |
| INPUT.wheel | 单步、加速、方向、跨零、松手、取消 | 连续录像/实物操作；无证据时阈值为工程适配 | P |
| INPUT.press | 短长按互斥、阈值、HOLD、睡眠/唤醒 | 测输入到响应；不能把相机手指停顿当阈值 | 阈值 P；歌词入口 A |
| MOTION.navigation | 首响应、持续、曲线、位移、反向中断 | 连续视频去掉读盘等待，逐帧记录误差 | P |
| MOTION.artwork | 切封面、倒影、Cover Flow 进入/退出 | 同曲目序列、运动中断、归位状态 | P |
| MOTION.preview | 间隔、淡入、卡片位移、暂停条件 | 固定时钟对照，切菜单/锁定时无重复计时 | P |
| COLOR.material | LCD/金属/塑料颜色、渐变、噪声、阴影 | 色彩管理/曝光未知时只测相对层级，不采相机 RGB | P |
| TOUCH.navigation | 点击/横扫/长按/Home、滚动物理、旋转 | nano 6/7 各自手册和实机，不能复用 wheel 逻辑 | 不适用 classic；nano 待实现 |
| TOUCH.scrub | 拖动、细调方向、速率、误触取消 | nano 6 向上细调，nano 7 向下；速率须实测 | 方向 D；数值 U |
| EXT.feedback | 登录/二维码/过期/VIP/错误/空列表/歌词开关 | 状态清晰、轮盘可达、服务隔离；与传统固件视觉协调 | A，工程测试另计 |
| HOST.presentation | viewport/DPR/安全区/缩放/触摸替代/减少动态 | 手机/桌面/原生分别记录；不能改变逻辑 LCD 网格 | A，平台实测另计 |

## 现有数值的证据状态

以下不是新增的硬件常量。原始角点、录像时间点与方法见 [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md)；每次实际校准必须保留这些上下文。

| 指标 | 当前资料/实现 | 判定 |
| --- | --- | --- |
| 2007 普通播放轨道 | 同期照片归一后 x≈57…264，y≈207…222；±3u | M 粗测，不是固定 15u 高官方规范 |
| 时间文字中轴 | 同组照片 y≈215；±3u | M，须与轨道共同核对 |
| 封面投影 | Register 照片四角约 (10,35)、(146,42)、(146,168)、(10,169)，±4u | M，仅该未知固件样本 |
| 定位状态原机 | 2007 视频轨道约 7–9u，菱形投影约 12–15u；±3–4u 级采样误差 | M，不反推唯一旋转正方形边长 |
| 音量原机 | 2009 eHow 斜拍归一轨道约 12–18u，±6u；不覆盖全端点 | M，精度不足以定最终值 |
| 当前播放封面 CSS | 138u 方图；perspective 550u、rotateY(22deg)、scaleX(1.18) | P 拟合，不能称硬件角度 |
| 当前定位控件 | 7.5u 轨道、10.6u 正方形旋转；圆角等按比较片 | A，My Classic 比较样本/用户选择 |
| 页面/视图/封面动画 | 360/300/360 ms；Cover Flow 进入/退出 320/480 ms | P；唯一实现源 src/ui/motion.ts |
| 控制条/音量动画 | 300/100 ms；比较视频控制移动约 300±100 ms | A，比较样本不是原机时序 |
| 预览定时 | 间隔 6000、淡入 650、卡片 400 ms | P，不能升级为固件默认 |
| easing | cubic-bezier(0.42, 0, 0.58, 1) | P，尚无原机逐帧拟合 |
| 歌词运动 | focus .35 s、manualHold 2500 ms 等 | A；唯一实现源 lyricMotion |

直接参考：[iLounge 2007 实机评测](https://www.ilounge.com/index.php/reviews/entry/apple-ipod-classic-80gb-160gb)、[Register 2007 实机评测](https://www.theregister.com/2007/09/13/review_apple_ipod_classic/?page=3)、[2007 操作录像](https://www.youtube.com/watch?v=ge56Li0PuQ0)、[2009 音量操作录像](https://www.youtube.com/watch?v=qYmOjuYXz70)。这些既有研究不因本轮整理而提升精度；准确固件仍未知。

## classic 首批逐状态验收

“有资料”不等于“通过”。以下全部尚未完成统一 fixture 的实机对照验收，不生成虚构通过标记。

| stateId | 必须固定的状态 | 指标组 | 证据现状/下一步 |
| --- | --- | --- | --- |
| C-M01 | 主菜单首行/末行，中英，播放/未播放 | header、grid、preview、font | 同期照片有限；补同一固件正对图与逐行滚动 |
| C-M02 | 子菜单长名称，首尾滚动，返回 | grid、truncation、navigation | 补连续实机输入及稳定帧 |
| C-N01 | 普通播放，封面齐全，0/50/100% | artwork、metadata、progress | 现有照片粗测；补同版本完整三端点 |
| C-N02 | 暂停、无封面、缺元数据、超长中英标题 | artwork、metadata、header | 缺完整匹配参考；不能仅用工程 fixture 验收原机 |
| C-S01 | Center 进入定位，移到首/中/尾，退出 | seek、press、control motion | 有 2007 连续视频；补固件身份和端点 |
| C-V01 | 音量 0/50/100%，超时退回 | volume、timing | 原机资料低精度且跨年；补正对稳定图 |
| C-R01 | 评分 0/1/5，shuffle/repeat 各模式 | modes、rating | 后期手册可定部分行为；2007 状态/图标待补 |
| C-F01 | Cover Flow 首/中/尾、进入/退出、快速反向 | artwork、motion、input | 需同固件连续操作，不从其他复刻取参数 |
| C-H01 | HOLD、MENU/Center 长短按、休眠/唤醒 | press、header、continuity | 原版行为与 ReiPod 阈值分别记录 |
| A-L01 | 长 Center 歌词、歌词关闭/空/多语 | extension、font、motion | 产品适配：用确定性工程用例验收 |
| A-A01 | 未登录/登录中/过期/VIP/服务切换 | feedback、provider isolation | 产品适配：现有测试覆盖不能代替真实账户验证 |

## 测量记录模板

```yaml
id: C-N01-NP.progress
model: classic-2007-80gb
firmware: unknown
locale: en
orientation: landscape
state: playing-progress-50
value: null
unit: lcd-u
status: U
source: { url: null, revision: null, page: null, timecode: null }
normalization: { rawSize: null, lcdCorners: null, targetSize: [320, 240], method: null }
uncertainty: null
implementation: { file: null, selector: null, computedStyle: null }
fixture: { track: null, artwork: null, text: null, position: null, volume: null }
capture: { viewport: null, dpr: null, browser: null, zoom: null, settled: false }
comparison: { overlay: null, difference: null, result: pending }
```

优先补字体/菜单网格，再普通播放、定位、音量；每个状态完成来源→测量→实现→对照→交互回归后关闭。其他代际按相同字段建立独立记录；不允许把 2007 的截图复制成 nano/mini 金图。

## 2026-10-30 菜单级联的工程基线

本节推进 C-M01/C-M02 的实现核查，状态仍为 P；没有新增原机测量或硬件通过结论。检查对象为当前 classic、中文、主菜单选中“设置”及设置页选中“关于本机”，三首内置试听曲目、正在播放、随机开启、重复关闭、背光始终开启、转轮声音关闭；浏览器独立会话（HeadlessChrome 156.0.0.0 / macOS，默认页面缩放）、DPR 1、减少动态，字体加载后采集。采集时核对实际 `data-page`，将键盘焦点置于转轮 group；主菜单保留选中记忆，不能按固定按键次数推定所在页。

| 项目 | 浏览器最终来源/当前值 | 说明 |
| --- | --- | --- |
| 行高/字号/字重 | classic-lcd.css 后部 `.screen-row, .screen-song-list .screen-row`：24u / 16u / 700 | 逻辑实现值；浏览器布局有亚像素舍入 |
| 横向 padding / gap | 同组：5u / 4u | 不表示原机尺寸 |
| 字距 | classic-lcd.css 前部同组：-0.15 CSS px | 仍是固定 CSS px，未取得固件字距依据 |
| 设置值字体 | firmware-display.css 的 `.screen-row .row-value` 及设置页覆盖：继承 | 旧的 11u/14u 已被覆盖，不再保留 |
| 选中背景/内阴影 | classic-lcd.css 后部 `.screen-row.selected` | 旧 Aqua/深蓝渐变不再参与最终样式 |
| 箭头图形 | classic-lcd.css 后部 `.screen-row .row-chevron .player-icon`：9u × 15u、stroke 3 | 旧 10px × 13px、stroke 2.6 不再生效 |

清理共移除 50 行被后续规则覆盖的 CSS，保留仍生效的字距、文本颜色、布局与各专用状态。320×844、390×844、1280×844 三视口下，主菜单/设置六组采集的全部 computed properties、元素边界及 LCD PNG 像素均前后一致。截图裁切为当前渲染 LCD，不是 320×240 原机 framebuffer；不能把缩放截图的像素数作为硬件规格。

原始 JSON、截图和比较结果保存在忽略目录 `.local/standards-06/`；发布文档只保留独立结论。此基线用于证明级联清理未改变这六个固定状态，不能外推到未采集状态。长标题、中英文/数字字体度量、首尾滚动和对应固件原机样本仍待补齐。

## 2026-10-30 原机菜单粗测：C-M01 / C-M02

来源为 Julie Strietelmeier 的 [2007-09-19 classic 第一手评测](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/)，作者说明评测对象为 160GB；照片的确切固件未知。来源在 2017 年更新，不将更新时间当作拍摄/固件日期。三个样本为英文菜单静帧，未覆盖滚动、中文或所有状态。

| ID / 原图 | 原图尺寸 | LCD 四角 TL / TR / BR / BL（源像素） | 使用范围 |
| --- | --- | --- | --- |
| G-H：[主菜单](https://the-gadgeteer.com/assets/apple-ipod-classic-10.jpg) | 300 × 222 | (8,3) / (292,2) / (299,219) / (2,219) | Music 选中；整屏为 classic |
| G-S：[设置](https://the-gadgeteer.com/assets/apple-ipod-classic-42.jpg) | 307 × 222 | (11,4) / (296,1) / (305,219) / (3,219) | About 选中；整屏为 classic |
| G-M：[Music](https://the-gadgeteer.com/assets/apple-ipod-classic-7.jpg) | 500 × 182 | (273,22) / (466,23) / (488,170) / (275,170) | 只量右侧 classic，排除左侧旧 iPod；Artists 选中 |

四角人工取样约 ±2 源像素，标志点约 ±1；以单应变换归一到 320 × 240 连续边界坐标，不把放大图当新增细节。镜头畸变、原裁切和曝光未知，以下只作为 M 级粗测样本。三张图来自同一作者，不能算三个独立设备验证。

| 指标 | 本轮观察/取样 | 当前实现与处理 |
| --- | --- | --- |
| 设置页标题栏底边 | G-S 的 (70,21) → y≈20.7u；端点扰动采样约 16.7…24.8u | 20u 在范围内，保留 P 实现 |
| 设置分屏 | G-S 上/下点 (153,4)/(154,219) → x≈160.5/161.2u；扰动采样约 154…168u | 160u 在范围内，保留；不能宣称测得精确中线 |
| 设置选中条底边 | (70,43) → y≈46.2u；扰动采样约 41.8…50.8u | 与标题底边相减约 25.5u，误差相关；不能据此硬改为 25.5u |
| 菜单纵向网格 | 主菜单 Videos/Photos/Podcasts 等暗色字形上沿约 y=52/77/102u；设置 Main Menu/Music Menu/Volume Limit 约 y=102/126/150u | 支持约 24u、保守 ±3u 级行距；当前 24u 保留 |
| 文本左侧可见边界 | 未选中项大致 x≈6…7u，视阈值及样本变化，约 ±3u | 不能直接当 padding；当前 padding 5u 另含字形 bearing |
| 英文字形宽度 | G-S 中 Main Menu 约 84u、Music Menu 约 93u、Volume Limit 约 102u；粗测不确定性约 ±4u | 只比较同文案可见边界，不推导原字体身份或 CSS 字号 |

字形测量对归一图的限定文本区域采用 RGB 各通道均低于 90/130/170 的敏感性检查，并人工查看放大图；低对比字母会丢失笔画，行内降部也会侵入相邻取样窗，污染窗口不采纳。该方法不是 OCR、不是字体包度量，不能用阈值内核高度替代完整字形边界，更不能反推精确字重。

替代字体对照：HeadlessChrome 156 / macOS，确认 ReiPod Sans 已加载，Canvas 使用 `700 16px "ReiPod Sans"` 和 -0.15px 字距；上述三个词组的可见墨迹宽约 81.3/88.1/102.4px，均以 1px=1u 比较。字形宽高与 advance 分开记录。差异因词组而异，无法靠统一缩放证明还原；照片误差及替代字体差异仍在。**本轮不修改字号、字重、行高或 CSS，不将英文样本外推到中文/数字。**

测量工具为 `scripts/measure-lcd-reference.mjs`，四角/标志点及扰动结果保存在 `.local/menu-calibration-08/`。工具输出的是采样敏感范围，不是置信区间或镜头误差的完整上界。仍待匹配固件的清晰中英文、数字、长标题及首尾滚动样本；C-M01/C-M02 整体还原验收未通过。


## 2026-10-30 机身入口提取的工程对照

`ClassicShell` / `ClassicStatusBar` 提取未改变 CSS 或参数。独立 HeadlessChrome 会话以 390×844、DPR 1、减少动态、已加载字体、背光始终开启与声音关闭，固定设置页“关于本机”选中；提取前后页面均为 settings。采集的状态栏/菜单全部计算样式、元素边界与 LCD PNG 像素一致。App 的 content ref 仍指向同一层 `.screen-content`，只读 LCD 与转轮关系不加 DOM 包装层。

原始 JSON/截图保存在忽略目录 `.local/shell-10/`。该结果仅证明此工程状态的等价，不扩展原机字体、几何或固件验收范围。


## 2026-10-30 菜单箭头与分屏投影：C-M01 局部修正

### 参考身份与使用范围

- G-H / G-S：沿用上一节 Gadgeteer 2007 classic 160GB 主菜单和设置照片及角点，固件未知；归一 320×240，角点 ±2 源像素、标志点 ±1。只量箭头和左右分屏，不据此补中文字体或固件常量。
- C-H：dyobmit 的 [2007-09-15 黑色 classic 6G 实拍](https://commons.wikimedia.org/w/index.php?title=File:IPod_classic_6G_black_new_interface-2007-09-15.jpg&oldid=1063785372)，[原图](https://upload.wikimedia.org/wikipedia/commons/e/e2/IPod_classic_6G_black_new_interface-2007-09-15.jpg)，CC BY 2.0；2592×1944，SHA-256 `a1dbb1f952733bc87a93bb19bb0099b5559ec92ac83ce52ee1f2b1c11212560d`。容量/固件未知，英文主菜单、Music 选中、无播放，标题显示时钟；不用于证明 ReiPod 的标题或设备容量。
- C-H LCD 四角 TL/TR/BR/BL 为 (381,551)/(1054,109)/(1497,421)/(808,952)，人工角点约 ±4 源像素；四角单应变换到 320×240。明显摩尔纹、倾斜拍摄及曝光限制了精度，图像分辨率更高不等于每个像素都可测。
- [Ars 2007 第一手评测](https://arstechnica.com/gadgets/2007/09/the-ipod-gets-a-makeover-a-review-of-the-ipod-nano-and-ipod-classic/) 的新界面段明确描述左菜单向右侧预览投影；它支持层次关系，不给出阴影宽度或 CSS 颜色。

### 指标、差异与实现

| metricId / 状态 | 参考观察与不确定性 | 修改前 → 本轮实现 | 状态/边界 |
| --- | --- | --- | --- |
| MENU.chevron.footprint / C-M01 | G-H 完整可见轮廓粗读约 7–9×11–14u，约 ±2u 级；阈值 160/190 的白色内核仅 7×11 / 6×10u，高阈值会丢笔画；C-H 只作轮廓交叉对照 | 9×15u SVG 盒、24×24 viewBox 下含描边约 3.75×6.38u；收紧至 7 3 12 18 后约 7.5×12.75u，盒和行内位置不变 | M 粗测 + P 拟合；不是恢复出的原始 bitmap，测试范围 6–10×10–16u 仅防止留白回归 |
| MENU.chevron.visibility / C-M01 | G-H/G-S/C-H 的进入箭头只在选中项显示，未选中项无黑色箭头 | 分屏菜单非选中箭头改为 visibility:hidden，保留占位；规则放在场景自身，离开时克隆页仍保留正确状态，不外推到全宽服务/账户菜单 | M 定性直接证据；跟随当前选中行，原有无箭头叶子项保持 |
| MENU.preview.shadow / C-M01 | G-S 归一 x≈161 起，背景在约 177–181u 恢复，宽约 16–20u；保守约 ±5u 级观察误差，不是置信上界。取 y65…145 的 G 通道中位：x161/167/171/175/179≈104.5/123/141/153/159 | 旧泛用 inset 3px/6px/#16181b0b 会被封面和卡片盖住；改为预览内容上方的 18u 宽线性黑色 40%→透明覆盖层，pointer-events:none | 阴影存在/方向有直接证据，宽度为 M 粗测；18u、40% 和线性曲线均为 P 视觉拟合，照片 RGB 不是固件色值 |
| MENU.grid / TEXT.layout / C-M01 | 原行距/标题粗测仍只有既有精度，中文和精确字体待证据 | 保留 20u 标题、24u 行距、16u 替代字体、文字 bearing/字距及预览布局 | 本轮未校准，不因新箭头用例通过而升级状态 |

### 工程对照与验收边界

固定工程状态为中文主菜单“设置”选中、无播放、电量 100%、点击音关闭、背光常亮、减少动态；浏览器 1280×900、DPR 1，实际 LCD 320.578×240.422 CSS px，元素坐标按宽度/320 归一。原机照片为英文，工程截图不能据此宣称中文实机字体一致。

实际修改前后 LCD PNG 同为 321×240，4478 个像素变化，变化仅在 x142…177 的箭头/分界区域；该区域外像素全等。相同主页计算样式/边界采集共 57 元素，除 5 个 SVG path 的可见几何外，其余元素边界和 LCD 盒不变。主菜单 Music 选中另有封面对照，但前后封面裁切并非严格一致，不用它作像素等价结论；设置页的晚采集 before 也不作本轮基准。

新增三视口（320/390/1280×900）工程用例验证实际箭头笔画和绘制在封面/不透明卡片上方的阴影像素；固定色探针只用于测试图层覆盖，真实产品截图保留原封面/卡片。原图、归一/阈值采样、完整 computed style、真实 before/after 和独立对照图留在忽略目录 `.local/ui-27/`，不分发参考照片。

C-M01 只完成箭头与预览层次的局部修正；字体、标题/图标原始像素、中文/数字、长标题/滚动及完整固件身份仍待证据，整体实机还原验收未通过。
