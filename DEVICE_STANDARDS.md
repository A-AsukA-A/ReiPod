# 机型与固件资料目录

统一入口：[DEVELOPMENT.md](DEVELOPMENT.md)。核查日期：2026-10-29。本目录记录来源的适用范围，不表示所有机型已实现。指标与逐状态验收见 [UI_METRICS.md](UI_METRICS.md)，测量方法见 [UI_STANDARDS.md](UI_STANDARDS.md)。

## 身份规则

每个机型配置必须同时记录 family、generation、hardwareRevision、capacity、firmware、locale、orientation、sourceIds。未知固件写 unknown，不能默认首发或最新版。颜色是主题属性；改变轮盘结构、屏幕坐标、导航或功能集则属于机型/固件变体。容量影响机身厚度时必须区分硬件。

[Apple 机型识别目录](https://support.apple.com/en-us/103823)用于核对外形与输入类型；[MacDB classic 目录](https://macdb.cn/ipod-classic)用于定位年份、容量与技术文档。两者都需要与对应规格、手册及实物交叉核对，不能独立作为完整固件规范。

## 已核对的硬件规格

尺寸顺序统一为高 × 宽 × 厚；屏幕坐标使用原生像素，不能与 CSS viewport 混用。以下是来源明示数值，不含制造公差；PPI 为来源标称，不用于反推毫米级开口位置。

| 机型/修订 | 官方外形数值 | 显示规格 | 一手来源 |
| --- | --- | --- | --- |
| classic 2007 80GB | 103.5 × 61.8 × 10.5 mm；140 g | 320 × 240；2.5 英寸；163 ppi | [C07](https://support.apple.com/en-us/112478) |
| classic 2007 160GB | 103.5 × 61.8 × 13.5 mm；162 g | 同 C07 | [C07](https://support.apple.com/en-us/112478) |
| classic 2008 120GB | 103.5 × 61.8 × 10.5 mm；140 g | 320 × 240；2.5 英寸 | [C08](https://support.apple.com/en-gb/112321) |
| classic late 2009 160GB | 103.5 × 61.8 × 10.5 mm；140 g | 320 × 240；2.5 英寸；163 ppi | [C09](https://support.apple.com/zh-cn/112601) |
| iPod 5，2005 30GB / 60GB | 4.1 × 2.4 × 0.43 / 0.55 英寸；4.8 / 5.5 oz | 320 × 240；2.5 英寸；点距 0.156 mm | [V05](https://support.apple.com/en-us/111923) |
| iPod 5，late 2006 30GB / 80GB | 4.1 × 2.4 × 0.43 / 0.55 英寸；4.8 / 5.5 oz | 320 × 240；2.5 英寸；点距 0.156 mm | [V06](https://support.apple.com/en-us/112454) |
| mini 1 / mini 2 | 页面英寸、厘米、克数存在冲突，外形精细建模待核 | 138 × 110；1.67 英寸灰阶；点距 0.22 mm | [M12](https://support.apple.com/en-mt/112317) |
| nano 1 | 3.5 × 1.6 × 0.27 英寸；1.5 oz | 176 × 132；1.5 英寸；点距 0.168 mm | [N1](https://support.apple.com/en-us/112507) |
| nano 2 | 3.5 × 1.6 × 0.26 英寸；1.41 oz | 176 × 132；1.5 英寸；点距 0.168 mm | [N2](https://support.apple.com/en-gu/112309) |
| nano 3 | 69.8 × 52.3 × 6.5 mm | 320 × 240；2 英寸；204 ppi | [N3](https://support.apple.com/en-us/112552) |
| nano 4 | 90.7 × 38.7 × 6.2 mm；36.8 g | 2 英寸；204 ppi；规格写作 320 × 240，竖屏坐标需按方向登记 | [N4](https://support.apple.com/en-gb/112320) |
| nano 5 | 90.7 × 38.7 × 6.2 mm；36.4 g | 240 × 376；2.2 英寸；204 ppi | [N5](https://support.apple.com/en-us/112495) |
| nano 6 | 37.5 × 40.9 × 8.78 mm（厚度含夹子）；21.1 g | 240 × 240；1.54 英寸；220 ppi；Multi-Touch | [N6](https://support.apple.com/en-ie/112432) |
| nano 7 | 76.5 × 39.6 × 5.4 mm；31 g | 240 × 432；2.5 英寸；202 ppi；Multi-Touch | [N7](https://support.apple.com/en-hk/112039) |

nano 7 的 2012 与 2015 配色修订须分开；上表不证明两版全部固件行为相同。nano 1/2 是纵向机身、横向 LCD，不能因为外壳细长便交换 LCD 宽高。nano 4 的横竖方向必须由对应状态画面验证，不从官方分辨率文字顺序推断整个导航坐标。

## 全系列覆盖与开发状态

本表是范围清单；“待补”是尚未完成的研究任务，不授权借用 classic 参数。

| 系列 | 必须独立登记的代际/修订 | 输入/显示边界 | 当前状态 |
| --- | --- | --- | --- |
| iPod 1 | 2001、2002 容量修订 | 可物理转动的 Scroll Wheel，环外四键；单色 | 识别来源已定位；精细规格、固件、逐状态证据待补 |
| iPod 2 | 2002 容量/平台修订 | 不转动的 Touch Wheel，环外四键；单色 | 同上；不能复用 Click Wheel 点击区域 |
| iPod 3 | 2003 首发及后续容量修订 | Touch Wheel，四键在轮盘上方；单色 | 识别来源已定位；屏幕与按键坐标待补 |
| iPod 4 | 2004 单色、U2 | Click Wheel；单色菜单 | 独立于 photo，规格/手册/状态测量待补 |
| photo / color | 2004 photo、2005 photo、2005 color、相应 U2 | 彩屏；照片/封面能力 | 外形容量变体不可合并；一手规格与固件证据待补 |
| iPod 5 | 2005 30/60GB、2006 late 30/80GB、U2 | 视频彩屏、Click Wheel；不等同 classic 分屏固件 | [2005 发布资料](https://www.apple.com/ca/newsroom/2005/10/12Apple-Unveils-the-New-iPod/)已定位；V05/V06 规格已核；型号冲突、固件与状态差异待补 |
| classic | 2007 80/160GB、2008 120GB、late 2009 160GB | Click Wheel、分屏/Cover Flow | 只有 2007 基线实现；其他版本未验收 |
| mini | 2004 4GB、2005 4/6GB | Click Wheel、灰阶；配色/轮盘字色按版本 | 规格已核部分；数值冲突、手册、实机测量待补 |
| nano 1/2 | 各容量、颜色及特别版 | Click Wheel、横向小 LCD | 硬件规格已核；固件状态与测量待补 |
| nano 3 | 各容量/颜色 | Click Wheel、横屏、视频/Cover Flow | 规格已核；对应原版手册与逐状态测量待补 |
| nano 4/5 | 各容量/颜色；两代分开 | 竖屏、旋转/Shake；5 代另有摄像/FM 等能力 | 规格/手册已核部分；实机几何与时序待补 |
| nano 6 | 2010 硬件；不同软件版本 | 方形触屏；主屏布局受软件版本影响 | 2011 手册已核，不证明首发版布局 |
| nano 7 | 2012 / mid 2015 | 竖屏触控、Home、独立播放/音量键、蓝牙 | 2015 手册已核，不证明 2012 全部状态 |

输入分型依据见 [Apple 识别目录](https://support.apple.com/en-us/103823)。本目录不覆盖 touch/shuffle 的新增实现。

## 官方手册与已确认的行为差异

页码为文档印刷页；PDF 物理页偏移必须在测量记录另填。

| ID / 资料版本 | 核查范围 | 对实现的约束 |
| --- | --- | --- |
| [G-C09：classic 160GB guide](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf) | pp.24–26 播放面板、Center、附加命令 | Genius/歌词有条件出现；后期手册不能证明 2007 首版循环 |
| [G-N4：nano 4 guide](https://cdsassets.apple.com/live/6GJYWVAV/user/ma629_ipod_nano_4th_gen_userguide.pdf) | pp.7–13 输入/HOLD；pp.34–40 播放/Cover Flow | HOLD 同时约束按键与动作感应；旋转/Shake 不是皮肤 |
| [G-N5：nano 5 guide](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1194_ipod_nano_5th_gen_userguide.pdf) | pp.8、37–39 | 旋转 90° 可进入 Cover Flow，可在设置关闭；Center 长按可打开附加命令；原版歌词是条件面板 |
| [G-N6：nano 6 guide，2011](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1551_ipod_nano_6thgen_user_guide.pdf) | pp.6、10–12、21；PDF 元数据日期 2011-09-28 | 点按封面显示控件，横扫进入后续面板；空白区长按返回主屏；精细定位向上移手指；Sleep/Wake 双击动作可配置 |
| [G-N7：nano 7 guide，2015](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1624_ipod_nano_2015_user_guide.pdf) | pp.4、9–11、18–19；PDF 元数据修订 2015-07-01 | 有 Home 与侧面播放键；精细定位向下移手指；双击侧面播放键切下一首；不能照搬 nano 6 手势方向 |

已将 nano 6 p.21、nano 7 p.19 渲染核对，确认正文与图标对应关系；手册插图仍不是 LCD 像素测量基准。ReiPod 长 Center 歌词入口继续作为明确产品扩展，不能被原版长按菜单取代。

## 冲突与不可采纳结论

| 编号 | 发现 | 处理 |
| --- | --- | --- |
| X01 | MacDB 2007 classic 把 80/160GB 合在 10.5 mm 厚度行 | 用 C07 分开：160GB 为 13.5 mm；不能从索引合并建模 |
| X02 | M12 页面顶部 .54 英寸、厘米与第一代正文 .5 英寸不完全一致；第二代正文克数与盎司冲突 | 保留原文来源，外形精细值/重量暂不晋升规范；补同期原始规格或图纸 |
| X03 | Apple 识别页核查时把普通 5 代条目写为 A1238，同页 U2 5 代条目写 A1136；与常见 5 代识别存在冲突 | 不自动导入型号字段；须用机背照片、对应技术资料交叉确认 |
| X04 | MacDB 初代 U2 标题出现“第3代”，描述/型号对应 Click Wheel | 按目标硬件核对，不采用标题代际 |
| X05 | nano 4 官方分辨率顺序与竖屏状态坐标不是同一个概念 | 保存原文 tuple 与实际 orientation；禁止默认宽高顺序 |
| X06 | 2026 Apple 配件指南 R32 全文未检出 iPod；当前尺寸图目录没有 iPod | [当前指南](https://developer.apple.com/accessories/Accessory-Design-Guidelines.pdf)不能证明历史 iPod 几何 |
| X07 | 2017-09-21 历史指南镜像目录含 iPod 图纸，下载被远端 403 拒绝，未核图纸 | [镜像入口](https://manuals.plus/m/86b9af196de65a103ec1095ad3421c275dc60bb1cacb7ce71b7ac7bedb7322e7)仅作待查线索，不采纳尺寸/页码为已验证证据 |

不把网站当前更新时间当作原设备资料发布日期，不把来源为 Apple 当作页面绝无录入错误。失败链接与冲突是研究结果的一部分。


检索未取得正文的一手线索：[Scroll Wheel SP103](https://support.apple.com/kb/SP103)、[photo SP66](https://support.apple.com/kb/SP66)。本轮工具无法访问，尚未采纳其数值；后续优先查原始 Apple 页面归档或对应说明书，不以百科表格填补。


实现入口补充（2026-10-30）：当前配置 `src/models/classic.ts` 覆盖既有 classic-2007 实现，LCD 规格引用 C07；capacity/firmware 均为 null，尚不区分 80/160GB 外壳厚度，也不把所有后期手册行为标为首发固件。它不等于本目录全部机型已接入。
