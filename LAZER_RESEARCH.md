# Lazer 研究与后续任务

用户在 2026-10-28 指定研究 `chuxuehaocai/Lazer`，先解决登录，再实现图中的内置协议与逐字歌词。

研究固定在默认分支 nextgen 的修订 [5f047da71f8468529b0bcd32801cfdaaca41f335](https://github.com/chuxuehaocai/Lazer/tree/5f047da71f8468529b0bcd32801cfdaaca41f335)。这是该项目实现与观察，不等于平台官方接口保证。

## 当前优先：真实登录仍失败

- 用户报告网易云仍提示“请切换其他登录方式或升级新版本”，QQ 在手机确认后未登录。
- Lazer 的 [扫码说明](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/docs/login-qr.md) 指出其客户端扫码用 `music.163.com/api/login/qrcode/unikey` 和 `/api/login/qrcode/client/login` 原始表单，而不是 EAPI 信封。它报告信封路线可能持续等待，不能用 801 证明扫码可完成。
- [路由表](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/gateway/routes.dart) 为扫码显式选择 plain，轮询包含 `secureCaptcha`；账户状态继续走 WEAPI。ReiPod 0.1.2 按此选择协议，并兼容 `__csrf_token`，保留扫码响应 Cookie。
- 8821 是平台要求安全验证；不得伪装成成功，或用循环请求冒充解决。ReiPod 显示明确原因，要求用户在平台完成验证后重新尝试。
- 确认后读取账户可能有短暂延迟；只对网易云扫码候选会话的账户 401 做有限重试，不修改已登录账户的失效处理。
- QQ serverless 适配器会把轮询网络异常暂时当作等待，而且每次调用重建状态。ReiPod 增加宿主网络失败检测，让失败明确显示目标主机和路径，不包含查询参数、Cookie 或令牌。QQ 真实失败原因仍须通过该错误信息确认。

## 排队：内置协议与逐字歌词

图中需求包括：客户端内置 WEAPI/EAPI；自管会话、缓存、请求；LRC/YRC 解析；逐字高亮、emphasized 弹簧、渐进遮罩和距离模糊。

实施顺序：

1. 保留 App 内置服务、Web HTTPS 后端的传输边界；平台凭证不进入网页，协议路由按实际接口逐项指定。缓存按平台与会话隔离，退出撤销，避免跨账号缓存复用。
2. 扩展现有歌词数据结构、解析器与网易云歌词读取，提供 YRC 逐词时间和 LRC 回退；保留 QQ 与本地 LRC。
3. 在现有歌词开关和长中心键入口内实现逐字渲染，遵循 LCD 只显示、转轮可浏览、不干扰播放与队列的约定。
4. 对弹簧、遮罩和模糊独立制定 ReiPod 产品参数，不标作旧 iPod 固件行为；保持可中断并支持 reduced motion。
5. 用独立编写、可公开分发的确定性歌词 fixture 检查时间间隙、暂停、定位、切歌、长中英文、空歌词与视口表现。

研究入口：[歌词数据](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/data/lyrics.dart)、[逐字渲染](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/widgets/timed_lyric_text.dart)、[逐字动画](https://github.com/chuxuehaocai/Lazer/blob/5f047da71f8468529b0bcd32801cfdaaca41f335/lib/animation/lyric_word_motion.dart)。尚未完成这些歌词源文件的逐项实现研究。

根目录 LICENSE 为 MIT，但仓库另含 `licenses/lyric_animation/AGPL-3.0.txt`。借用前必须检查具体文件的来源与适用许可，不得将根目录 MIT 当作全部动画代码的许可。优先独立实现，不复制参考项目动画代码和资源。
