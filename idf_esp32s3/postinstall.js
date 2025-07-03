const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// test

// 确保 __dirname 有值，如果没有则使用当前工作目录
const srcDir = __dirname || "";
// 确保目标目录有值，空字符串会导致解压到当前目录
let destDir = process.env.AILY_TOOLS_PATH || "";
const _7zaPath = process.env.AILY_7ZA_PATH || "";
const parentDir = 'esp32-arduino-libs@5.4.0';
const targetName = "esp32s3"

// 使用传统的回调式 API 并用 Promise 包装
function readdir(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

// 重试函数封装
async function withRetry(fn, maxRetries = 3, retryDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.log(`操作失败 (尝试 ${attempt}/${maxRetries}): ${error.message}`);

            if (attempt < maxRetries) {
                console.log(`等待 ${retryDelay / 1000} 秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    throw new Error(`经过 ${maxRetries} 次尝试后操作仍然失败: ${lastError.message}`);
}

// 检查并删除旧版本文件夹
async function checkAndRemoveOldVersions(baseDir, parentDir) {
    try {
        if (!fs.existsSync(baseDir)) {
            return;
        }

        // 从parentDir中提取基础名称（去掉版本号）
        const baseName = parentDir.split('@')[0]; // 例如：esp32-arduino-libs@5.4.0 -> esp32-arduino-libs
        
        console.log(`检查 ${baseDir} 目录下是否存在 ${baseName} 的旧版本...`);

        const files = await readdir(baseDir);
        
        // 查找所有以baseName开头且包含@的文件夹
        const oldVersionFolders = files.filter(file => {
            const filePath = path.join(baseDir, file);
            return fs.statSync(filePath).isDirectory() && 
                   file.startsWith(baseName + '@') && 
                   file !== parentDir;
        });

        if (oldVersionFolders.length > 0) {
            console.log(`找到 ${oldVersionFolders.length} 个旧版本文件夹:`);
            
            for (const folder of oldVersionFolders) {
                const folderPath = path.join(baseDir, folder);
                console.log(`删除旧版本文件夹: ${folderPath}`);
                
                try {
                    fs.rmSync(folderPath, { recursive: true, force: true });
                    console.log(`已删除: ${folderPath}`);
                } catch (error) {
                    console.error(`删除 ${folderPath} 失败:`, error);
                }
            }
        } else {
            console.log('未找到旧版本文件夹');
        }
    } catch (error) {
        console.error('检查旧版本文件夹时出错:', error);
    }
}


// 使用 Promise 和 async/await 简化异步操作
async function extractArchives() {
    try {
        // 确保源目录存在
        if (!fs.existsSync(srcDir)) {
            console.error(`源目录不存在: ${srcDir}`);
            return;
        }

        // 确保目标目录存在
        if (!destDir) {
            console.error('未设置目标目录');
            return;
        }

        // 确保 7za.exe 存在
        if (!fs.existsSync(_7zaPath)) {
            console.error(`7za.exe 不存在: ${_7zaPath}`);
            return;
        }

        // 检查并删除旧版本文件夹
        if (parentDir && parentDir.trim() !== '') {
            await checkAndRemoveOldVersions(destDir, parentDir);
            destDir = path.join(destDir, parentDir);
        }

        if (!fs.existsSync(destDir)) {
            console.log(`目标目录不存在，创建: ${destDir}`);
            fs.mkdirSync(destDir, { recursive: true });
        }

        // 读取目录并过滤出 .7z 文件
        const files = await readdir(srcDir);
        const archiveFiles = files.filter(file => path.extname(file).toLowerCase() === '.7z');

        console.log(`找到 ${archiveFiles.length} 个 .7z 文件`);

        // 处理每个压缩文件
        for (const file of archiveFiles) {
            if (!file) {
                console.error('文件名为空，跳过');
                continue;
            }

            const srcPath = path.join(srcDir, file);
            console.log(`准备解压: ${srcPath}`);

            try {
                await withRetry(async () => {
                    await unpack(srcPath, destDir);
                }, 3, 2000); // 最多重试3次，每次间隔2秒
                console.log(`已解压 ${file} 到 ${destDir}`);

                // 重命名
                const newName = path.basename(file, '.7z');
                const destPath = path.join(destDir, newName);

                // 将newName中的@替换为_
                // const newName2 = newName.replace('@', '_');
                const newPath = path.join(destDir, targetName);
                // 如果目标路径已存在，先删除
                if (fs.existsSync(newPath)) {
                    console.log(`目标路径已存在，删除: ${newPath}`);
                    fs.rmSync(newPath, { recursive: true, force: true });
                }
                fs.renameSync(destPath, newPath);
                console.log(`已重命名 ${destPath} 为 ${newPath}`);

            } catch (error) {
                console.error(`解压 ${file} 失败:`, error);
            }
        }
    } catch (err) {
        console.error('无法读取目录:', err);
    }
}

// 使用 Promise 封装解压函数
function unpack(archivePath, destination) {
    return new Promise((resolve, reject) => {
        if (!archivePath) {
            return reject(new Error('压缩文件路径不能为空'));
        }
        if (!destination) {
            return reject(new Error('目标目录不能为空'));
        }

        const args = ['x', archivePath, '-y', '-o' + destination];
        console.log(`执行命令: ${_7zaPath} ${args.join(' ')}`);

        const proc = spawn(_7zaPath, args, { windowsHide: true });

        let output = '';

        proc.stdout.on('data', function (chunk) {
            output += chunk.toString();
        });
        proc.stderr.on('data', function (chunk) {
            output += chunk.toString();
        });

        proc.on('error', function (err) {
            console.error('7-zip 错误:', err);
            reject(err);
        });

        proc.on('exit', function (code) {
            if (code === 0) {
                resolve();
            } else {
                const error = new Error(`7-zip 退出码 ${code}\n${output}`);
                reject(error);
            }
        });
    });
}

// 执行主函数
extractArchives().catch(function (err) {
    console.error('执行失败:', err);
});