# 冰冰记账本 - API 文档

## 概述

本项目使用微信云开发提供后端服务，包含 5 个云函数接口，支持用户认证、账单管理和 AI 识别功能。

---

## 接口列表

| 接口名称 | 云函数名 | 功能描述 |
|---------|---------|---------|
| 用户登录 | userLogin | 通过手机号和密码登录 |
| 用户注册 | registerUser | 新用户注册 |
| 添加账单 | addBill | 记录一笔收支 |
| 获取账单列表 | getBillList | 查询账单（支持筛选分页） |
| AI食物识别 | foodAi | 识别食物图片，返回热量信息 |

---

## 1. 用户登录接口

**云函数名**: `userLogin`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| phone | String | 是 | 手机号（11位） |
| password | String | 是 | 密码（6-20位） |

**请求示例**:
```javascript
wx.cloud.callFunction({
  name: 'userLogin',
  data: {
    phone: '13800138000',
    password: '123456'
  }
})
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "phone": "13800138000",
    "nickname": "张三",
    "avatar": ""
  },
  "message": "登录成功"
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "用户不存在"
}
```

---

## 2. 用户注册接口

**云函数名**: `registerUser`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| phone | String | 是 | 手机号（11位） |
| password | String | 是 | 密码（6-20位） |
| nickname | String | 否 | 昵称（默认"记账用户"） |

**请求示例**:
```javascript
wx.cloud.callFunction({
  name: 'registerUser',
  data: {
    phone: '13800138000',
    password: '123456',
    nickname: '张三'
  }
})
```

**成功响应**:
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

**失败响应**:
```json
{
  "success": false,
  "message": "手机号已被注册"
}
```

---

## 3. 添加账单接口

**云函数名**: `addBill`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| billType | Number | 是 | 0=支出，1=收入 |
| money | Number | 是 | 金额（保留2位小数） |
| cateName | String | 是 | 分类名称（如"餐饮"） |
| cateEmoji | String | 否 | 分类图标emoji |
| remark | String | 否 | 备注说明 |
| date | String | 否 | 日期（如"7月12日"） |
| fullDate | String | 是 | 完整日期（格式：YYYY-MM-DD） |
| bookName | String | 否 | 账本名称（默认"日常账本"） |
| userId | String | 是 | 用户ID |

**请求示例**:
```javascript
wx.cloud.callFunction({
  name: 'addBill',
  data: {
    billType: 0,
    money: 25.50,
    cateName: '餐饮',
    cateEmoji: '🍜',
    remark: '午餐',
    date: '7月12日',
    fullDate: '2026-07-12',
    userId: 'abc123'
  }
})
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "自动生成的ID"
  },
  "message": "记账成功"
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "记账失败",
  "error": "错误详情"
}
```

---

## 4. 获取账单列表接口

**云函数名**: `getBillList`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| userId | String | 是 | 用户ID |
| startDate | String | 否 | 开始日期（格式：YYYY-MM-DD） |
| endDate | String | 否 | 结束日期（格式：YYYY-MM-DD） |
| billType | Number | 否 | 0=支出，1=收入，不传=全部 |
| page | Number | 否 | 页码（默认1） |
| pageSize | Number | 否 | 每页数量（默认20） |

**请求示例**:
```javascript
wx.cloud.callFunction({
  name: 'getBillList',
  data: {
    userId: 'abc123',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    billType: 0,
    page: 1,
    pageSize: 20
  }
})
```

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "xxx",
      "billType": 0,
      "money": 25.50,
      "cateName": "餐饮",
      "cateEmoji": "🍜",
      "remark": "午餐",
      "date": "7月12日",
      "fullDate": "2026-07-12",
      "createTime": "服务器时间"
    }
  ],
  "total": 100,
  "message": "查询成功"
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "查询失败",
  "error": "错误详情"
}
```

---

## 5. AI食物识别接口

**云函数名**: `foodAi`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| fileID | String | 是 | 云存储文件ID |

**请求示例**:
```javascript
wx.cloud.callFunction({
  name: 'foodAi',
  data: {
    fileID: 'cloud://env-id/xxx.jpg'
  }
})
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "foodName": "汉堡",
    "calories": 450,
    "nutrients": {
      "protein": 25,
      "fat": 20,
      "carbs": 50
    },
    "confidence": 92,
    "tip": "建议搭配蔬菜沙拉，增加膳食纤维摄入"
  },
  "message": "识别成功"
}
```

**降级响应（AI服务不可用时）**:
```json
{
  "success": true,
  "data": {
    "foodName": "美食",
    "calories": 250,
    "nutrients": {},
    "confidence": 85,
    "tip": "合理饮食，健康生活"
  },
  "message": "识别完成"
}
```

---

## 数据库集合结构

### users 集合

| 字段名 | 类型 | 说明 |
|-------|------|------|
| _id | String | 自动生成 |
| phone | String | 手机号（唯一） |
| password | String | 密码 |
| nickname | String | 昵称 |
| avatar | String | 头像URL |
| createTime | Date | 创建时间 |

### bills 集合

| 字段名 | 类型 | 说明 |
|-------|------|------|
| _id | String | 自动生成 |
| billType | Number | 0=支出，1=收入 |
| money | Number | 金额 |
| cateName | String | 分类名称 |
| cateEmoji | String | 分类图标 |
| remark | String | 备注 |
| date | String | 日期（如"7月12日"） |
| fullDate | String | 完整日期（YYYY-MM-DD） |
| bookName | String | 账本名称 |
| userId | String | 用户ID |
| createTime | Date | 创建时间 |

---

## 错误码说明

| 错误信息 | 说明 |
|---------|------|
| 用户不存在 | 登录时手机号未注册 |
| 密码错误 | 登录时密码不正确 |
| 手机号已被注册 | 注册时手机号已存在 |
| 请上传图片 | AI识别时未提供图片 |
| 记账失败 | 添加账单时发生错误 |
| 查询失败 | 获取账单列表时发生错误 |
| 网络错误 | 云函数调用失败 |

---

## 调用流程图

### 登录流程

```
用户输入 → validateForm → DB.userLogin → 存储登录信息 → 跳转首页
```

### 记账流程

```
选择分类 → 输入金额 → 填写备注 → DB.addBill → 更新本地存储 → 提示成功
```

### AI识别流程

```
选择图片 → 上传到云存储 → DB.foodAi → 显示识别结果 → 确认记账
```

---

## 安全注意事项

1. **密码存储**：当前版本密码明文存储，生产环境建议使用 bcrypt 加密
2. **SQL注入**：使用云数据库的参数化查询，避免SQL注入风险
3. **权限控制**：云函数中需验证 userId 参数，确保用户只能访问自己的数据
4. **HTTPS**：所有接口使用 HTTPS 协议传输数据
5. **错误信息**：避免在响应中暴露详细的错误堆栈信息
