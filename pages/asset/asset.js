// pages/asset/asset.js
Page({
  data: {
    assetList: [],
    totalAsset: '0.00',
    totalDebt: '0.00',
    netAsset: '0.00',
    accountCount: 0,

    showPopup: false,
    editId: '',
    tempName: '',
    tempMoney: '',
    tempType: 0,
    tempIcon: '💰',
    tempColor: '#ffe9b8',

    typeList: [
      { id: 0, name: '资产账户' },
      { id: 1, name: '负债账户' }
    ],
    iconList: ['💰', '💳', '🏦', '📱', '👛', '💵', '📈', '🏠', '🚗', '🎁', '🧧', '📌'],
    colorList: ['#ffe9b8', '#d9e8ff', '#d9ffea', '#ffd9d9', '#fff2cc', '#ffe0f5', '#e6e6ff', '#d6f5ff']
  },

  onShow() {
    this.loadAssetData()
  },

  formatMoney(num) {
    const n = Number(num) || 0
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  // 读取资产数据
  loadAssetData() {
    let assetData = wx.getStorageSync('assetData')
    if (!assetData || !Array.isArray(assetData.assetList)) {
      assetData = {
        assetList: [
          { id: 'cash', name: '现金', money: 0, type: 0, icon: '💵', color: '#ffe9b8' },
          { id: 'wechat', name: '微信钱包', money: 0, type: 0, icon: '📱', color: '#d9e8ff' },
          { id: 'bank', name: '银行卡', money: 0, type: 0, icon: '🏦', color: '#d9ffea' },
          { id: 'credit', name: '信用卡', money: 0, type: 1, icon: '💳', color: '#ffd9d9' }
        ]
      }
      wx.setStorageSync('assetData', assetData)
    }

    let totalAsset = 0
    let totalDebt = 0
    const list = assetData.assetList.map(item => {
      const money = Number(item.money) || 0
      if (Number(item.type) === 1) totalDebt += money
      else totalAsset += money
      return {
        ...item,
        moneyText: this.formatMoney(money)
      }
    })

    this.setData({
      assetList: list,
      totalAsset: this.formatMoney(totalAsset),
      totalDebt: this.formatMoney(totalDebt),
      netAsset: this.formatMoney(totalAsset - totalDebt),
      accountCount: list.length
    })
  },

  openAddPopup() {
    this.setData({
      showPopup: true,
      editId: '',
      tempName: '',
      tempMoney: '',
      tempType: 0,
      tempIcon: '💰',
      tempColor: '#ffe9b8'
    })
  },

  closePopup() {
    this.setData({ showPopup: false })
  },

  inputName(e) {
    this.setData({ tempName: e.detail.value })
  },

  inputMoney(e) {
    this.setData({ tempMoney: e.detail.value })
  },

  switchType(e) {
    const type = Number(e.currentTarget.dataset.type)
    this.setData({
      tempType: type,
      tempIcon: type === 1 ? '💳' : '💰',
      tempColor: type === 1 ? '#ffd9d9' : '#ffe9b8'
    })
  },

  selectIcon(e) {
    this.setData({ tempIcon: e.currentTarget.dataset.icon })
  },

  selectColor(e) {
    this.setData({ tempColor: e.currentTarget.dataset.color })
  },

  editAsset(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.assetList.find(i => i.id === id)
    if (!item) return
    this.setData({
      showPopup: true,
      editId: item.id,
      tempName: item.name,
      tempMoney: String(item.money),
      tempType: Number(item.type),
      tempIcon: item.icon,
      tempColor: item.color
    })
  },

  saveAsset() {
    const name = this.data.tempName.trim()
    const money = Number(this.data.tempMoney)
    if (!name) {
      wx.showToast({ title: '请输入账户名称', icon: 'none' })
      return
    }
    if (isNaN(money)) {
      wx.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }

    const assetData = wx.getStorageSync('assetData') || { assetList: [] }
    let list = Array.isArray(assetData.assetList) ? assetData.assetList : []

    if (this.data.editId) {
      list = list.map(item => {
        if (item.id === this.data.editId) {
          return {
            ...item,
            name,
            money,
            type: this.data.tempType,
            icon: this.data.tempIcon,
            color: this.data.tempColor
          }
        }
        return item
      })
    } else {
      list.unshift({
        id: 'asset_' + Date.now(),
        name,
        money,
        type: this.data.tempType,
        icon: this.data.tempIcon,
        color: this.data.tempColor
      })
    }

    wx.setStorageSync('assetData', { assetList: list })
    wx.showToast({ title: this.data.editId ? '修改成功' : '新增成功', icon: 'none' })
    this.setData({ showPopup: false })
    this.loadAssetData()
  },

  deleteAsset(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除账户',
      content: '确定删除这个资产账户吗？',
      success: res => {
        if (!res.confirm) return
        const assetData = wx.getStorageSync('assetData') || { assetList: [] }
        const list = (assetData.assetList || []).filter(item => item.id !== id)
        wx.setStorageSync('assetData', { assetList: list })
        this.loadAssetData()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  noop() {}
})
