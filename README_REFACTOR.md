# 教代会提案工作系统 - Next.js 15 重构版

这是使用 Next.js 15 + Tailwind CSS 4 + TypeScript 重构的教代会提案工作管理系统。

## 技术栈

- **框架**: Next.js 16.1.1 (App Router)
- **React**: 19.2.3
- **样式**: Tailwind CSS 4
- **语言**: TypeScript 5
- **状态管理**: React Hooks (useState, useEffect)
- **构建工具**: Turbopack (React Compiler enabled)

## 项目结构

```
proposal/
├── app/                      # Next.js App Router
│   ├── about/               # 关于提案工作页面
│   ├── formal-proposals/    # 正式提案页面
│   ├── login/               # 登录页面
│   ├── news/                # 工作动态页面
│   ├── proposals/           # 提案建议页面
│   ├── submit/              # 征集提案建议页面
│   ├── layout.tsx           # 全局布局
│   ├── page.tsx             # 首页
│   └── globals.css          # 全局样式
├── components/              # React组件
│   ├── Header.tsx           # 页头导航组件
│   └── Footer.tsx           # 页脚组件
├── lib/                     # 工具函数
│   └── utils.ts             # 通用工具函数
├── types/                   # TypeScript类型定义
│   └── index.ts             # 数据类型定义
└── public/                  # 静态资源
```

## 已实现功能

### 1. 前台功能
- ✅ **首页** (`/`) - 展示工作动态、正式提案、提案建议、关于提案工作的概览
- ✅ **工作动态** (`/news`) - 新闻列表，支持分页
- ✅ **正式提案** (`/formal-proposals`) - 正式提案列表，支持查看和搜索
- ✅ **提案建议** (`/proposals`) - 提案建议列表，支持查看和搜索
- ✅ **征集提案建议** (`/submit`) - 在线提交提案建议表单
- ✅ **关于提案工作** (`/about`) - 提案工作相关文档列表
- ✅ **登录页面** (`/login`) - 支持个人账号和集体账号登录

### 2. 页面特性
- 响应式设计，支持移动端和桌面端
- 统一的导航栏和页脚
- 与原网站相似的设计风格和颜色方案
- 分页功能
- 搜索功能（标题、编号、部门等）
- 表单验证

### 3. 设计风格
- 主色调: #1779DC (蓝色)
- 背景色: #E6F0FA (浅蓝色)
- 强调色: #2861AE (深蓝色)
- 边框色: #4887D4 (中蓝色)

## 开发说明

### 安装依赖
```bash
cd proposal
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本
```bash
npm run build
npm start
```

## 当前状态

### 已完成
- ✅ 项目基础架构搭建
- ✅ 类型定义
- ✅ 布局组件（Header、Footer）
- ✅ 所有主要页面路由创建
- ✅ 首页实现
- ✅ 工作动态页面
- ✅ 正式提案页面
- ✅ 提案建议页面
- ✅ 征集提案建议表单
- ✅ 登录页面
- ✅ 关于提案工作页面

### 待完成
- ⏳ 后端API集成
- ⏳ 用户认证系统
- ⏳ 数据持久化
- ⏳ 文件上传功能
- ⏳ 详情页面（新闻、提案等）
- ⏳ 管理后台
- ⏳ 附议功能
- ⏳ 数据导出功能
- ⏳ 微信集成
- ⏳ 单元测试

## 与原系统的对应关系

| 原系统路径 | 新系统路径 | 说明 |
|-----------|-----------|------|
| `/page/homepage.jsp` | `/` | 首页 |
| `/page/xwdt.jsp` | `/news` | 工作动态 |
| `/page/zsta.jsp` | `/formal-proposals` | 正式提案 |
| `/page/tajy.jsp` | `/proposals` | 提案建议 |
| 征集提案建议功能 | `/submit` | 提交表单 |
| `/page/gytagz.jsp` | `/about` | 关于提案工作 |
| `/jitilogin.jsp`, `/admin.jsp` | `/login` | 登录页面 |

## 数据模型

### 主要实体类型
- **News**: 工作动态新闻
- **Proposal**: 提案建议
- **FormalProposal**: 正式提案
- **ProposalWork**: 提案工作文档
- **User**: 用户信息
- **Department**: 部门信息

详细类型定义见 `types/index.ts`

## 注意事项

1. 当前使用的是 Mock 数据，实际使用时需要连接后端API
2. 图片资源需要从原系统复制到 `public/` 目录
3. 需要配置环境变量（API地址、认证密钥等）
4. 建议添加错误边界和错误处理
5. 生产环境需要配置HTTPS

## 浏览器兼容性

- Chrome (推荐)
- Firefox
- Safari
- Edge

推荐使用现代浏览器以获得最佳体验。

## 联系信息

- 开发团队: 深圳大学网络技术支持
- 联系电话: 26531089
