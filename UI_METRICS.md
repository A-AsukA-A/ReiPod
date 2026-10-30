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
