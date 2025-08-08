# Supabase 认证设置指南

## 概述

本项目已集成 Supabase 认证系统，支持：
- 邮箱注册 + 邮箱验证
- 邮箱密码登录
- Google OAuth 登录
- 受保护的路由
- 自动登出功能

## 环境配置

1. 复制环境变量示例文件：
   ```bash
   cp .env.example .env
   ```

2. 在 Supabase 控制台获取项目配置：
   - 登录 [Supabase 控制台](https://supabase.com/dashboard)
   - 创建新项目或选择现有项目
   - 在项目设置中找到 API 设置
   - 复制 `Project URL` 和 `anon key`

3. 更新 `.env` 文件：
   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Supabase 项目配置

### 1. 启用认证提供商

在 Supabase 控制台中：
1. 进入 Authentication > Providers
2. 启用 Email 提供商
3. 启用 Google 提供商（可选）：
   - 配置 Google OAuth 客户端 ID 和密钥
   - 添加重定向 URL：`http://localhost:5173/auth/callback`

### 2. 配置邮箱模板

在 Authentication > Email Templates 中自定义：
- 确认邮箱模板
- 重置密码模板（可选）

### 3. 设置认证设置

在 Authentication > Settings 中：
- 设置站点 URL：`http://localhost:5173`
- 添加重定向 URL：`http://localhost:5173/auth/callback`
- 启用邮箱确认（推荐）

## 功能特性

### 注册流程
1. 用户输入邮箱和密码
2. 系统发送确认邮件
3. 用户点击邮件中的确认链接
4. 账户激活，可以登录

### 登录选项
- 邮箱密码登录
- Google 一键登录

### 受保护路由
以下路由需要用户登录：
- `/` - 首页
- `/collection/:id` - 课程详情
- `/game/:sceneId/:stepIndex` - 学习游戏

### 公开路由
- `/login` - 登录页
- `/register` - 注册页
- `/auth/callback` - OAuth 回调页

## 开发运行

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 `http://localhost:5173`

3. 测试流程：
   - 注册新账户
   - 检查邮箱并确认
   - 登录系统
   - 测试 Google 登录（如已配置）

## 部署注意事项

部署到生产环境时，需要：

1. 更新环境变量为生产环境的值
2. 在 Supabase 控制台更新：
   - 站点 URL 为生产域名
   - 重定向 URL 为生产域名 + `/auth/callback`
   - Google OAuth 重定向 URL（如使用）

## 故障排除

### 常见问题

1. **环境变量未加载**
   - 确保 `.env` 文件在项目根目录
   - 重启开发服务器

2. **Google 登录失败**
   - 检查 Google OAuth 配置
   - 确认重定向 URL 正确

3. **邮箱验证邮件未收到**
   - 检查垃圾邮件文件夹
   - 确认 Supabase 邮箱配置

4. **认证状态异常**
   - 清除浏览器本地存储
   - 重新登录

### 开发调试

在浏览器开发工具中检查：
- Application > Local Storage > Supabase session
- Network 标签页中的认证请求
- Console 中的认证相关日志

## API 集成

如果需要在后端验证 Supabase JWT token：

```javascript
// 示例：Node.js 中验证 token
const jwt = require('jsonwebtoken');

function verifySupabaseToken(token) {
  // 从 Supabase 获取 JWT secret
  const secret = process.env.SUPABASE_JWT_SECRET;
  return jwt.verify(token, secret);
}
```

## 更多资源

- [Supabase 认证文档](https://supabase.com/docs/guides/auth)
- [React 认证指南](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Google OAuth 设置](https://supabase.com/docs/guides/auth/social-login/auth-google)