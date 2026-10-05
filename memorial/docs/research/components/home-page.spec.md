# HomePage Specification

## Overview
- Target: `index.html`, `app.js`, `style.css`
- Reference: 用户提供的云阳线上纪念平台截图
- Interaction model: 静态门户 + hash 导航 + 搜索提交

## Visual tokens
- 主色：`#8f2f28`
- 正文墨色：`#302b27`
- 宣纸背景：`#f4ecdd`
- 分隔线：`#ccbba5`
- 中文标题：宋体/楷体风格；功能文字：微软雅黑。

## Desktop layout
- Header: 96px，三列布局，浅米色宣纸背景。
- Hero: 242px，居中内容，标题 42px，搜索框 470×43px。
- Main: 最小高度 502px，简介、三张理念卡、服务/公告区。
- Footer: 104px；沿用此前米色山水素材，增加 66% 浅色覆盖以承载深色文字。

## Responsive behavior
- 1100px：收紧导航，隐藏题字，底部主内容改单列。
- 720px：页面内容单列，导航可横向滚动，保留 104px 页脚高度。
