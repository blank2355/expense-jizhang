# DESIGN.md

## 气质与意象
清晨苹果旗舰店的玻璃幕墙——极简、通透、留白至上。每一个元素都有呼吸的空间，没有一丝多余。Tesla Model 3 中控屏的克制与信息密度——黑底白字、功能一目了然、零装饰。

## 配色方案
- 主背景：纯白 `#FFFFFF`，浅灰 `#F5F5F7`（Apple 标志性灰）
- 文字主色：近黑 `#1D1D1F`（Apple 官方文字色）
- 文字次要色：中灰 `#86868B`
- 强调色/品牌色：极简黑 `#000000`，用于按钮和关键操作
- 分隔线/边框：`#E5E5EA`
- 成功色：`#34C759`（Apple Green）
- 警告色：`#FF9500`（Apple Orange）
- 危险色：`#FF3B30`（Apple Red）

## 字体排版
- 字体族：SF Pro Display 风格，中文使用 `-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif`
- 标题：大号 28px/32px，font-weight 600，letter-spacing -0.02em
- 副标题：20px，font-weight 500
- 正文：16px，font-weight 400
- 金额数字：等宽风格，32px+，font-weight 700，使用 `font-variant-numeric: tabular-nums`
- 间距节奏：8px 基数（8, 16, 24, 32, 48, 64）

## 视觉策略
- 大面积留白，内容区最大宽度 480px（移动优先）
- 圆角卡片：12px border-radius，1px `#E5E5EA` 边框
- 无阴影或极浅阴影：`shadow-sm` 仅用于悬浮卡片
- 图标：线性风格（Lucide），2px stroke，20px 尺寸
- 按钮：全宽圆角按钮，48px 高度，黑色背景白色文字

## 动效与交互
- 过渡：200ms ease-out，Apple 风格的流畅感
- 页面切换：fade + 轻微上移
- 数字变化：countUp 动画
- 保存成功：轻柔的 scale(1.02) → scale(1) 弹性反馈
- 列表项：滑入动画，stagger 50ms

## 页面结构
- 顶部导航：极简，左侧返回箭头 + 中间标题 + 右侧操作
- 记账主页面：金额突出展示 + 分类网格 + 确认按钮
- 统计页面：顶部月度总览卡片 + 分类环形图 + 明细列表
- 底部标签栏：记账 / 统计 / 出差 / 设置（4 tab）

## 设计禁忌
- 禁止渐变色背景
- 禁止彩色阴影
- 禁止圆角超过 16px
- 禁止使用 emoji 作为图标
- 禁止小于 44px 的点击区域（Apple HIG 标准）
- 禁止卡片内嵌套卡片
- 禁止全大写英文标题
