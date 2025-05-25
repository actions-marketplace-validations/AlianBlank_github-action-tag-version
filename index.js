const util = require("util");
const exec = util.promisify(require("child_process").exec);
const core = require("@actions/core");
const fs = require('fs')


async function main() {
    const Version = core.getInput("version") || '1.0.0';
    const branch_name = core.getInput("branch_name") || 'main';
    const CommitMessage = (core.getInput("commit") || '[修改] 修改版本号为') + Version;

    const packageJsonPath = './package.json'

    // 读取package.json文件
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))

    // 获取当前版本号
    const currentVersion = packageJson.version
    // 自增修订版本号
    const versionParts = Version.split('.')
    versionParts[2] = parseInt(versionParts[2], 10) // 这里不要+1. 因为这里是使用tag来做版本号的

    // 更新package.json文件中的版本号
    packageJson.version = versionParts.join('.')

    // 将更新后的package.json文件写入磁盘
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    
    // 删除本地tag
    await exec(`git tag --delete ${Version}`).catch(() => {
        // 如果本地tag不存在，忽略错误
        console.log(`本地tag ${Version} 不存在，跳过删除操作`);
    });

    // 将package.json文件添加到暂存区
    await exec(`git add package.json`);
    
    // 提交修改
    await exec(`git commit -m '${CommitMessage}'`);
    
    // 创建新tag并添加描述信息
    await exec(`git tag -a ${Version} -m "Version ${Version}"`);
    
    // 检查tag是否创建成功
    const { stdout: tagList } = await exec('git tag -l');
    if (!tagList.includes(Version)) {
        throw new Error(`Tag ${Version} 创建失败`);
    }
    
    // 推送commit和tag到远程
    await exec('git push');
    await exec(`git push origin ${Version}`);
    
    // 验证远程tag是否存在
    const { stdout: remoteTags } = await exec('git ls-remote --tags origin');
    if (!remoteTags.includes(Version)) {
        throw new Error(`远程Tag ${Version} 推送失败`);
    }
    
    console.log(`版本 ${Version} 已成功更新并推送到远程仓库`);
}

main().catch(error => core.setFailed(error.message));
