# 原机功能与菜单对照

当前实现基线为 **2007 iPod classic 6G / 320×240**，容量、固件版本未知；不是 Apple 固件，也未完成全功能或逐像素还原。nano、mini、其他 iPod 代际须另建证据。状态更新时间：2026-11-05。

## 本轮已落实

| ID | 原机证据 | 当前实现与边界 |
| --- | --- | --- |
| C-F01 菜单 | [2007 Music 实拍](https://the-gadgeteer.com/assets/apple-ipod-classic-11.jpg)、[Settings 实拍](https://the-gadgeteer.com/assets/apple-ipod-classic-42.jpg)，固件未知 | 已支持项目按实拍相对顺序排列；主菜单 LCD 标题为 iPod。未实现的原机项目不显示空入口。服务、导入、歌词开关、外观及许可集中在“设置 → ReiPod 设置”。此扩展分组明确属于 ReiPod |
| C-F02 搜索输入 | Apple《iPod classic Features Guide》[72页版](https://www.manuallib.com/download/IPOD-CLASSIC-FEATURES-GUIDE.PDF)，印刷pp7–8，出版修订未确认；[官方2008/120GB版](https://cdsassets.apple.com/live/6GJYWVAV/user/ma630_ipod_classic_120gb_en.pdf)相同行为作为旁证 | 轮盘选字、Center输入；Next空格、Previous退格；输入首字起实时显示结果，MENU结束编辑并选中顶部Search行，Center可继续编辑；编辑时长按前后键不快进当前歌曲 |
| C-F03 搜索结果 | 同上；[2007搜索实拍](https://image.theregister.com/208122.webp?imageId=208122&width=960&format=jpg)见[原评测](https://www.theregister.com/2007/09/13/review_apple_ipod_classic/?page=3)，固件未知 | 本地按项目名称的连续片段匹配歌曲、艺人、专辑、播放列表、音频播客。艺人/专辑/列表按类型进入对应范围，不自动播放；歌曲选中后播放匹配的可播放结果。排序、混合结果队列、中文字符补充是ReiPod适配；不再搜索文件名或歌词。网络/系统音乐目前仅歌曲搜索，不宣称相同类型覆盖 |
| C-F04 设置还原 | 72页版印刷p10及p59（Reset Settings为末项） | “还原设置”保留末项，进入确认且默认取消；还原已支持的固件设置及随机/重复模式。保留音乐、歌单、账号、当前播放、机身/背景、歌词扩展选择。默认值、确认页几何和返回路径沿用ReiPod实现，未完成原固件语言选择/默认矩阵核验 |
| C-F05-A 分类基础分层 | [Stan Brown亲自操作记录与照片](https://brownmath.com/general/itunes.htm#iPodBrowse)、[Register 2007同期实测](https://www.theregister.com/2007/09/13/review_apple_ipod_classic/?page=3)；详见HARDWARE_RESEARCH任务66 | 本地风格→艺人→专辑→歌曲，作曲者→专辑→歌曲；风格显示艺人/专辑统计。按当前标签范围过滤后生成专辑与队列，MENU返回与重进分别保留焦点。Center继续浏览，分类行Play播放该分类；聚合入口可浏览全部。不是C-F05全部原机验收 |
| C-F06-A 专辑随机与本地On-The-Go | Apple Features Guide [72页镜像](https://www.manuallib.com/download/IPOD-CLASSIC-FEATURES-GUIDE.PDF)印刷pp27–28，出版修订未确认；[官方2008/120GB版](https://cdsassets.apple.com/live/6GJYWVAV/user/ma630_ipod_classic_120gb_en.pdf)印刷pp28–30旁证 | 随机关闭/歌曲/专辑，专辑块随机且按可用碟号/曲序排列，保留当前播放位置和已播前缀；设置与播放页三选项同步，兼容旧boolean偏好。On-The-Go支持本地歌曲/集合加入、去重、移除、编号保存并清空工作列表、清空确认；已保存副本不提供内容编辑，保存/清空失败保留原列表。长Center歌词菜单保留，标题确认反馈为暂定适配 |

Settings现有相对顺序：关于本机 → 随机播放 → 重复播放 → 主菜单 → 音乐菜单 → 音量上限 → 背光时间 → 亮度 → 转轮声音 → **ReiPod设置（扩展）** → 还原设置。Music现有顺序：Cover Flow → 播放列表 → 艺人 → 专辑 → 歌曲 → 风格 → 作曲者 → 搜索。这是已支持项目的顺序，不是原机完整菜单清单。

搜索呈现恢复横向字母条、顶部Search行、类型标记及上下两行结果，取代通用25格输入器。照片颜色/字符度量/精确行高尚未通过原机验收，参数状态与工程截图方法见 [UI_METRICS.md](UI_METRICS.md)。歌单命名继续使用独立的通用编辑器。

## 尚未完成与下一步

| ID | 已有能力 | 缺口与验收材料 |
| --- | --- | --- |
| C-F05 原机浏览层级 | C-F05-A基础分层、按范围的曲序/队列、聚合与焦点记忆；C-F06已接入可用碟号排序 | 单专辑自动跳级、编译专辑规则、sort-as与匹配2007固件的连续操作证据仍待补；源照片固件未知，不标整项完成。远程服务菜单保持原能力范围 |
| C-F06 播放模式 | C-F06-A工程功能已实现，重复/评级原功能保持 | 精确固件闪烁时序/菜单几何、原生真实队列/后台验收仍开放；元数据不足不能保证分组与原机数据库完全相同。On-The-Go只管理ReiPod本地音乐，不写系统/云端歌单，不含iTunes同步 |
| C-F07 长列表与设置 | 记忆焦点、菜单定制、亮度/背光/音量上限 | 快速字母跳转、原机多页About、EQ/音量平衡、语言、原机Clicker选项及默认值矩阵尚不全 |
| C-F08 附加功能 | 时钟、本地文本、照片/幻灯片、音频播客与断点 | 世界时钟/闹钟/计时器/秒表、日历/通讯录/游戏、原机照片设置等不全；需逐功能实现且提供真实存储/操作 |
| C-F09 未支持媒体/硬件 | 本地网页音频及各平台独立适配器 | 视频/有声书、电视输出/收音机附件/录音/磁盘模式未实现；不增加伪装可用菜单，不借网页能力声称硬件支持 |
| C-F10 逐状态视觉 | 部分实拍/动画测量、独立绘制图标、浏览器工程回归 | 精确字体、中文固件、状态图标、搜索键盘/无结果/重置的匹配固件实拍仍缺。O03/U01保持开放 |

用户此前指定的全封面主菜单播放预览、长Center歌词、歌词开关、账户/VIP反馈继续保留；现代歌词动画另查 [LAZER_RESEARCH.md](LAZER_RESEARCH.md)。它们是明确保留的扩展，不用“以原机为准”暗中删除。

任务66–67已实现C-F05-A/C-F06-A；剩余固件行为、真实平台和视觉证据继续开放。下一工程单元为C-F07快速字母跳转与设置；播客真机验收保留为独立POD02，不阻塞classic功能。接续见 [TASK_LOG.md](TASK_LOG.md)。


POD01（2026-11-05）：新增用户指定的 iPhone 系统播客接入，属 ReiPod 平台扩展，不是原 classic 固件功能恢复或 C-F08 全部完成。入口、系统可见范围及真机未验证边界见 [ios/README.md](ios/README.md#iphone-系统播客pod01)。普通网页继续支持本地音频播客导入。
