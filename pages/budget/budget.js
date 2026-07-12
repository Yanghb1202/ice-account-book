// pages/budget/budget.js
Page({
  data: {
    totalBudget: 4000,
    usedMoney: 0,
    leftMoney: 4000,
    usedPercent: 0,
    totalProgressStyle: 'width:0%',
    totalOver: false,
    budgetList: [],

    showTotalPop: false,
    showEditItemPop: false,
    showAddPop: false,

    tempBudget: '',
    tempItemTotal: '',
    tempItemUsed: '',
    currentEditId: null,

    newCatName: '',
    newCatIcon: '🍱',
    newCatColor: '#ffe0cc',
    newCatTotal: '',

    // 图标选择器
    showIconPicker: false,
    iconList: ['🍱','🍜','🍕','🥗','🍰','☕','🥤','🍺','🛒','👗','💄','📱','💻','🚗','🚌','✈️','🏠','💡','📚','🎮','🎬','🏋️','💊','🐱','🎁','📦','💼','💰','🏦','📈','🧾','🔧'],

    // 颜色选择器
    showColorPicker: false,
    colorList: ['#ffd9d9','#d9e8ff','#d9ffea','#fff2cc','#ffe0f5','#e6e6ff','#d6f5ff','#ffe2cc','#e6f5d9','#eeeeee','#ffe9b8','#f0d9ff'],

    // 统计
    monthDays: 30,
    leftDays: 0,
    dailyBudget: '0.00',
    avgDaily: '0.00',

    // 删除确认
    deleteConfirmId: null
  },

  onLoad() {
    this.loadBudgetData()
  },

  onShow() {
    this.loadBudgetData()
  },

  // ============ 加载 ============
  loadBudgetData() {
    const budgetData = wx.getStorageSync('budgetData')
    if (budgetData && budgetData.budgetList) {
      this.setData({
        totalBudget: budgetData.totalBudget,
        usedMoney: budgetData.usedMoney,
        leftMoney: budgetData.leftMoney,
        usedPercent: budgetData.usedPercent,
        budgetList: budgetData.budgetList
      }, () => this.calcAllStyle())
    } else {
      this.calcAllStyle()
    }
  },

  calcAllStyle() {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const monthDays = new Date(y, m, 0).getDate()
    const leftDays = Math.max(0, monthDays - now.getDate())
    const leftTotal = this.data.leftMoney
    const dailyBudget = leftDays > 0 ? (leftTotal / leftDays) : 0

    let allUsed = 0
    this.data.budgetList.forEach(item => { allUsed += Number(item.used) })

    const totalPercent = this.data.totalBudget === 0 ? 0 : ((allUsed / this.data.totalBudget) * 100)
    const displayPercent = totalPercent.toFixed(1)
    const totalOver = totalPercent >= 100
    const totalProgressStyle = `width:${Math.min(totalPercent, 100)}%`

    const newBudgetList = this.data.budgetList.map(item => {
      const pct = item.total === 0 ? 0 : (Number(item.used) / Number(item.total) * 100)
      const over = pct >= 100
      return {
        id: item.id,
        name: item.name,
        icon: item.icon,
        color: item.color,
        total: item.total,
        used: item.used,
        percent: pct.toFixed(1),
        barStyle: `width:${Math.min(pct, 100)}%`,
        over,
        remain: Math.max(0, Number(item.total) - Number(item.used))
      }
    })

    this.setData({
      usedMoney: allUsed,
      leftMoney: this.data.totalBudget - allUsed,
      usedPercent: displayPercent,
      totalOver,
      totalProgressStyle,
      budgetList: newBudgetList,
      monthDays,
      leftDays,
      dailyBudget: dailyBudget.toFixed(2),
      avgDaily: (allUsed / Math.max(1, monthDays - leftDays)).toFixed(2)
    })
  },

  // ============ 弹窗控制 ============
  openSetBudget() {
    this.setData({ tempBudget: String(this.data.totalBudget), showTotalPop: true })
  },

  closeAllPop() {
    this.setData({
      showTotalPop: false,
      showEditItemPop: false,
      showAddPop: false,
      showIconPicker: false,
      showColorPicker: false,
      currentEditId: null,
      deleteConfirmId: null
    })
  },

  inputTempBudget(e) { this.setData({ tempBudget: e.detail.value }) },

  saveTotalBudget() {
    const val = Number(this.data.tempBudget)
    if (!val || val <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    this.setData({ totalBudget: val, showTotalPop: false }, () => {
      this.calcAllStyle()
      this.saveStorage()
      wx.showToast({ title: '修改总预算成功', icon: 'none' })
    })
  },

  // ============ 编辑分类 ============
  editItemBudget(e) {
    const id = e.currentTarget.dataset.id
    const target = this.data.budgetList.find(item => item.id === id)
    if (!target) return
    this.setData({
      currentEditId: id,
      tempItemTotal: String(target.total),
      tempItemUsed: String(target.used),
      showEditItemPop: true
    })
  },

  inputItemTotal(e) { this.setData({ tempItemTotal: e.detail.value }) },
  inputItemUsed(e) { this.setData({ tempItemUsed: e.detail.value }) },

  saveItemEdit() {
    const tTotal = Number(this.data.tempItemTotal)
    if (!tTotal || tTotal <= 0) {
      wx.showToast({ title: '分类预算必须大于 0', icon: 'none' })
      return
    }
    const list = this.data.budgetList.map(item => {
      if (item.id === this.data.currentEditId) {
        return { ...item, total: tTotal }
      }
      return item
    })
    this.setData({ budgetList: list, showEditItemPop: false }, () => {
      this.calcAllStyle()
      this.saveStorage()
      wx.showToast({ title: '修改分类预算成功', icon: 'none' })
    })
  },

  // ============ 重置已用 ============
  resetUsed(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.budgetList.map(item => {
      if (item.id === id) {
        return { ...item, used: 0 }
      }
      return item
    })
    this.setData({ budgetList: list }, () => {
      this.calcAllStyle()
      this.saveStorage()
      wx.showToast({ title: '已重置已用金额', icon: 'none' })
    })
  },

  // ============ 删除分类 ============
  deleteItem(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ deleteConfirmId: id })
  },
  confirmDelete() {
    const id = this.data.deleteConfirmId
    const list = this.data.budgetList.filter(item => item.id !== id)
    this.setData({ budgetList: list, deleteConfirmId: null }, () => {
      this.calcAllStyle()
      this.saveStorage()
      wx.showToast({ title: '已删除该分类', icon: 'none' })
    })
  },

  // ============ 新增分类 ============
  openAddBudget() {
    this.setData({
      newCatName: '',
      newCatTotal: '',
      newCatIcon: '🍱',
      newCatColor: '#ffe0cc',
      showAddPop: true
    })
  },

  inputCatName(e) { this.setData({ newCatName: e.detail.value }) },
  inputCatTotal(e) { this.setData({ newCatTotal: e.detail.value }) },

  // 图标选择器
  openIconPicker() { this.setData({ showIconPicker: true }) },
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({ newCatIcon: icon, showIconPicker: false })
  },

  // 颜色选择器
  openColorPicker() { this.setData({ showColorPicker: true }) },
  selectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ newCatColor: color, showColorPicker: false })
  },

  confirmAddCat() {
    const name = this.data.newCatName.trim()
    const catTotal = Number(this.data.newCatTotal)
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    if (!catTotal || catTotal <= 0) {
      wx.showToast({ title: '请输入有效预算', icon: 'none' })
      return
    }
    let maxId = 0
    this.data.budgetList.forEach(item => { if (item.id > maxId) maxId = item.id })
    const newItem = {
      id: maxId + 1,
      name,
      icon: this.data.newCatIcon,
      color: this.data.newCatColor,
      total: catTotal,
      used: 0
    }
    const newList = [...this.data.budgetList, newItem]
    this.setData({ budgetList: newList, showAddPop: false }, () => {
      this.calcAllStyle()
      this.saveStorage()
      wx.showToast({ title: '新增分类成功', icon: 'none' })
    })
  },

  // ============ 重置所有 ============
  resetAll() {
    wx.showModal({
      title: '确认重置',
      content: '将所有分类的已用金额归零？',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.budgetList.map(item => ({ ...item, used: 0 }))
          this.setData({ budgetList: list }, () => {
            this.calcAllStyle()
            this.saveStorage()
            wx.showToast({ title: '已重置所有分类' })
          })
        }
      }
    })
  },

  // ============ 存储 ============
  saveStorage() {
    const saveList = this.data.budgetList.map(item => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      color: item.color,
      total: item.total,
      used: item.used
    }))
    const saveData = {
      totalBudget: this.data.totalBudget,
      usedMoney: this.data.usedMoney,
      leftMoney: this.data.leftMoney,
      usedPercent: this.data.usedPercent,
      budgetList: saveList
    }
    wx.setStorageSync('budgetData', saveData)
  }
})