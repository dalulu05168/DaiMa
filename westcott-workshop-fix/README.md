# ELLERY WESTCOTT 剧本工坊修复 · 1.4.31

本目录记录小助手的剧本工坊接入修复。CloudCLI 固定为 1.37.9，现有本地安装继续使用它的数据库。干净安装带有工坊运行依赖和独立的 Node.js，首次打开时创建本地 CloudCLI 账号，GPT 与 Claude 按各自提供方的正常登录流程启用。

- 快捷指令仅填入编辑框，已有草稿得到保留，发送由用户确认。
- 保留仅有无障碍标签的授权按钮与无法安全折叠的技术步骤。
- 小助手验证本机后台服务。启动器退出时直接显示具体错误，登录凭证经对应 Electron 视图的主框架传入。
- 工坊接入一键自检。自动化测试覆盖重复启动、被占端口、异常退出、首次建库及旧凭证恢复。

## 文件与构建

`app/` 中的文件覆盖小助手的 `resources/app/src/` 同名文件。`claudecodeui-local/` 提供本地 CloudCLI 启动和外观文件。已装依赖由 CloudCLI 1.37.9 的一套可运行 Windows x64 工作目录提供。旧用户数据留在现有 CloudCLI 的 `data` 目录。

准备可用的 ELLERY WESTCOTT 1.4.30 原始安装目录、CloudCLI 1.37.9 的本地工作目录、Windows x64 Node.js 24.22.3、Python 3.12 和 NSIS 3.04 或更高版本。先将 `claudecodeui-local/` 中的补丁文件覆盖到 CloudCLI 工作目录中，保留生产依赖与数据目录。使用 Node.js 对应版本的官方许可证。 [Node.js 24.22.3 LICENSE](https://github.com/nodejs/node/blob/v24.22.3/LICENSE)

以下命令中的路径为示例，需要换成本机实际目录。

```powershell
python .\stage-release.py C:\EW-installed C:\cloudcli-local C:\Node\node.exe C:\EW-build\payload --node-license C:\Node\LICENSE
Copy-Item .\workshop-installer.nsi C:\EW-build
Set-Location C:\EW-build
makensis .\workshop-installer.nsi
```

构建程序要求目标 `payload` 不存在。安装包从程序和依赖目录取文件，排除用户数据库、访问密钥、开发测试和日志。Windows 安全策略可能要求安装包签名。

## 回归

```powershell
node .\startup-regression.cjs
$env:EW_CLOUDCLI_SOURCE = (Resolve-Path .\claudecodeui-local).Path
node .\verify-release.cjs
node .\verify-release.cjs C:\EW-build\payload C:\EW-test-data 43191
```

页面回归使用 Playwright，环境变量 `EW_PLAYWRIGHT_MODULE` 可指向已有的 Playwright 安装，`EW_BROWSER_EXECUTABLE` 可指向 Edge 或 Chromium。最后一个命令要求空白测试目录和空闲端口。测试会创建随机密码的本地测试账号；测试后可按端口核对并停止对应的测试服务。
