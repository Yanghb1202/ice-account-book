# 冰冰记账本 - 微信小程序

一款基于微信小程序原生开发的个人财务管理应用，支持记账、统计、预算、存钱挑战等功能。

## 📁 项目结构

```
account book app/
├── app.js                    # 应用入口，云开发初始化
├── app.json                  # 应用配置
├── app.wxss                  # 全局样式
├── pages/                    # 页面目录（27个页面）
│   ├── index/                # 首页仪表盘
│   ├── addbill/              # 记账页面
│   ├── statistics/           # 统计页面
│   ├── mine/                 # 个人中心
│   ├── login/                # 登录页面
│   ├── register/             # 注册页面
│   ├── budget/               # 预算管理
│   ├── saveChallenge/        # 存钱挑战
│   ├── asset/                # 资产管理
│   ├── classify/food/        # 餐饮手账+AI识别
│   └── ...                   # 其他页面
├── cloudfunctions/           # 云函数目录
│   ├── addBill/              # 添加账单
│   ├── getBillList/          # 获取账单列表
│   ├── userLogin/            # 用户登录
│   ├── registerUser/         # 用户注册
│   └── foodAi/               # AI食物识别
├── utils/
│   └── db.js                 # 数据库封装工具（云/本地双模式）
├── images/                   # 图标资源
└── miniprogram_npm/          # 第三方组件
```

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| 微信小程序原生 | WXML + WXSS + JavaScript + JSON |
| 微信云开发 | 云函数 + 云数据库 |
| u-charts | 数据可视化图表库 |
| 本地存储 | wx.getStorageSync/setStorageSync |

## 🚀 快速开始

### 环境要求

- 微信开发者工具（版本 1.05 以上）
- 微信小程序基础库 2.2.3 以上

### 安装步骤

1. **下载源码**
   ```bash
   git clone <repository-url>
   cd account book app
   ```

2. **配置云开发环境**
   - 打开微信开发者工具
   - 在云开发控制台创建云环境
   - 将 `app.js` 中的 `env` 替换为你的云环境 ID

3. **创建云数据库集合**
   在云开发控制台创建以下集合：
   - `bills` - 账单数据
   - `users` - 用户数据

4. **上传云函数**
   - 在微信开发者工具中右键云函数目录
   - 选择"上传并部署：云端安装依赖"

5. **运行项目**
   - 在微信开发者工具中点击"编译"
   - 使用微信扫码预览

### 本地开发模式

项目支持云开发和本地存储两种模式，通过 `utils/db.js` 中的 `useCloud` 变量切换：

```javascript
const useCloud = false  // false=本地存储模式，true=云开发模式
```

## 📡 API 文档

### 云函数接口

#### 1. userLogin - 用户登录

**请求参数**
```json
{
  "phone": "15060723962",
  "password": "123456"
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "phone": "13800138000",
    "nickname": "张三"
  },
  "message": "登录成功"
}
```

#### 2. registerUser - 用户注册

**请求参数**
```json
{
  "phone": "13800138000",
  "password": "123456",
  "nickname": "张三"
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "phone": "13800138000",
    "nickname": "张三"
  },
  "message": "注册成功"
}
```

#### 3. addBill - 添加账单

**请求参数**
```json
{
  "billType": 0,
  "money": 25.50,
  "remark": "午餐",
  "date": "7月12日",
  "fullDate": "2026-07-12",
  "cateName": "餐饮",
  "cateEmoji": "🍜",
  "userId": "abc123"
}
```

**响应示例**
```json
{
  "success": true,
  "message": "记账成功"
}
```

#### 4. getBillList - 获取账单列表

**请求参数**
```json
{
  "userId": "abc123",
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "billType": 0,
  "page": 1,
  "pageSize": 20
}
```

**响应示例**
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "message": "查询成功"
}
```

#### 5. foodAi - AI食物识别

**请求参数**
```json
{
  "fileID": "cloud://xxx/xxx.jpg"
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "foodName": "汉堡",
    "calories": 450,
    "confidence": 92,
    "tip": "建议搭配蔬菜沙拉"
  },
  "message": "识别成功"
}
```

## ✨ 核心功能

| 功能模块 | 说明 |
|---------|------|
| 首页仪表盘 | 动态问候、收支概览、账单流、预算提醒 |
| 智能记账 | 计算器键盘、分类选择、快捷备注 |
| 数据统计 | 折线图、环形图、多时间维度分析 |
| 预算管理 | 月度预算、分类预算、进度追踪 |
| 存钱挑战 | 储蓄目标、进度追踪、记录时间线 |
| 餐饮手账 | 周历视图、AI食物识别、热量统计 |
| 用户体系 | 登录注册、个人中心、设置 |

## 📄 数据库结构

### bills 集合
```json
{
  "_id": "自动生成",
  "billType": 0,
  "money": 25.50,
  "remark": "午餐",
  "date": "7月12日",
  "fullDate": "2026-07-12",
  "cateName": "餐饮",
  "cateEmoji": "🍜",
  "userId": "abc123",
  "createTime": "服务器时间"
}
```

### users 集合
```json
{
  "_id": "自动生成",
  "phone": "13800138000",
  "password": "加密密码",
  "nickname": "张三",
  "avatar": "",
  "createTime": "服务器时间"
}
```

## 📝 开发日志

项目使用 Git 进行版本管理，提交记录遵循 Conventional Commits 规范：

```
init: 初始化项目
feat: 添加新功能
fix: 修复bug
refactor: 重构代码
docs: 更新文档
```

## 📱 预览截图

![首页](./images/demo/home.png)
![记账页](./images/demo/addbill.png)
![统计页](./images/demo/statistics.png)

## 📅 开发进度

- 7月11日：项目初始化
- 7月12日：首页仪表盘和记账页面开发完成
- 7月13日：用户体系和个人中心开发完成
- 7月14日：统计分析和分类管理开发完成
- 7月15日：预算管理、存钱挑战、资产管理等扩展功能开发完成，项目优化收尾

## �� 联系方式

如有问题或建议，欢迎反馈！
