// pages/billList/billList.js
const DB = require('../../utils/db.js')

Page({
  data: {
    billList: [],
    showList: [],
    currentType: -1, // -1全部 0支出 1收入
    keyword: '',
    monthValue: '',
    totalExpense: '0.00',
    totalIncome: '0.00',
    totalCount: 0
  },

  onLoad() {
    const now = new Date()
    this.setData({
      monthValue: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
  },

  onShow() {
    this.loadBills()
  },

  formatMoney(num) {
    const n = Number(num) || 0
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  parseBillDate(item) {
    if (item.fullDate) return item.fullDate
    const now = new Date()
    if (item.date) {
      const m = item.date.match(/(\d+)月(\d+)日?/)
      if (m) {
        return `${now.getFullYear()}-${String(Number(m[1])).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`
      }
    }
    return ''
  },

  async loadBills() {
    const billResult = await DB.getBillList()
    const allBill = billResult.success && billResult.data ? billResult.data : (wx.getStorageSync('all_bill') || [])
    const list = allBill.map(item => {
      const fullDate = this.parseBillDate(item)
      return {
        ...item,
        fullDate,
        emoji: item.cateEmoji || this.getCateEmoji(item.cateName),
        moneyText: this.formatMoney(item.money),
        remarkText: item.remark || item.cateName,
        timeText: fullDate || item.date || '',
        _sort: item.createTime || (fullDate ? new Date(fullDate).getTime() : 0)
      }
    }).sort((a, b) => b._sort - a._sort)

    this.setData({ billList: list }, () => {
      this.filterBills()
    })
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

  switchType(e) {
    this.setData({ currentType: Number(e.currentTarget.dataset.type) }, () => {
      this.filterBills()
    })
  },

  inputKeyword(e) {
    this.setData({ keyword: e.detail.value }, () => {
      this.filterBills()
    })
  },

  bindMonthChange(e) {
    this.setData({ monthValue: e.detail.value }, () => {
      this.filterBills()
    })
  },

  clearSearch() {
    this.setData({ keyword: '' }, () => {
      this.filterBills()
    })
  },

  filterBills() {
    const { billList, currentType, keyword, monthValue } = this.data
    const kw = keyword.trim()
    let expense = 0
    let income = 0

    const showList = billList.filter(item => {
      if (currentType !== -1 && Number(item.type) !== currentType) return false
      if (monthValue && item.fullDate && item.fullDate.slice(0, 7) !== monthValue) return false
      if (kw) {
        const text = `${item.cateName || ''}${item.remarkText || ''}${item.bookName || ''}`
        if (!text.includes(kw)) return false
      }
      return true
    }).map(item => {
      if (Number(item.type) === 0) expense += Number(item.money) || 0
      else income += Number(item.money) || 0
      return item
    })

    this.setData({
      showList,
      totalExpense: this.formatMoney(expense),
      totalIncome: this.formatMoney(income),
      totalCount: showList.length
    })
  },

  deleteBill(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除账单',
      content: '确定删除这条账单记录吗？',
      success: res => {
        if (!res.confirm) return
        const allBill = wx.getStorageSync('all_bill') || []
        const newList = allBill.filter(item => item.id !== id)
        wx.setStorageSync('all_bill', newList)
        wx.showToast({ title: '已删除', icon: 'none' })
        this.loadBills()
      }
    })
  },

  goAddBill() {
    wx.navigateTo({ url: '/pages/addbill/addbill' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/billDetail/billDetail?id=${id}`,
      fail: () => wx.showToast({ title: '账单详情页未配置', icon: 'none' })
    })
  }
})
