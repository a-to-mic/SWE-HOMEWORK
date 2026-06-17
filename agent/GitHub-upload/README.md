# 觅长生小游戏

一个基于 React + Vite 的文字修仙小游戏。玩家可以修炼、探索、接委托、逛坊市、拜访修士，并在剧情推进中解锁人物、小游戏和筑基冲关玩法。

## 本地运行

先安装依赖：

```bash
npm install
```

启动开发预览：

```bash
npm run dev
```

打包发布版本：

```bash
npm run build
```

打包后的网页会生成在 `dist` 文件夹里。

## 传到 GitHub

上传源码即可，不需要上传这些内容：

- `node_modules`
- `dist`
- `Cloudflare-upload.zip`

如果用命令行上传，可以在本项目目录执行：

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

也可以直接在 GitHub 网页新建仓库后，把本项目文件拖进去上传。

## 部署到 Cloudflare Pages

在 Cloudflare Pages 里选择连接 GitHub 仓库，然后使用下面配置：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 留空

如果 Cloudflare 要求 Node 版本，可以在环境变量里加：

```text
NODE_VERSION=20
```

部署成功后，可以在 Cloudflare Pages 的 Custom domains 里绑定自己的 `.xyz` 域名。

## 项目结构

```text
public/   静态资源和头像
src/      游戏主代码和样式
dist/     打包生成目录，不需要传 GitHub
```
