#!/bin/zsh
cd "${0:A:h}" || exit 1
leadpilot_python="$(command -v python3)"
if [[ -z "$leadpilot_python" ]]; then
  leadpilot_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
fi
if [[ ! -x "$leadpilot_python" ]]; then
  print '未找到Python 3。可直接使用网页版：https://a15532712102-commits.github.io/leadpilot-ai/'
  read '?按回车关闭窗口'
  exit 1
fi
"$leadpilot_python" scripts/serve.py
leadpilot_result=$?
if (( leadpilot_result != 0 )); then
  read '?按回车关闭窗口'
fi
