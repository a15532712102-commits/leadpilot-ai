#!/bin/zsh
cd "${0:A:h}/.." || exit 1
export PATH="/Users/yangyaqing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH=/tmp/leadpilot-browsers
# Capture setup errors as well as test failures; keep the window open.
{
  print "LeadPilot 本机浏览器测试开始"
  date
  node --version
  if [[ ! -d /tmp/leadpilot-browsers/webkit-2370 || ! -d /tmp/leadpilot-browsers/chromium_headless_shell-1248 ]]; then
    node node_modules/playwright/cli.js install chromium webkit
    install_result=$?
  else
    install_result=0
  fi
  if (( install_result == 0 )); then
    node node_modules/@playwright/test/cli.js test
    test_result=$?
    print "测试退出码：$test_result（0表示通过）"
  else
    print "浏览器安装未完成，退出码：$install_result"
  fi
  print "结果已保存到项目 test-results-local.log，请回到 Codex。"
} 2>&1 | tee test-results-local.log
read '?按回车关闭窗口'
