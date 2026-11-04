# Lazer 研究与后续任务

用户在 2026-10-28 指定研究 `chuxuehaocai/Lazer`，先解决登录，再实现图中的内置协议与逐字歌词。

研究固定在默认分支 nextgen 的修订 [5f047da71f8468529b0bcd32801cfdaaca41f335](https://github.com/chuxuehaocai/Lazer/tree/5f047da71f8468529b0bcd32801cfdaaca41f335)。这是该项目实现与观察，不等于平台官方接口保证。

## 2026-10-28 登录问题与当时的研究

- 用户报告网易云仍提示“请切换其他登录方式或升级新版本”，QQ 在手机确认后未登录。
- Lazer 的 [扫码说明](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/docs/login-qr.md) 指出其客户端扫码用 `music.163.com/api/login/qrcode/unikey` 和 `/api/login/qrcode/client/login` 原始表单，而不是 EAPI 信封。它报告信封路线可能持续等待，不能用 801 证明扫码可完成。
- [路由表](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/gateway/routes.dart) 为扫码显式选择 plain，轮询包含 `secureCaptcha`；账户状态继续走 WEAPI。ReiPod 0.1.2 按此选择协议，并兼容 `__csrf_token`，保留扫码响应 Cookie。
- 8821 是平台要求安全验证；不得伪装成成功，或用循环请求冒充解决。ReiPod 显示明确原因，要求用户在平台完成验证后重新尝试。
- 确认后读取账户可能有短暂延迟；只对网易云扫码候选会话的账户 401 做有限重试，不修改已登录账户的失效处理。
- QQ serverless 适配器会把轮询网络异常暂时当作等待，而且每次调用重建状态。ReiPod 增加宿主网络失败检测，让失败明确显示目标主机和路径，不包含查询参数、Cookie 或令牌。QQ 真实失败原因仍须通过该错误信息确认。

## 2026-10-29 逐字歌词实现

图中需求包括：客户端内置 WEAPI/EAPI；自管会话、缓存、请求；LRC/YRC 解析；逐字高亮、emphasized 弹簧、渐进遮罩和距离模糊。

当前核查固定修订 [87880db62dc99753ee1a0d6c3c3bfcabfadb4be4](https://github.com/chuxuehaocai/Lazer/tree/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4)。旧路径现为重新导出，实际实现已移至 `lib/lyrics/`。

- 复用范围：移植 [lyric_document.dart 的 YRC 解析](https://github.com/chuxuehaocai/Lazer/blob/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4/lib/lyrics/lyric_document.dart)，根目录 MIT，版权及完整许可附于 `public/third-party-licenses.txt`。ReiPod 补充非法时间校验，并保留本地纯文本/LRC 兼容。
- 未复制的实现：[timed_line.dart](https://github.com/chuxuehaocai/Lazer/blob/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4/lib/lyrics/timed_line.dart)、`word_motion.dart`、`viewport.dart`、`spring.dart` 明确标注 AGPL-3.0-or-later。ReiPod 动画是独立的 React/CSS 实现，不是将这些文件转译后标作 MIT。
- 协议：App 已有 WEAPI/EAPI，继续隔离运行；参照路由表补齐 `/api/song/lyric/v1`。服务器使用固定依赖的 `lyric_new`，旧接口作网络/功能失败回退；401 保持失效授权，不靠回退掩盖。只返回 LRC/YRC 文本，不向网页暴露平台 Cookie。
- 数据：YRC 使用歌曲绝对毫秒，优先逐字，缺少/格式无效时回退 LRC；QQ 保留原有逐行歌词。本地同名 `.yrc` 与 `.lrc` 都可导入。缓存沿用 provider/track/session 隔离，退出后旧响应不能写入新账户。
- 动画：只在歌词页按媒体位置绘制当前行词片段，播放中在两次时间更新间做有上限的插值；暂停停帧、定位重算、间奏清除活动行，后台停掉 RAF。每帧不触发 React 状态更新，只有活动行变化才更新状态。
- 效果：字词内裁切高亮、长词轻微阻尼弹簧强调、视口边缘渐隐及按行距模糊；减弱动态效果关闭位移/缩放和模糊。转轮浏览后恢复跟随，包括暂停时的恢复。保留歌词开关和长中心键入口。

以下为2026-10-29首版参数（已被2026-11-05任务55替代）：动效参数集中于 `src/ui/motion.ts` 的 `lyricMotion`。焦点 35%、2.5 秒手动浏览保留、弹簧质量 1/刚度 100/阻尼 10、3.5% 强调及模糊半径均为 **ReiPod 产品参数**，不是旧固件测量。小屏文字不会使用全屏音乐 App 的大幅位移。

修改前通过确定性 fixture 读取最终级联：390px viewport 下歌词行 18px/25.2px，既有边缘遮罩 16%/84%、邻行 blur 0.8px。它们只描述旧实现，不是硬件证据。本次将 `style.css` 和 `classic-lcd.css` 中重复的歌词列表规则合并到后者，再扩展逐字样式；未更改 LCD/外壳几何。

验证：96 项单测、15 项后端测试、42 项浏览器回归通过；320/390/960px 的暂停、定位、间奏、切歌、转轮恢复和 reduced motion，以及本地 YRC 导入与刷新恢复均有确定性 fixture。生产构建、产物检查、体积预算和 iOS 资源生成通过，未把资源生成当作真机验证。

真实账号返回 YRC、会员播放和 iPhone 后台/锁屏歌词同步仍需验收。浏览器 fixture 和协议签名向量不代替这些结果。

研究入口：[歌词数据](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/data/lyrics.dart)、[逐字渲染](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/widgets/timed_lyric_text.dart)、[逐字动画](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/animation/lyric_word_motion.dart)。旧修订入口保留作历史来源；本次实现依据上面的固定新修订。

根目录 LICENSE 为 MIT，但仓库另含 `licenses/lyric_animation/AGPL-3.0.txt`。借用前必须检查具体文件的来源与适用许可，不得将根目录 MIT 当作全部动画代码的许可。优先独立实现，不复制参考项目动画代码和资源。


## 2026-11-05 按指定项目对齐主要歌词动效（任务55）

用户要求按此前Lazer项目实现，替代首版“整词轻微缩放+浏览器smooth滚动”。继续固定87880db修订，以[viewport](https://github.com/chuxuehaocai/Lazer/blob/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4/lib/lyrics/viewport.dart)、[timed_line](https://github.com/chuxuehaocai/Lazer/blob/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4/lib/lyrics/timed_line.dart)、[word_motion](https://github.com/chuxuehaocai/Lazer/blob/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4/lib/lyrics/word_motion.dart)和[spring](https://github.com/chuxuehaocai/Lazer/blob/87880db62dc99753ee1a0d6c3c3bfcabfadb4be4/lib/lyrics/spring.dart)的可观察行为/公开参数作对照；文件AGPL归属不因根目录MIT而改变。没有把这些Flutter渲染器、求解器或其采样表转译后标作MIT，也未静默改变ReiPod全项目许可。

- **行运动**：替代浏览器原生smooth滚动；保持真实滚动容器，用位置补偿及自有数值积分让可见行独立弹簧归位、错时跟随，反向定位保留速度。参考基线位置质量0.9/刚度170/阻尼29，缩放刚度100/阻尼25，当前行1/其他行0.97，50ms错时及后行衰减1/1.05；焦点仍35%。原项目按间隔切换弹簧的全部策略尚未逐项移植，当前固定阻尼基线是工程适配。
- **逐字符**：Intl.Segmenter按字素拆分，连字emoji与组合音符不拆断。短词单调上浮到0.05em；持续至少1秒的中日韩字词或短英文词分字符错时强调，尾词延长/增强，并随时长调整强度。字形使用公开曲线(0.2,0.4,0.58,1)/(0.3,0,0.58,1)的独立计算，不再按整词套0.035缩放。
- **高亮**：按词的实际字形累计宽度推进，遮罩边缘宽度为字号的一半；替代硬clip，未来词边界为负值，不在等待时预先涂亮。光晕按持续词相位变化；经典LCD保留黑/灰文字配色，而非照搬大屏播放器的白色主题。
- **距离与阅读**：模糊随行实际视口距离变化，最大5px；统一字重避免焦点切换改变字宽。手动转轮期间清除模糊便于阅读，2.5秒后跟随；暂停冻结字形时间，行弹簧可完成归位；定位按媒体时间重绘。后台停止RAF，恢复时同步位置；减弱动态关闭位移/缩放/光晕/模糊，保留静态时间高亮。

实现分工：`lyricEffects.ts`为字素/公开效果的独立数学实现和通用阻尼积分；`useLyricLayout.ts`管理行位置、轮盘与可见范围；`Lyrics.tsx`按媒体时间绘制当前行并缓存宽度，动画帧不更新React状态，仅活动行变化更新；CSS集中classic-lcd，不添加新库。仅近视口行参与逐帧位置与模糊更新；行布局读取在重定向/尺寸变化时进行。

本轮对齐了以上主要效果，不宣称Flutter原版的全部间奏/二重唱/翻译/导出/指针选择功能已复刻，也不宣称不同渲染器逐帧像素相同。它是用户指定的现代歌词扩展，不是2007固件行为。工程对照/验证见 [UI_METRICS任务55](UI_METRICS.md#2026-11-05-lazer歌词动效任务55) 与 [TASK_LOG.md](TASK_LOG.md)。
