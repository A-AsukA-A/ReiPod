# 代码与素材来源

## ipod-classic-js

- 项目：<https://github.com/tvillarete/ipod-classic-js>
- 核对提交：`e91d2b6b8cadf72e8a807c521f9297936a51efbb`
- Copyright (c) 2019 Tanner Villarete，MIT。完整许可保存在 [vendor/ipod-classic-js/LICENSE](vendor/ipod-classic-js/LICENSE)，随生产包附带 [public/third-party-licenses.txt](public/third-party-licenses.txt)。
- `src/input/geometry.ts` 抽取并修改 `app/components/ClickWheel/helpers.ts` 的 `getCircularBoundingInfo` 与 `getAngleBetweenPoints`；角度保留浮点精度，新增逐采样圆周展开。
- `ClickWheel/index.tsx` 中的角度选择、旋转取消点击、事件驱动导航结构用于参考；ReiPod 使用 Pointer Events / pointer capture 重新衔接，补中心死区、取消 / 移出处理、累计拖动判定、慢速阈值及快速加速。不引入 Motion、Styled Components、Next.js 或原项目的音乐账号依赖。
- 菜单、返回栈、行焦点记忆与清空确认独立实现，不声称移植了上游整套页面管理器。

## 其他运行依赖

music-metadata 12.3.2：Borewit，MIT，用于在本机解析音频标签、内嵌封面和歌词；通过动态导入按需加载。完整许可见 [public/music-metadata-license.txt](public/music-metadata-license.txt)，同时收录于发行包的开源许可文件。

React / React DOM / Scheduler：Meta Platforms, Inc. and affiliates，MIT。运行依赖的完整许可汇总于 `public/third-party-licenses.txt`，包括 music-metadata 依赖的 MIT / BSD 许可；纯类型包 @tokenizer/token 编译后不进入 JavaScript。开发工具及传递依赖的版本由 `package-lock.json` 锁定，各包原许可同时由其 npm 包提供。

## 视觉与测试音频

机身、屏幕、唱片图形、按钮 SVG、favicon 全部由本项目 CSS / SVG 绘制；LCD 使用本地提供的 Noto Sans SC 字体，不请求远程字体服务。未使用 `analysis/` 下的 My Classic 私有素材、Apple 网页图片、艺术家封面或签名。

Noto Sans SC：Google / Adobe，SIL Open Font License 1.1；源文件来自 [google/fonts](https://github.com/google/fonts/tree/main/ofl/notosanssc)。使用 FontTools 限制字重为 400–700 并按字符覆盖拆分为 WOFF2，生成脚本为 `scripts/subset-font.py`。完整字体许可随站点提供于 [public/fonts/OFL-NotoSansSC.txt](public/fonts/OFL-NotoSansSC.txt)。不是 Apple 原机字体。

`scripts/create-test-audio.mjs` 合成三段原创 12 秒 PCM WAV，用于解码 / 连播检查；输出保存在忽略目录 `.local/`。

公开试听：`public/music/` 包含 Kevin MacLeod 的《Carefree》《Monkeys Spinning Monkeys》《Sneaky Snitch》完整曲长 AAC-LC/M4A，使用 CC BY 4.0；从原 MP3 重新编码为 64 kbps、32 kHz 立体声，未裁剪曲长。来源、许可及署名见 [public/music/credits.txt](public/music/credits.txt)，播放器「设置 → 试听曲目版权」可查看。`src/player/demoCatalog.json` 保存官方曲目页、许可地址、原始与分发文件的字节数/SHA-256 及转码说明；构建检查只允许这些明确列出的公开音频。

早期私人开发试听素材：Apple iTunes Search API 返回的周杰伦《告白气球 (Live)》《千山万水》各约 30 秒 AAC 试听片段，仍仅保存在本机忽略目录 `.local/test-music/`；不进入公开仓库、构建或当前试听菜单。
