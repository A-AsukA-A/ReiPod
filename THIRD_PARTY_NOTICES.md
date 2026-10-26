# 代码与素材来源

## ipod-classic-js

- 项目：<https://github.com/tvillarete/ipod-classic-js>
- 核对提交：`e91d2b6b8cadf72e8a807c521f9297936a51efbb`
- Copyright (c) 2019 Tanner Villarete，MIT。完整许可保存在 [vendor/ipod-classic-js/LICENSE](vendor/ipod-classic-js/LICENSE)，随生产包附带 [public/third-party-licenses.txt](public/third-party-licenses.txt)。
- `src/input/geometry.ts` 抽取并修改 `app/components/ClickWheel/helpers.ts` 的 `getCircularBoundingInfo` 与 `getAngleBetweenPoints`；角度保留浮点精度，新增逐采样圆周展开。
- `ClickWheel/index.tsx` 中的角度选择、旋转取消点击、事件驱动导航结构用于参考；ReiPod 使用 Pointer Events / pointer capture 重新衔接，补中心死区、取消 / 移出处理、累计拖动判定、慢速阈值及快速加速。不引入 Motion、Styled Components、Next.js 或原项目的音乐账号依赖。
- 菜单只需四个页面，独立实现本轮页面切换，不声称移植了上游整套页面管理器。

## 其他运行依赖

React / React DOM：Meta Platforms, Inc. and affiliates，MIT。发行声明见 `public/third-party-licenses.txt`，原许可同时由 npm 包提供。开发工具及传递依赖的版本由 `package-lock.json` 锁定，各包许可在其 npm 包中。

## 视觉与测试音频

机身、屏幕、唱片图形、按钮 SVG、favicon 全部由本项目 CSS / SVG 绘制；使用系统字体，不载入远程字体或图片。未使用 `analysis/` 下的 My Classic 私有素材、Apple 网页图片、艺术家封面或签名。

`scripts/create-test-audio.mjs` 合成三段原创 12 秒 PCM WAV，用于解码 / 连播检查；输出保存在忽略目录 `.local/`。

用户要求的周杰伦开发试听素材：Apple iTunes Search API 返回的《告白气球 (Live)》《千山万水》各约 30 秒 AAC 试听片段。下载时间 2026-10-26；原始来源、标题与文件名保存在本机 `.local/test-music/catalog.json`，界面提供对应官方页面链接。仅作为本次私人开发测试文件，由 Vite 开发中间件提供，不放入 `public/`，不进入生产包，不视为获得完整曲目或发行授权。
