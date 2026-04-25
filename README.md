# 知识库助手 - 使用说明

## 一、项目简介

知识库助手是一个基于本地存储的个人知识库系统，结合 AI 能力（Claude API）提升工作和生活效率。支持笔记管理、AI 问答、内容摘要、写作润色等功能。

## 二、环境要求

| 要求 | 说明 |
|------|------|
| 操作系统 | Windows 10/11 (64位) |
| Node.js | 18.x 或更高版本 |
| Claude API Key | 可从 anthropic.com 申请 |

## 三、快速开始

### 步骤 1：安装依赖

```bash
# 进入项目目录
cd d:\cc-projects\projects\knowledge-base

# 安装项目依赖
npm install
```

### 步骤 2：配置 Claude API Key

1. 访问 https://console.anthropic.com/
2. 创建 API Key
3. 运行项目后，在设置界面中输入 API Key

### 步骤 3：启动应用

```bash
# 开发模式运行
npm run dev
```

或构建后运行：

```bash
# 构建生产版本
npm run build

# 运行构建后的应用
npm run preview
```

## 四、主要功能

### 4.1 笔记管理

- **创建笔记**：点击笔记列表上方的 + 按钮
- **编辑笔记**：点击笔记列表中的任意笔记
- **删除笔记**：鼠标悬停在笔记上，显示删除按钮
- **自动保存**：编辑内容后 1 秒自动保存

### 4.2 分类管理

- 默认分类：技术文档、读书笔记、工作日志、模板
- 侧边栏可切换分类视图
- 支持按分类筛选笔记

### 4.3 AI 功能

| 功能 | 说明 | 使用方法 |
|------|------|----------|
| 知识问答 | 基于笔记内容回答问题 | 打开笔记 → AI 面板 → 问答模式 |
| 内容摘要 | 自动总结笔记要点 | 打开笔记 → AI 面板 → 摘要模式 |
| 写作润色 | 改进笔记写作质量 | 打开笔记 → AI 面板 → 润色模式 |
| 自动标签 | AI 建议笔记标签 | 编辑器工具栏 → 标签按钮 |

### 4.4 同步功能

1. 打开设置（右上角齿轮图标）
2. 设置云同步目录（iCloud Drive 或 Google Drive 文件夹）
3. 应用会自动监控该目录下的 .md 文件变化

## 五、目录结构

```
knowledge-base/
├── electron/           # Electron 主进程
│   ├── main.cjs        # 主进程入口
│   └── preload.cjs     # 预加载脚本
├── src/               # React 前端源码
│   ├── components/    # UI 组件
│   ├── stores/        # 状态管理
│   ├── services/      # AI 服务
│   └── types/         # TypeScript 类型
├── dist/              # 构建输出
├── SPEC.md            # 技术规范
└── package.json       # 项目配置
```

## 六、常见问题

### Q1：运行报错 "app is not defined"

这通常是 Electron 环境问题。解决方法：

```bash
# 清除 node_modules
rm -rf node_modules

# 重新安装
npm install
```

### Q2：Claude API 调用失败

1. 确认 API Key 已正确配置
2. 检查网络连接
3. 查看 API Key 是否有足够配额

### Q3：笔记不显示

1. 确认笔记目录存在（默认：Documents/KnowledgeBase）
2. 检查笔记文件是否为 .md 格式
3. 查看应用日志了解具体错误

## 七、快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + S | 保存当前笔记 |
| Ctrl + Shift + N | 新建笔记 |

## 八、卸载

如需卸载，删除项目目录即可：

```bash
rm -rf d:\cc-projects\projects\knowledge-base
```

---

*文档版本：v1.0*
*最后更新：2026-04-02*