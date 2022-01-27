const pify = require('pify');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const chokidar = require('chokidar');
const pSassRender = pify(require('sass').render);
const glob = require('glob');
const { logger, sleep } = require('./util');

process.on('unhandledRejection', e => {
    console.log(e);
});
process.on('SIGINT', () => {
    console.log(chalk.yellow('关闭进程'));
    process.exit(1);
});

const reg = /@import "(.+)"/g;

/**
 * 暂存sass依赖图
 * sass依赖图结构：
 * [{
 *  name: 文件名称
 *  refed: []依赖它的文件
 * }]
 */
(async () => {
    try {
        await fs.readJSON('server/cache.json');
    } catch (error) {
        await fs.writeFile('server/cache.json', '{"items": []}')
    }
    const depRepo = []; // 总的依赖仓库
    const watcher = chokidar.watch('(app|{pages,components}/**/*).scss');
    let isReady = false;
    watcher.once('ready', () => {
        logger.success(`sass编译服务已开启${counterBeforeStart > 0 ? `，有${counterBeforeStart}个文件被重新编译` : ''}。
${chalk.magenta('请确认微信开发者工具是否已打开。')}`);
        isReady = true;
    });
    watcher.on('all', (event, fileParam) => {
        const file = fileParam.replace(/\\/g, '/');
        if (event === 'change') {
            logger.info(`文件${chalk.cyan(file)}发生修改`);
        } else if (event === 'unlink') {
            logger.info(`文件${chalk.cyan(file)}被移除`);
        }
    });
    let counterBeforeStart = 0;
    watcher.on('add', async file => {
        await insertToRepo(file, depRepo);
        if (isReady || isUpdatedWhenServerClosed(file)) {
            counterBeforeStart++;
            pSassRender({
                file
            })
                .then(ret => {
                    fs.writeFile(file.replace('scss', 'wxss'), ret.css);
                })
                .catch(e => {
                    logger.error(e);
                })
        }
    });
    watcher.on('change', async file => {
        // 在VSCode中编辑的文件会被上锁无法读取，所以需要等一段时间。
        await sleep(500);
        // 修改sass依赖图。清除该文件原有依赖，生成新的依赖关系。
        depRepo.forEach(item => {
            const idx = item.refed.findIndex(sub => sub === path.resolve(file));
            if (idx !== -1) {
                item.refed.splice(idx, 1);
            }
        });
        changeCache(file);
        await insertToRepo(file, depRepo);
        if (!isRefFile(file)) {
            pSassRender({
                file
            })
                .then(ret => {
                    fs.writeFile(file.replace('scss', 'wxss'), ret.css);
                })
                .catch(e => {
                    logger.error(e);
                })
        } else {
            // 查找所有直接或间接用到该文件的非引用文件
            const matches = [];
            function getRefs(filename) {
                const match = depRepo.find(item => item.name === filename);
                match.refed.forEach(sub => {
                    if (isRefFile(sub)) {
                        getRefs(sub);
                    } else {
                        matches.push(sub);
                    }
                });
            }
            getRefs(file);
            matches.forEach(item => {
                pSassRender({
                    file: item
                })
                    .then(ret => {
                        fs.writeFile(item.replace('scss', 'wxss'), ret.css);
                    })
                    .catch(e => {
                        logger.error(e);
                    })
            })
        }
    })
    watcher.on('unlink', async file => {
        if (!isRefFile(file)) {
            try {
                await fs.unlink(file.replace('scss', 'wxss'));
            } catch (error) {

            }
        } else {
            const delMatch = depRepo.find(item => item.name === path.resolve(file));
            if (delMatch) {
                logger.warn(`该删除的文件有被下列文件引用，\n请尽快修改，或还原被删除的文件：\n ${delMatch.refed.join('\n')}`);
            }
        }
        removeCache(file);
        depRepo.forEach((item, idx) => {
            if (item.name === path.resolve(file)) {
                depRepo.splice(idx, 1);
            }
            const subIidx = item.refed.findIndex(sub => sub === path.resolve(file));
            if (subIidx !== -1) {
                item.refed.splice(subIidx, 1);
            }
        });
    });
})()

// 是否是引用文件
function isRefFile(file) {
    return path.basename(file).startsWith('_');
}

async function insertToRepo(file, depRepo) {
    const fullFile = path.resolve(process.cwd(), file);
    const cont = await fs.readFile(file, 'utf8');
    let pattern = cont;

    while (pattern !== null) {
        pattern = reg.exec(cont);
        if (pattern) {
            const dependencyName = path.resolve(fullFile, '../', pattern[1].endsWith('.scss') ? pattern[1] : `${pattern[1]}.scss`);
            if (depRepo.find(item => item.name === dependencyName)) {
                depRepo.find(item => item.name === dependencyName).refed.push(fullFile);
            } else {
                depRepo.push({
                    name: dependencyName,
                    refed: [fullFile]
                });
            }
        }
    };
}

// 是否在编译服务未启动时有修改文件
function isUpdatedWhenServerClosed(file) {
    const { items } = fs.readJSONSync('server/cache.json');
    const match = items.find(item => item.file === file);
    const { mtimeMs } = fs.statSync(file);
    if (!match) {
        items.push({
            file,
            lastUpdateTime: mtimeMs
        });
        fs.writeJSONSync('server/cache.json', { items });
        return true;
    }
    if (!match.lastUpdateTime || match.lastUpdateTime !== mtimeMs) {
        match.lastUpdateTime = mtimeMs;
        fs.writeJSONSync('server/cache.json', { items });
        return true;
    }
    return false;
}

function changeCache(file) {
    const { items } = fs.readJSONSync('server/cache.json');
    const match = items.find(item => item.file === file);
    if (match) {
        match.lastUpdateTime = fs.statSync(file).mtimeMs;
        fs.writeJSONSync('server/cache.json', { items });
    }
}

function removeCache(file) {
    const { items } = fs.readJSONSync('server/cache.json');
    const idx = items.findIndex(item => item.file === file);
    if (idx !== -1) {
        items.splice(idx, 1);
        fs.writeJSONSync('server/cache.json', { items });
    }
}