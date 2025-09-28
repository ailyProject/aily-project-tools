const fs = require('fs');
const path = require('path');

// 确保 __dirname 有值，如果没有则使用当前工作目录
const srcDir = __dirname || "";
// 确保目标目录有值，空字符串会导致解压到当前目录
let destDir = process.env.AILY_TOOLS_PATH || "";
const parentDir = 'esp32-arduino-libs@5.4.0';
const targetName = "esp32c3";

// 使用传统的回调式 API 并用 Promise 包装
function readdir(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

// 递归删除目录
function removeDir(dirPath) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(dirPath)) {
                fs.rmSync(dirPath, { recursive: true, force: true });
                resolve();
            } else {
                resolve(); // 目录不存在，视为成功
            }
        } catch (error) {
            reject(error);
        }
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

// 清理解压后的文件夹
async function cleanupExtractedFolders() {
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

        // 如果parentDir不为空，则将其添加到目标路径
        if (parentDir && parentDir.trim() !== '') {
            destDir = path.join(destDir, parentDir);
        }

        if (!fs.existsSync(destDir)) {
            console.log(`目标目录不存在: ${destDir}`);
            return;
        }

        // 读取源目录并过滤出 .7z 文件
        const files = await readdir(srcDir);
        const archiveFiles = files.filter(file => path.extname(file).toLowerCase() === '.7z');

        console.log(`找到 ${archiveFiles.length} 个 .7z 文件，准备清理对应的解压文件夹`);

        // 对于这个模块，实际创建的文件夹名是 targetName
        const folderPath = path.join(destDir, targetName);
        console.log(`准备删除文件夹: ${folderPath}`);

        try {
            await withRetry(async () => {
                await removeDir(folderPath);
            }, 3, 2000); // 最多重试3次，每次间隔2秒
            
            console.log(`已删除文件夹: ${folderPath}`);
        } catch (error) {
            console.error(`删除文件夹 ${folderPath} 失败:`, error);
        }

        console.log('清理完成');
    } catch (err) {
        console.error('无法读取目录:', err);
    }
}

// 执行主函数
cleanupExtractedFolders().catch(function (err) {
    console.error('执行失败:', err);
});
