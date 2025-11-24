# Mori Pics Link Converter

一个纯前端的小工具，用来把 Alist/R2 等生成的临时签名链接，转换成自定义域名的直链（例如 `https://mori-pics.suimori.com/xxxx.jpg`）。可直接部署到 Cloudflare Pages、GitHub Pages 等静态托管。

## 使用方式
1. 打开页面后粘贴原始的签名链接（支持带查询参数）。
2. 在“输出基础域名或完整前缀”里填写你希望使用的域名或前缀，默认是 `https://mori-pics.suimori.com`。
3. 点击“转换为直链”即可得到结果，点击“复制”按钮可快速复制。
4. 设置会保存在浏览器本地（包括可记录的 Alist/入口域名）。

## 部署（Cloudflare Pages）
1. 新建 Cloudflare Pages 项目，选择“直接上传”。
2. 上传本仓库中的 `index.html`（或连接本仓库并选择主分支）。
3. 构建命令留空，发布目录选择根目录 `/`。
4. 发布即可获得公开地址，后续更新只需重新上传/重新部署。

也可以直接放到任意静态主机使用，无需后端。
