# Docker 运行指南

## 方法一：使用 Docker Compose（推荐）

1. 确保已安装 Docker 和 Docker Compose
2. 在项目根目录运行：

\`\`\`bash
docker-compose up -d
\`\`\`

3. 访问 `http://localhost:3000`

停止容器：
\`\`\`bash
docker-compose down
\`\`\`

## 方法二：使用 Docker 命令

### 构建镜像

\`\`\`bash
docker build -t home-safety-game .
\`\`\`

### 运行容器

\`\`\`bash
docker run -p 3000:3000 home-safety-game
\`\`\`

### 后台运行

\`\`\`bash
docker run -d -p 3000:3000 --name home-safety-game home-safety-game
\`\`\`

### 查看日志

\`\`\`bash
docker logs home-safety-game
\`\`\`

### 停止容器

\`\`\`bash
docker stop home-safety-game
\`\`\`

### 删除容器

\`\`\`bash
docker rm home-safety-game
\`\`\`

## 端口配置

默认端口是 3000，如需修改，可以更改映射：

\`\`\`bash
docker run -p 8080:3000 home-safety-game
\`\`\`

然后访问 `http://localhost:8080`

## 注意事项

- 首次构建可能需要几分钟时间
- 镜像使用多阶段构建，优化了大小和性能
- 生产环境已禁用 Next.js 遥测
- 容器以非 root 用户运行，更加安全
