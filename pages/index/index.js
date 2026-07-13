// pages/index/index.js
const DB = require('../../utils/db.js')

Page({
  data: {
    greeting: '早上好',
    slogan: '今天也要认真记账呀',
    userName: '',

    funcList: [
      { icon: '🧾', name: '记账', desc: '快速记录', page: '/pages/addbill/addbill' },
      { icon: '📊', name: '统计', desc: '收支分析', page: '/pages/statistics/statistics' },
      { icon: '💰', name: '预算', desc: '控制花费', page: '/pages/budget/budget' },
      { icon: '🏦', name: '资产', desc: '资产总览', page: '/pages/asset/asset' },
      { icon: '📋', name: '账单', desc: '全部明细', page: '/pages/billList/billList' }
    ],

    monthPay: '0.00',
    monthIncome: '0.00',
    monthSurplus: '0.00',
    todayPay: '0.00',
    todayIncome: '0.00',
    todayNet: '0.00',
    monthBillCount: 0,
    weekBillList: [],

    budgetTotal: '0.00',
    budgetUsed: '0.00',
    budgetLeft: '0.00',
    budgetPercent: 0,
    budgetWidth: '0%',

    saveTarget: '6679.00',
    saveNow: '0.00',
    savePercent: 0,
    progressWidth: '0%'
  },

  onShow() {
    this.setGreeting()
    this.loadUserName()
    this.loadAllBillData()
    this.loadBudgetData()
    this.loadSaveData()
  },

  loadUserName() {
    const userInfo = wx.getStorageSync('userLogin')
    const userName = userInfo && userInfo.nickname ? userInfo.nickname : ''
    this.setData({ userName })
  },

  setGreeting() {
    const h = new Date().getHours()
    let greeting = '早上好'
    let slogan = '新的一天,从记录第一笔开始'
    if (h >= 11 && h < 14) {
      greeting = '中午好'
      slogan = '午餐记得记一笔哦'
    } else if (h >= 14 && h < 18) {
      greeting = '下午好'
      slogan = '看看今天花了多少钱'
    } else if (h >= 18 && h < 22) {
      greeting = '晚上好'
      slogan = '睡前整理一下今日账单吧'
    } else if (h >= 22 || h < 5) {
      greeting = '夜深了'
      slogan = '早点休息,明天继续好好生活'
    }
    this.setData({ greeting, slogan })
  },

  formatMoney(num) {
    const n = Number(num) || 0
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  parseBillDate(item, currentYear) {
    if (item.fullDate) {
      const arr = item.fullDate.split('-')
      if (arr.length >= 3) {
        return new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2]))
      }
    }
    if (item.date) {
      const m = item.date.match(/(\d+)月(\d+)日?/)
      if (m) {
        return new Date(currentYear, Number(m[1]) - 1, Number(m[2]))
      }
    }
    return null
  },

  // 加载全部账单,统计本月、今日、近7日数据
  async loadAllBillData() {
    const billResult = await DB.getBillList()
    const allBill = billResult.success && billResult.data ? billResult.data : (wx.getStorageSync('all_bill') || [])
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const todayKey = this.formatDate(now)

    const sevenDayAgo = new Date(now)
    sevenDayAgo.setDate(now.getDate() - 6)
    sevenDayAgo.setHours(0, 0, 0, 0)

    let monthPay = 0
    let monthIncome = 0
    let todayPay = 0
    let todayIncome = 0
    let monthBillCount = 0
    const weekBillList = []

    allBill.forEach(item => {
      const billDate = this.parseBillDate(item, currentYear)
      if (!billDate) return

      const money = Number(item.money) || 0
      const billType = item.billType !== undefined ? item.billType : (item.type !== undefined ? item.type : 0)
      const isThisMonth = billDate.getFullYear() === currentYear && billDate.getMonth() === currentMonth
      const billDateKey = this.formatDate(billDate)

      if (isThisMonth) {
        monthBillCount++
        if (billType === 0) monthPay += money
        else monthIncome += money
      }

      if (billDateKey === todayKey) {
        if (billType === 0) todayPay += money
        else todayIncome += money
      }

      if (billDate.getTime() >= sevenDayAgo.getTime()) {
        weekBillList.push({
          ...item,
          type: billType,
          billType: billType,
          moneyText: this.formatMoney(money),
          emoji: item.cateEmoji || this.getCateEmoji(item.cateName),
          remarkText: item.remark || item.cateName,
          _time: item.createTime || billDate.getTime()
        })
      }
    })

    weekBillList.sort((a, b) => b._time - a._time)

    const todayNet = todayIncome - todayPay
    this.setData({
      monthPay: this.formatMoney(monthPay),
      monthIncome: this.formatMoney(monthIncome),
      monthSurplus: this.formatMoney(monthIncome - monthPay),
      todayPay: this.formatMoney(todayPay),
      todayIncome: this.formatMoney(todayIncome),
      todayNet: this.formatMoney(todayNet),
      monthBillCount,
      weekBillList: weekBillList.slice(0, 6)
    })
  },

  formatDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  getCateEmoji(name) {
    const map = {
      餐饮: '🍜',
      购物: '🛍️',
      交通: '🚗',
      日用: '🧴',
      娱乐: '🎮',
      通讯: '📱',
      旅行: '✈️',
      医疗: '💊',
      学习: '📚',
      工资: '💰',
      兼职: '💼',
      奖金: '🎁',
      理财: '📈',
      红包: '🧧'
    }
    return map[name] || '📌'
  },

  // 读取预算数据
  loadBudgetData() {
    const budgetData = wx.getStorageSync('budgetData') || {}
    const total = Number(budgetData.totalBudget) || 0
    const used = Number(budgetData.usedMoney) || 0
    const left = total - used
    let pct = total <= 0 ? 0 : Math.round((used / total) * 100)
    pct = Math.min(100, Math.max(0, pct))

    this.setData({
      budgetTotal: this.formatMoney(total),
      budgetUsed: this.formatMoney(used),
      budgetLeft: this.formatMoney(left),
      budgetPercent: pct,
      budgetWidth: `${pct}%`
    })
  },

  // 读取存钱挑战缓存
  loadSaveData() {
    const saveStorage = wx.getStorageSync('saveChallenge') || { totalSave: 0 }
    const target = Number(String(this.data.saveTarget).replace(/,/g, '')) || 6679
    const current = Number(saveStorage.totalSave) || 0
    let pct = Math.round((current / target) * 100)
    pct = Math.min(100, Math.max(0, pct))

    this.setData({
      saveNow: this.formatMoney(current),
      savePercent: pct,
      progressWidth: `${pct}%`
    })
  },

  goPage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.navigateTo({
      url,
      fail: () => wx.switchTab({ url })
    })
  },

  goAddBill() {
    wx.navigateTo({ url: '/pages/addbill/addbill' })
  },

  goBillList() {
    wx.navigateTo({ url: '/pages/billList/billList' })
  },

  goStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' })
  },

  goBudget() {
    wx.navigateTo({ url: '/pages/budget/budget' })
  },

  goSavePage() {
    wx.navigateTo({ url: '/pages/saveChallenge/saveChallenge' })
  },

  goBillDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      this.goBillList()
      return
    }
    wx.navigateTo({
      url: `/pages/billDetail/billDetail?id=${id}`,
      fail: () => this.goBillList()
    })
  }
})
