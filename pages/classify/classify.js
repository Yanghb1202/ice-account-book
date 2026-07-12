// pages/classify/classify.js
Page({
  data: {
    currentTab: 0, // 0支出 1收入
    targetTab: 0,
    spendList: [],
    incomeList: [],

    showPopup: false,
    showActionPopup: false,
    showDeleteConfirm: false,

    editId: '',
    tempName: '',
    selectColor: '#ffd9d9',
    selectIcon: '🍜',

    operateId: '',
    operateName: '',
    operateType: 0,

    spendTotal: 0,
    incomeTotal: 0,

    colorList: [
      '#ffd9d9', '#d9e8ff', '#d9ffea', '#fff2cc',
      '#ffe0f5', '#e6e6ff', '#d6f5ff', '#ffe2cc',
      '#e6f5d9', '#eeeeee', '#ffe9b8', '#f0d9ff'
    ],
    iconList: [
      '🍜', '🛍️', '🚗', '🧴', '🎮', '📱', '✈️', '💊',
      '📚', '📌', '💰', '💼', '🎁', '📈', '🧧', '↩️',
      '☕', '🍰', '🏠', '🐱', '🎬', '🏋️', '🧾', '🔧'
    ],

    defaultSpendList: [
      { id: 'spend_food', name: '餐饮', icon: '🍜', color: '#ffd9d9', fixed: true },
      { id: 'spend_shop', name: '购物', icon: '🛍️', color: '#d9e8ff', fixed: true },
      { id: 'spend_traffic', name: '交通', icon: '🚗', color: '#d9ffea', fixed: true },
      { id: 'spend_daily', name: '日用', icon: '🧴', color: '#fff2cc', fixed: true },
      { id: 'spend_fun', name: '娱乐', icon: '🎮', color: '#ffe0f5', fixed: true },
      { id: 'spend_phone', name: '通讯', icon: '📱', color: '#e6e6ff', fixed: true },
      { id: 'spend_travel', name: '旅行', icon: '✈️', color: '#d6f5ff', fixed: true },
      { id: 'spend_medical', name: '医疗', icon: '💊', color: '#ffe2cc', fixed: true },
      { id: 'spend_study', name: '学习', icon: '📚', color: '#e6f5d9', fixed: true },
      { id: 'spend_other', name: '其他', icon: '📌', color: '#eeeeee', fixed: true }
    ],
    defaultIncomeList: [
      { id: 'income_salary', name: '工资', icon: '💰', color: '#ffe9b8', fixed: true },
      { id: 'income_part', name: '兼职', icon: '💼', color: '#d9e8ff', fixed: true },
      { id: 'income_bonus', name: '奖金', icon: '🎁', color: '#ffd9d9', fixed: true },
      { id: 'income_invest', name: '理财', icon: '📈', color: '#d9ffea', fixed: true },
      { id: 'income_red', name: '红包', icon: '🧧', color: '#ffe0e0', fixed: true },
      { id: 'income_refund', name: '退款', icon: '↩️', color: '#e6f5d9', fixed: true },
      { id: 'income_transfer', name: '转账', icon: '💸', color: '#d6f5ff', fixed: true },
      { id: 'income_other', name: '其他', icon: '📌', color: '#eeeeee', fixed: true }
    ]
  },

  onLoad() {
    this.initCategoryIfNeeded()
    this.loadCateData()
  },

  onShow() {
    this.loadCateData()
  },

  // 首次进入时写入默认分类,不再清空用户新增分类
  initCategoryIfNeeded() {
    let cateAll = wx.getStorageSync('category_list')
    if (!cateAll || !cateAll.spend || !cateAll.income) {
      cateAll = {
        spend: this.data.defaultSpendList,
        income: this.data.defaultIncomeList
      }
      wx.setStorageSync('category_list', cateAll)
    }
  },

  loadCateData() {
    const cateAll = wx.getStorageSync('category_list') || {
      spend: this.data.defaultSpendList,
      income: this.data.defaultIncomeList
    }
    const spend = Array.isArray(cateAll.spend) ? cateAll.spend : []
    const income = Array.isArray(cateAll.income) ? cateAll.income : []
    this.setData({
      spendList: spend,
      incomeList: income,
      spendTotal: spend.length,
      incomeTotal: income.length
    })
  },

  switchTab(e) {
    const idx = Number(e.currentTarget.dataset.index)
    this.setData({ currentTab: idx })
  },

  openAddPopup() {
    const tab = Number(this.data.currentTab)
    this.setData({
      showPopup: true,
      editId: '',
      tempName: '',
      selectColor: tab === 0 ? '#ffd9d9' : '#ffe9b8',
      selectIcon: tab === 0 ? '🍜' : '💰',
      targetTab: tab
    })
  },

  closePopup() {
    this.setData({ showPopup: false })
  },

  inputName(e) {
    this.setData({ tempName: e.detail.value })
  },

  selectColor(e) {
    this.setData({ selectColor: e.currentTarget.dataset.color })
  },

  selectIcon(e) {
    this.setData({ selectIcon: e.currentTarget.dataset.icon })
  },

  // 点击分类卡片,打开操作菜单
  openAction(e) {
    const { id, type } = e.currentTarget.dataset
    const list = Number(type) === 0 ? this.data.spendList : this.data.incomeList
    const item = list.find(c => c.id === id)
    if (!item) return
    this.setData({
      operateId: id,
      operateName: item.name,
      operateType: Number(type),
      showActionPopup: true
    })
  },

  closeActionPopup() {
    this.setData({ showActionPopup: false })
  },

  editCate() {
    const { operateId, operateType } = this.data
    const list = operateType === 0 ? this.data.spendList : this.data.incomeList
    const item = list.find(c => c.id === operateId)
    if (!item) return
    this.setData({
      showActionPopup: false,
      showPopup: true,
      editId: item.id,
      targetTab: operateType,
      tempName: item.name,
      selectColor: item.color,
      selectIcon: item.icon
    })
  },

  askDeleteCate() {
    this.setData({
      showActionPopup: false,
      showDeleteConfirm: true
    })
  },

  closeDeleteConfirm() {
    this.setData({ showDeleteConfirm: false })
  },

  saveCate() {
    const name = this.data.tempName.trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    if (name.length > 8) {
      wx.showToast({ title: '分类名称最多 8 个字', icon: 'none' })
      return
    }

    const cateAll = wx.getStorageSync('category_list') || { spend: [], income: [] }
    const typeKey = Number(this.data.targetTab) === 0 ? 'spend' : 'income'
    const arr = Array.isArray(cateAll[typeKey]) ? cateAll[typeKey] : []

    const dup = arr.find(item => item.name === name && item.id !== this.data.editId)
    if (dup) {
      wx.showToast({ title: '分类名称已存在', icon: 'none' })
      return
    }

    if (this.data.editId) {
      cateAll[typeKey] = arr.map(item => {
        if (item.id === this.data.editId) {
          return {
            ...item,
            name,
            color: this.data.selectColor,
            icon: this.data.selectIcon
          }
        }
        return item
      })
    } else {
      cateAll[typeKey] = [
        ...arr,
        {
          id: `${typeKey}_${Date.now()}`,
          name,
          color: this.data.selectColor,
          icon: this.data.selectIcon,
          fixed: false
        }
      ]
    }

    wx.setStorageSync('category_list', cateAll)
    wx.showToast({ title: this.data.editId ? '修改成功' : '新增成功', icon: 'none' })
    this.setData({ showPopup: false })
    this.loadCateData()
  },

  confirmDeleteCate() {
    const { operateId, operateType } = this.data
    const cateAll = wx.getStorageSync('category_list') || { spend: [], income: [] }
    const typeKey = operateType === 0 ? 'spend' : 'income'
    const arr = cateAll[typeKey] || []
    const item = arr.find(c => c.id === operateId)

    if (item && item.fixed) {
      wx.showToast({ title: '默认分类不能删除,可编辑名称和图标', icon: 'none' })
      this.setData({ showDeleteConfirm: false })
      return
    }

    cateAll[typeKey] = arr.filter(item => item.id !== operateId)
    wx.setStorageSync('category_list', cateAll)
    this.setData({ showDeleteConfirm: false })
    this.loadCateData()
    wx.showToast({ title: '已删除', icon: 'none' })
  },

  resetDefault() {
    wx.showModal({
      title: '恢复默认分类',
      content: '会恢复默认支出/收入分类,但会保留你自己新增的分类。确定继续吗？',
      success: res => {
        if (!res.confirm) return
        const cateAll = wx.getStorageSync('category_list') || { spend: [], income: [] }
        const customSpend = (cateAll.spend || []).filter(item => !item.fixed)
        const customIncome = (cateAll.income || []).filter(item => !item.fixed)
        wx.setStorageSync('category_list', {
          spend: [...this.data.defaultSpendList, ...customSpend],
          income: [...this.data.defaultIncomeList, ...customIncome]
        })
        this.loadCateData()
        wx.showToast({ title: '已恢复默认分类', icon: 'none' })
      }
    })
  },

  noop() {}
})
