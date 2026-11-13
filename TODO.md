# TODO

## REQ-001: Hello World 首页

### 背景

项目脚手架验证：用目标技术栈跑通一个最小可用页面，确认前后端与数据库链路可用。

### 需求描述

提供一个首页，页面展示 "Hello World" 文字。该文字不硬编码在前端，而是：

1. 存储在 SQLite 数据库中（`greeting` 表，一条记录）。
2. 后端（Spring Boot / Java）提供 `GET /api/greeting` 接口，从数据库读取并返回。
3. 前端（React）首页调用该接口并展示返回的文字。

### 技术栈约束

- 前端：React
- 后端：Spring Boot / Java
- 数据库：SQLite（嵌入式，无需独立数据库服务）, Flyway 迁移

### 验收标准

1. 启动后端后，数据库文件自动创建并写入一条 "Hello World" 记录。
2. `GET /api/greeting` 返回 "Hello World"。
3. 启动前端后访问首页，页面显示从接口获取的 "Hello World"。

### 非目标

- 多语言、可配置的问候语管理界面
- 用户体系、权限
- 数据库迁移工具、ORM
