# 小程序监听sass编译成wxss
安装依赖
```bash
npm i pify fs-extra chalk chokidar sass -D
```
复制该文件夹至项目根目录，文件夹名称随意更换，例如叫"server"。

然后在项目的`package.json`里配置脚本：
```json
{
    "scripts": {
        "serve": "node server"
    }
}
```
在命令行运行脚本：
```bash
npm run serve
```
所有sass文件的修改，都会被立即编译成wxss文件。