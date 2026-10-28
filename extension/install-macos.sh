#!/bin/bash
set -euo pipefail
# ReiPod semi-automatic installer. Does not change browser profiles or policies.
REIPOD_URL='@@URL@@'
REIPOD_SHA256='@@SHA256@@'
REIPOD_PARENT="$HOME/Library/Application Support/ReiPod"
REIPOD_TARGET="$REIPOD_PARENT/MusicBridge"
mkdir -p "$REIPOD_PARENT"
REIPOD_TEMP=$(mktemp -d "$REIPOD_PARENT/install.XXXXXX")
trap 'rm -rf "$REIPOD_TEMP"' EXIT
printf '\nReiPod 音乐扩展安装助手\n正在下载并校验扩展…\n'
curl --fail --location --proto '=https' --tlsv1.2 "$REIPOD_URL" -o "$REIPOD_TEMP/extension.zip"
printf '%s  %s\n' "$REIPOD_SHA256" "$REIPOD_TEMP/extension.zip" | shasum -a 256 -c -
mkdir "$REIPOD_TEMP/unpacked"
unzip -q "$REIPOD_TEMP/extension.zip" -d "$REIPOD_TEMP/unpacked"
test -f "$REIPOD_TEMP/unpacked/manifest.json"
if [ -e "$REIPOD_TARGET" ]; then
  mv "$REIPOD_TARGET" "$REIPOD_PARENT/MusicBridge-backup-$(date +%Y%m%d-%H%M%S)-$$"
fi
mv "$REIPOD_TEMP/unpacked" "$REIPOD_TARGET"
printf '\n扩展文件已准备好：\n%s\n\n' "$REIPOD_TARGET"
printf '请在浏览器中：\n1. 打开开发者模式\n2. 点击“加载已解压的扩展”\n3. 选择上面的 MusicBridge 文件夹\n4. 返回 ReiPod，刷新后重试登录\n\n'
open "$REIPOD_TARGET"
if [ -d '/Applications/Microsoft Edge.app' ]; then
  open -a 'Microsoft Edge' 'edge://extensions/' || true
elif [ -d '/Applications/Google Chrome.app' ]; then
  open -a 'Google Chrome' 'chrome://extensions/' || true
else
  printf '请手动打开 Edge 的 edge://extensions/ 或 Chrome 的 chrome://extensions/\n'
fi
printf '\n助手不会自动开启开发者模式或修改浏览器安全设置。\n'
