// pages/addbill/addbill.js
const app = getApp()
const DB = require('../../utils/db.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    billType: 0, // 0支出 1收入
    money: '0.00',
    tempMoney: '',
    expression: '', // 计算表达式显示
    pendingOp: '',  // 待计算的运算符 + / -
    lastNum: '',    // 上一个数字（用于运算）

    remark: '',
    dateStr: '',
    fullDate: '',

    curCateIndex: 0,

    // 支出分类（emoji 兜底，避免找不到图）
    expenseList: [
      { id: 1, name: '餐饮', emoji: '🍜', color: '#ffd9d9' },
      { id: 2, name: '购物', emoji: '🛍️', color: '#d9e8ff' },
      { id: 3, name: '交通', emoji: '🚗', color: '#d9ffea' },
      { id: 4, name: '日用', emoji: '🧴', color: '#fff2cc' },
      { id: 5, name: '娱乐', emoji: '🎮', color: '#ffe0f5' },
      { id: 6, name: '通讯', emoji: '📱', color: '#e6e6ff' },
      { id: 7, name: '旅行', emoji: '✈️', color: '#d6f5ff' },
      { id: 8, name: '医疗', emoji: '💊', color: '#ffe2cc' },
      { id: 9, name: '学习', emoji: '📚', color: '#e6f5d9' },
      { id: 10, name: '其他', emoji: '📌', color: '#eeeeee' }
    ],
    // 收入分类
    incomeList: [
      { id: 101, name: '工资', emoji: '💰', color: '#ffe9b8' },
      { id: 102, name: '兼职', emoji: '💼', color: '#d9e8ff' },
      { id: 103, name: '奖金', emoji: '🎁', color: '#ffd9d9' },
      { id: 104, name: '理财', emoji: '📈', color: '#d9ffea' },
      { id: 105, name: '红包', emoji: '🧧', color: '#ffe0e0' },
      { id: 106, name: '退款', emoji: '↩️', color: '#e6f5d9' },
      { id: 107, name: '转账', emoji: '💸', color: '#d6f5ff' },
      { id: 108, name: '其他', emoji: '📌', color: '#eeeeee' }
    ],
    cateList: [], // 当前展示的分类

    // 常用备注
    quickRemarks: ['早餐', '午餐', '晚餐', '打车', '奶茶', '水果'],

    // 今日 / 本月统计
    todayExpense: '0.00',
    monthExpense: '0.00',
    monthIncome: '0.00',

    // 账本
    bookName: '日常账本'
  },

  onLoad() {
    // 顶部状态栏 + 自定义导航高度
    try {
      const sys = wx.getSystemInfoSync()
      const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null
      const sb = sys.statusBarHeight || 20
      const navH = menu ? (menu.top - sb) * 2 + menu.height : 44
      this.setData({ statusBarHeight: sb, navBarHeight: navH })
    } catch (e) {}

    // 初始日期
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    this.setData({
      dateStr: `${m}月${d}日`,
      fullDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      cateList: this.data.expenseList
    })
  },

  onShow() {
    this.calcStat()
  },

  // ============ 类型切换：支出 / 收入 ============
  switchType(e) {
    const type = Number(e.currentTarget.dataset.type)
    if (type === this.data.billType) return
    this.setData({
      billType: type,
      curCateIndex: 0,
      cateList: type === 0 ? this.data.expenseList : this.data.incomeList
    })
  },

  // ============ 分类选择 ============
  selectCate(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const cate = this.data.cateList[idx]
    // 支出页点击“餐饮”时,进入餐饮手账 / AI 智能识别页面
    if (this.data.billType === 0 && cate && cate.name === '餐饮') {
      wx.navigateTo({
        url: '/pages/classify/food/food',
        fail: () => {
          wx.showToast({
            title: '请确认 food 页面已在 app.json 注册',
            icon: 'none'
          })
        }
      })
      return
    }
    this.setData({ curCateIndex: idx })
  },

  // ============ 数字键盘 ============
  inputNum(e) {
    const num = e.currentTarget.dataset.num
    let temp = this.data.tempMoney
    // 小数点限制
    if (num === '.') {
      if (!temp) { temp = '0'; }
      if (temp.includes('.')) return
      temp += '.'
    } else {
      // 限制整数位 8 位
      const intPart = temp.split('.')[0] || ''
      if (!temp.includes('.') && intPart.length >= 8) return
      // 小数限制 2 位
      if (temp.includes('.') && temp.split('.')[1].length >= 2) return
      // 避免前导 0
      if (temp === '0' && num !== '.') temp = ''
      temp += num
    }
    this.setData({
      tempMoney: temp,
      money: temp ? this.formatMoney(temp) : '0.00',
      expression: this.buildExpression(temp)
    })
  },

  delNum() {
    let temp = this.data.tempMoney.slice(0, -1)
    this.setData({
      tempMoney: temp,
      money: temp ? this.formatMoney(temp) : '0.00',
      expression: this.buildExpression(temp)
    })
  },

  // 加 / 减运算
  keyAdd() { this.handleOp('+') },
  keySub() { this.handleOp('-') },
  handleOp(op) {
    const cur = parseFloat(this.data.tempMoney || '0')
    if (this.data.pendingOp && this.data.lastNum !== '') {
      // 已有待运算符 → 先计算
      const result = this.compute(parseFloat(this.data.lastNum), cur, this.data.pendingOp)
      this.setData({
        lastNum: String(result),
        tempMoney: '',
        pendingOp: op,
        money: this.formatMoney(result),
        expression: `${this.formatMoney(result)} ${op}`
      })
    } else {
      this.setData({
        lastNum: String(cur),
        tempMoney: '',
        pendingOp: op,
        expression: `${this.formatMoney(cur)} ${op}`
      })
    }
  },
  compute(a, b, op) {
    const r = op === '+' ? a + b : a - b
    return Math.round(r * 100) / 100
  },
  buildExpression(temp) {
    if (this.data.pendingOp && this.data.lastNum !== '') {
      return `${this.formatMoney(this.data.lastNum)} ${this.data.pendingOp} ${temp || ''}`
    }
    return ''
  },
  formatMoney(v) {
    const n = parseFloat(v)
    if (isNaN(n)) return '0.00'
    return n.toFixed(2)
  },

  // 获取最终金额（处理未结算的表达式）
  getFinalMoney() {
    const cur = parseFloat(this.data.tempMoney || '0')
    if (this.data.pendingOp && this.data.lastNum !== '') {
      return this.compute(parseFloat(this.data.lastNum), cur, this.data.pendingOp)
    }
    return cur
  },

  // ============ 备注 ============
  inputRemark(e) {
    this.setData({ remark: e.detail.value })
  },
  selectQuickRemark(e) {
    const txt = e.currentTarget.dataset.txt
    this.setData({ remark: txt })
  },

  // ============ 日期 ============
  bindDateChange(e) {
    const val = e.detail.value
    const arr = val.split('-')
    this.setData({
      fullDate: val,
      dateStr: `${Number(arr[1])}月${Number(arr[2])}日`
    })
  },

  // ============ 账本 ============
  selectBook() {
    const books = ['日常账本', '工作账本', '差旅账本', '理财账本']
    wx.showActionSheet({
      itemList: books,
      success: (res) => {
        this.setData({ bookName: books[res.tapIndex] })
      }
    })
  },

  // ============ 顶部统计 ============
  calcStat() {
    const all = wx.getStorageSync('all_bill') || []
    const now = new Date()
    const ty = now.getFullYear()
    const tm = now.getMonth() + 1
    const td = now.getDate()
    const todayKey = `${tm}月${td}日`

    let todayExp = 0, monthExp = 0, monthIn = 0
    all.forEach(it => {
      // 解析记录的 fullDate（兼容旧数据）
      let mY = ty, mM = tm
      if (it.fullDate) {
        const a = it.fullDate.split('-')
        mY = Number(a[0]); mM = Number(a[1])
      }
      const inThisMonth = (mY === ty && mM === tm)
      if (inThisMonth) {
        if (it.type === 0) monthExp += Number(it.money)
        else monthIn += Number(it.money)
      }
      if (it.type === 0 && it.date === todayKey) {
        todayExp += Number(it.money)
      }
    })
    this.setData({
      todayExpense: todayExp.toFixed(2),
      monthExpense: monthExp.toFixed(2),
      monthIncome: monthIn.toFixed(2)
    })
  },

  // ============ 返回 ============
  goBack() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }) },

  // ============ 提交 ============
  async submitBill() {
    const money = this.getFinalMoney()
    if (!money || money <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    const cateInfo = this.data.cateList[this.data.curCateIndex]
    const billData = {
      id: Date.now(),
      type: this.data.billType,
      money: Math.round(money * 100) / 100,
      cateName: cateInfo.name,
      cateEmoji: cateInfo.emoji,
      cateIcon: cateInfo.icon || '',
      remark: this.data.remark || cateInfo.name,
      date: this.data.dateStr,
      fullDate: this.data.fullDate,
      bookName: this.data.bookName,
      createTime: Date.now()
    }
    const all = wx.getStorageSync('all_bill') || []
    all.unshift(billData)
    wx.setStorageSync('all_bill', all)
    await DB.addBill(billData)

    // 同步预算（仅支出）
    if (this.data.billType === 0) {
      this.syncBudgetUsed(cateInfo.name, billData.money)
    }

    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '记录成功 🎉', icon: 'none' })

    // 重置输入
    this.setData({
      tempMoney: '',
      money: '0.00',
      remark: '',
      lastNum: '',
      pendingOp: '',
      expression: ''
    })
    this.calcStat()
  },

  // ============ 预算同步 ============
  syncBudgetUsed(cateShortName, addMoney) {
    const map = {
      '餐饮': '餐饮美食',
      '购物': '日常购物',
      '交通': '交通出行',
      '娱乐': '休闲娱乐'
    }
    const targetCateName = map[cateShortName]
    if (!targetCateName) return

    let budgetData = wx.getStorageSync('budgetData')
    if (!budgetData || !budgetData.budgetList) {
      budgetData = {
        totalBudget: 4000,
        usedMoney: 0,
        leftMoney: 4000,
        usedPercent: 0,
        budgetList: [
          { id: 1, name: '餐饮美食', icon: '🍜', color: '#ffd9d9', total: 1500, used: 0 },
          { id: 2, name: '日常购物', icon: '🛍️', color: '#d9e8ff', total: 1000, used: 0 },
          { id: 3, name: '交通出行', icon: '🚗', color: '#d9ffea', total: 100, used: 0 },
          { id: 4, name: '休闲娱乐', icon: '🎮', color: '#fff2cc', total: 1200, used: 0 }
        ]
      }
    }
    const list = budgetData.budgetList
    let find = false
    for (let i = 0; i < list.length; i++) {
      if (list[i].name === targetCateName) {
        list[i].used = Math.round((Number(list[i].used) + Number(addMoney)) * 100) / 100
        find = true
        break
      }
    }
    if (find) {
      let allUsed = 0
      list.forEach(it => allUsed += Number(it.used))
      budgetData.usedMoney = Math.round(allUsed * 100) / 100
      budgetData.leftMoney = Math.round((budgetData.totalBudget - allUsed) * 100) / 100
      budgetData.usedPercent = budgetData.totalBudget === 0 ? 0 : ((allUsed / budgetData.totalBudget) * 100).toFixed(1)
    }
    wx.setStorageSync('budgetData', budgetData)
  }
})
