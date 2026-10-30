# ReiPod 项目结构

统一开发入口：[DEVELOPMENT.md](DEVELOPMENT.md)。每次任务先读写 [TASK_LOG.md](TASK_LOG.md)。本文件描述实际目录和放置规则，四层依赖契约由总纲维护；目录存在不代表分层迁移已经完成。

## 实际目录

```text
ReiPod/
├── src/
│   ├── main.tsx            # 浏览器挂载与全局样式加载
│   ├── app/App.tsx        # 应用装配：会话、服务、导航与输入连接
│   ├── player/            # 本地播放、队列、资料库、存储、歌词解析
│   ├── services/          # 服务路由、平台能力、账户与原生传输
│   ├── input/             # Click Wheel、手势、鼠标和输入反馈
│   ├── ui/                # 当前 classic 菜单、屏幕、显示状态与动画
│   ├── media/             # 照片、播客、文本导入与存储
│   ├── fonts.css          # 字体声明
│   └── style.css          # 机身/全局样式，仍有待收敛的历史级联
├── server/                # 可自托管 Node HTTP 音乐服务与会话边界
├── bridge/                # iOS 内置服务的无 Node 运行时
├── ios/
│   ├── ReiPod/            # Swift 容器、MediaPlayer、网络桥与原生资源入口
│   ├── ReiPodTests/       # 原生边界和 Web 资源检查
│   ├── project.yml        # XcodeGen 项目输入
│   └── README.md          # 原生构建、安装和验证说明
├── tests/browser/         # Playwright 交互、服务隔离与宿主替身
├── scripts/               # 构建、校验、资源生成与本地开发命令
├── public/                # 原样发布的字体、试听资源、许可与公开配置
├── assets/screenshots/    # README 展示截图，非原机校准基线
├── vendor/                # 第三方来源归属/许可
├── .github/workflows/     # CI 与静态站点发布
└── *.md                   # 维护中的公开规范与使用说明
```

`dist/`、`node_modules/`、`.local/`、`analysis/`、`docs/` 和生成的 iOS Web/Xcode 构建输出不进入 Git。`.local/` 等研究目录不承载公开规范；不能为了发布文档取消整目录忽略。

## 关键入口与边界

| 入口 | 实际职责 | 维护约束 |
| --- | --- | --- |
| `src/main.tsx` | 挂载 React，加载字体及三层样式 | 不放服务、队列或机型业务逻辑 |
| `src/app/App.tsx` | 连接播放/账户/导航/输入，当前仍有较多编排逻辑 | 后续逐用例抽离控制器；不能增加所有机型的巨型条件分支 |
| `src/player/Player.ts`、`store.ts`、`session.ts` | 本地播放与会话、队列、资料库状态连接 | 不依赖机身组件；核心与 React 绑定仍须按实际依赖逐步梳理 |
| `src/services/musicServices.ts` | 选择服务、路由播放、远程快照、Media Session | 使用服务中性命名；浏览服务与实际播放服务分别处理 |
| `src/services/thirdPartyMusic.ts` | 网易云/QQ 的账户、请求与播放器连接 | 切换取消旧请求，保持 provider/account/library/queue 隔离 |
| `src/services/musicTransport.ts` | iOS 内置网络服务传输 | 不扩展成任意 URL 代理 |
| `src/services/nativeMusic.ts`、`NativeSystemPlayer.ts` | 原生系统音乐能力及播放桥 | 授权、后台与锁屏分别实测 |
| `server/` | HTTP 操作、provider 归一化、登录与加密会话 | 凭证留在边界内；部署验证查 SERVER_DEPLOYMENT |
| `bridge/` | 内置运行时复用 provider 操作 | 与 HTTP 宿主独立；共享前先核对存储、并发和取消契约 |
| `src/input/` | 将轮盘/鼠标/键盘相关输入转换为操作 | 输入能力按机型区分，触屏不能假装轮盘 |
| `src/ui/` | 当前 classic 的导航、屏幕、预览与运动 | 不创建第二份播放/账号状态；不是全机型通用固件 |
| `src/media/` | 附加本地媒体和阅读数据 | 保留导入、恢复与存储边界 |

## 样式与资源

加载顺序固定为 `fonts.css → style.css → ui/classic-lcd.css → ui/firmware-display.css`。后三份是当前历史级联，不能称为三个主题；组件改动前检查最终 computed style，再合并已证明被覆盖的定义。运动实现入口为 `src/ui/motion.ts`。

当前外观偏好在 `src/ui/preferences.ts` 等既有路径，尚无独立主题注册系统。未来机型模块先由 classic 的实际接口提取，再接第二机型；没有实现的模块不预建空目录，也不把原机待测参数填成默认常量。

`public/` 文件会随站点公开发布，配置只能包含公开信息。私有原图、录屏、固件、cookie、token、签名密钥继续排除。派生资源由脚本生成，生成命令和提交策略见总纲及原生说明。

## 测试与工具放置

- 纯逻辑与模块测试邻近实现，使用现有 `*.test.ts` / `*.test.mjs` 约定。
- HTTP 服务测试使用 `server/*.node-test.mjs`，通过 `npm run test:music-server` 运行。
- 跨模块用户流程放 `tests/browser/*.pw.ts`，共享 fixture 留在同目录；mock 结果不算真实平台验证。
- 构建/资源脚本放 `scripts/`，在 package.json 暴露稳定命令；脚本路径变化须同步 CI、调用脚本与文档。
- 原生测试放 `ios/ReiPodTests/`；生成资源不手工移动或提交。

## 文档阅读路径

1. 每任务入口：DEVELOPMENT → AGENTS → TASK_LOG，随后按任务读取专题。
2. UI：DEVICE_STANDARDS → UI_METRICS → UI_STANDARDS → REPLICA / HARDWARE_RESEARCH / PLAYBACK_INTERACTIONS。
3. 服务：MUSIC_SERVICES → MUSIC_BRIDGE / SERVER_DEPLOYMENT；原生变更另读 ios/README。
4. 用户说明：README / README.zh-CN / USER_GUIDE；许可与归属：THIRD_PARTY_NOTICES。

详细文档职责只维护在开发总纲，当前进度只维护在任务日志。移动文件时同步 import、构建/测试入口、配置和所有当前路径说明，并执行适用检查；历史记录注明原路径即可。
