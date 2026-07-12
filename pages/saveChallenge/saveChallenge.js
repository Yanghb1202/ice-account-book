// pages/saveChallenge/saveChallenge.js
Page({
  data: {
    targetMoney: '6679.00',
    saveMoney: '0.00',
    rawSaved: 0,
    rawTarget: 6679,
    leftMoney: '6679.00',
    progressPercent: 0,
    progressWidth: '0%',
    inputNow: '0',
    recordList: [],
    quickList: [1, 5, 10, 20, 50, 100],
    showTargetPop: false,
    tempTarget: '',
    todaySaved: '0.00',
    recordCount: 0,
    completed: false
  },

  onShow() {
    this.getSaveCacheData()
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  formatMoney(num) {
    const n = Number(num) || 0
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  getTodayText() {
    const now = new Date()
    return `${now.getMonth() + 1}月${now.getDate()}日`
  },

  getSaveCacheData() {
    const cacheData = wx.getStorageSync('saveChallenge') || {
      targetMoney: 6679,
      totalSave: 0,
      record: []
    }
    const target = Number(cacheData.targetMoney || this.data.rawTarget) || 6679
    const saved = Number(cacheData.totalSave) || 0
    const list = cacheData.record || []

    let pct = target <= 0 ? 0 : Math.round((saved / target) * 100)
    pct = Math.max(0, Math.min(100, pct))
    const todayText = this.getTodayText()
    let todaySaved = 0
    list.forEach(item => {
      if (item.date === todayText) todaySaved += Number(item.money)
    })

    this.setData({
      rawTarget: target,
      rawSaved: saved,
      targetMoney: this.formatMoney(target),
      saveMoney: this.formatMoney(saved),
      leftMoney: this.formatMoney(Math.max(0, target - saved)),
      progressPercent: pct,
      progressWidth: pct + '%',
      recordList: list,
      todaySaved: this.formatMoney(todaySaved),
      recordCount: list.length,
      completed: saved >= target
    })
  },

  // 数字点击输入
  inputNum(e) {
    const num = e.currentTarget.dataset.num
    let val = this.data.inputNow
    if (num === '.' && val.includes('.')) return
    if (val.includes('.') && val.split('.')[1].length >= 2) return
    if (!val.includes('.') && val.length >= 8) return
    if (val === '0' && num !== '.') val = ''
    if (val === '' && num === '.') val = '0'
    this.setData({ inputNow: val + num })
  },

  delNum() {
    let val = this.data.inputNow.slice(0, -1)
    if (val === '') val = '0'
    this.setData({ inputNow: val })
  },

  clearNum() {
    this.setData({ inputNow: '0' })
  },

  addQuick(e) {
    const money = Number(e.currentTarget.dataset.money)
    let cur = Number(this.data.inputNow) || 0
    cur += money
    this.setData({ inputNow: cur.toFixed(cur % 1 === 0 ? 0 : 2) })
  },

  addSaveMoney() {
    const inputVal = Number(this.data.inputNow)
    if (!inputVal || inputVal <= 0) {
      wx.showToast({ title: '请输入有效存入金额', icon: 'none' })
      return
    }

    const dateText = this.getTodayText()
    const now = new Date()
    const cacheData = wx.getStorageSync('saveChallenge') || {
      targetMoney: this.data.rawTarget,
      totalSave: 0,
      record: []
    }

    const newRecord = {
      id: Date.now(),
      money: inputVal.toFixed(2),
      date: dateText,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    }

    cacheData.record = cacheData.record || []
    cacheData.record.unshift(newRecord)
    cacheData.totalSave = Number(cacheData.totalSave || 0) + inputVal
    cacheData.targetMoney = Number(cacheData.targetMoney || this.data.rawTarget)
    wx.setStorageSync('saveChallenge', cacheData)

    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '存钱成功！', icon: 'none' })
    this.setData({ inputNow: '0' })
    this.getSaveCacheData()
  },

  openTargetPop() {
    this.setData({
      showTargetPop: true,
      tempTarget: String(this.data.rawTarget)
    })
  },

  closeTargetPop() {
    this.setData({ showTargetPop: false })
  },

  inputTarget(e) {
    this.setData({ tempTarget: e.detail.value })
  },

  saveTarget() {
    const val = Number(this.data.tempTarget)
    if (!val || val <= 0) {
      wx.showToast({ title: '请输入有效目标金额', icon: 'none' })
      return
    }
    const cacheData = wx.getStorageSync('saveChallenge') || { totalSave: 0, record: [] }
    cacheData.targetMoney = val
    wx.setStorageSync('saveChallenge', cacheData)
    this.setData({ showTargetPop: false })
    this.getSaveCacheData()
    wx.showToast({ title: '目标已更新', icon: 'none' })
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定删除这笔存钱记录吗？',
      success: res => {
        if (!res.confirm) return
        const cacheData = wx.getStorageSync('saveChallenge') || { totalSave: 0, record: [] }
        const target = (cacheData.record || []).find(item => item.id === id)
        cacheData.record = (cacheData.record || []).filter(item => item.id !== id)
        cacheData.totalSave = Math.max(0, Number(cacheData.totalSave || 0) - Number(target ? target.money : 0))
        wx.setStorageSync('saveChallenge', cacheData)
        this.getSaveCacheData()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  resetChallenge() {
    wx.showModal({
      title: '重置挑战',
      content: '将清空存钱记录和已存金额,目标金额保留。确定继续吗？',
      success: res => {
        if (!res.confirm) return
        const cacheData = wx.getStorageSync('saveChallenge') || {}
        wx.setStorageSync('saveChallenge', {
          targetMoney: Number(cacheData.targetMoney || this.data.rawTarget),
          totalSave: 0,
          record: []
        })
        this.getSaveCacheData()
        wx.showToast({ title: '已重置', icon: 'none' })
      }
    })
  }
})
