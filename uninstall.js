const fs = require('fs');
const path = require('path');

// 所有工具目录
const toolDirs = [
    'avrdude',
    'bossac',
    'ctags',
    'dfu-util',
    'esptool',
    'idf_esp32',
    'idf_esp32c3',
    'idf_esp32s3',
    'mklittlefs'
];

// 清理所有工具的解压文件夹
async function cleanupAllTools() {
    console.log('开始清理所有工具的解压文件夹...');
    
    const destDir = process.env.AILY_TOOLS_PATH || "";
    
    if (!destDir) {
        console.error('未设置 AILY_TOOLS_PATH 环境变量');
        return;
    }
    
    if (!fs.existsSync(destDir)) {
        console.log(`目标目录不存在: ${destDir}`);
        return;
    }

    let totalCleaned = 0;
    let totalErrors = 0;

    for (const toolDir of toolDirs) {
        const toolPath = path.join(__dirname, toolDir);
        const uninstallScript = path.join(toolPath, 'uninstall.js');
        
        if (fs.existsSync(uninstallScript)) {
            console.log(`\n正在清理 ${toolDir}...`);
            
            try {
                // 动态加载并执行清理脚本
                const { spawn } = require('child_process');
                
                await new Promise((resolve, reject) => {
                    const proc = spawn('node', [uninstallScript], {
                        cwd: toolPath,
                        stdio: 'inherit'
                    });
                    
                    proc.on('close', (code) => {
                        if (code === 0) {
                            console.log(`${toolDir} 清理完成`);
                            totalCleaned++;
                            resolve();
                        } else {
                            console.error(`${toolDir} 清理失败，退出码: ${code}`);
                            totalErrors++;
                            reject(new Error(`清理失败: ${toolDir}`));
                        }
                    });
                    
                    proc.on('error', (err) => {
                        console.error(`${toolDir} 清理时发生错误:`, err);
                        totalErrors++;
                        reject(err);
                    });
                });
            } catch (error) {
                console.error(`清理 ${toolDir} 时发生错误:`, error.message);
                totalErrors++;
            }
        } else {
            console.log(`跳过 ${toolDir}，未找到 uninstall.js 脚本`);
        }
    }

    console.log(`\n清理完成！`);
    console.log(`成功清理: ${totalCleaned} 个工具`);
    if (totalErrors > 0) {
        console.log(`失败: ${totalErrors} 个工具`);
    }
}

// 执行主函数
cleanupAllTools().catch(function (err) {
    console.error('清理过程中发生错误:', err);
    process.exit(1);
});
