# AGENTS.md

## 项目概览

记账助手 - 出差与日常快速记账 Web 应用，支持 AI 截图识别自动填入，适配 iOS 背面轻敲快捷记账。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: coze-coding-dev-sdk (LLM 多模态视觉模型)

## 目录结构

```
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icon-192.svg           # PWA 图标
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts     # AI 截图识别接口
│   │   │   └── config/supabase/route.ts  # Supabase 配置接口
│   │   ├── globals.css              # 全局样式
│   │   ├── layout.tsx               # 根布局 (AuthProvider + Toaster)
│   │   └── page.tsx                 # 首页 (认证判断)
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 组件
│   │   ├── auth-form.tsx            # 登录注册表单
│   │   ├── auth-provider.tsx        # 认证上下文
│   │   ├── main-app.tsx             # 主应用 (底部Tab导航)
│   │   ├── quick-record.tsx         # 快速记账页面
│   │   ├── stats-page.tsx           # 统计页面
│   │   ├── trip-page.tsx            # 出差项目管理
│   │   └── settings-page.tsx        # 设置页面
│   ├── lib/
│   │   ├── constants.ts             # 分类/支付方式/币种常量
│   │   ├── supabase-client.ts       # Supabase 服务器端客户端
│   │   └── utils.ts                 # 工具函数
│   └── storage/
│       └── database/
│           ├── shared/schema.ts      # Drizzle ORM Schema
│           └── supabase-client.ts    # 数据库客户端模板
├── DESIGN.md                        # 设计规范
├── next.config.ts                   # Next.js 配置
└── package.json
```

## 构建与开发命令

```bash
pnpm install         # 安装依赖
pnpm run dev         # 开发模式 (端口 5000)
pnpm run build       # 生产构建
pnpm run start       # 生产模式运行
pnpm lint            # ESLint 检查
pnpm ts-check        # TypeScript 类型检查
```

## 数据库

### 表结构
- **trips**: 出差项目 (id, user_id, name, destination, start_date, end_date, status, created_at)
- **records**: 记账记录 (id, user_id, trip_id, amount, currency, category, type, merchant, payment_method, note, record_date, record_time, reimbursable, created_at)

### RLS 策略
- 所有表启用 Row Level Security
- 用户只能访问自己的数据 (user_id = auth.uid())

## 认证机制

- **用户名登录**：用户输入用户名，内部转为 `username@expense.app` 作为 Supabase email 字段
- **自动确认**：数据库触发器 `auto_confirm_user_trigger` 自动设置 `confirmed_at` 和 `email_confirmed_at`，无需邮箱验证
- **Supabase 配置获取**：`/api/config/supabase` 通过 `python3 + coze_workload_identity` 动态获取环境变量（生产环境不依赖 .env 文件）
- Supabase 客户端通过 AuthProvider 动态初始化（从 /api/config/supabase 获取配置）

## API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/config/supabase | 获取 Supabase 配置 |
| POST | /api/analyze | 上传截图进行 AI 分析 |
| GET | /api/analyze?session=xxx | 获取 AI 分析结果 |

## 代码风格指南

- TypeScript strict 模式，禁止隐式 any
- 使用 'use client' 标记客户端组件
- Supabase 客户端通过 AuthProvider 动态初始化（从 /api/config/supabase 获取配置）
- LLM SDK 仅在后端使用
- iOS 快捷指令：截屏 + 打开 `/?quick=1`，APP 自动弹出选图界面
- APP 内检测 URL `quick=1` 参数时自动弹出相册选择器，选中后 AI 识别填入
- 也支持 APP 内右上角相机按钮手动上传截图识别
- Supabase 环境变量通过 `python3 + coze_workload_identity` 获取，不硬编码
