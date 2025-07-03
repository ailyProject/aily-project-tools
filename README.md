# README

## 工具包命名规则

- 命名规则：工具名称 + "@" + 版本号，如：`bossac@1.9.1-arduino5`，`dfu-util@0.11.0-arduino5`，版本号以arduino中的版本号文件夹命名为准，方便自定义的arduino-cli中工具的加载和使用
- 压缩工具: 7zip

## 使用方法

### 安装工具
每个工具目录都包含一个 `postinstall.js` 脚本，用于解压 .7z 文件到指定的工具目录。

```bash
# 安装单个工具
cd avrdude
npm run postinstall

# 或者直接运行脚本
node postinstall.js
```

### 卸载工具
每个工具目录都包含一个 `uninstall.js` 脚本，用于清理解压后的文件夹。

```bash
# 卸载单个工具
cd avrdude
npm run uninstall

# 或者直接运行脚本
node uninstall.js

# 一键清理所有工具
node uninstall.js
```

## 环境变量

脚本依赖以下环境变量：

- `AILY_TOOLS_PATH`: 工具解压的目标目录
- `AILY_7ZA_PATH`: 7za.exe 的路径
