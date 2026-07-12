// pages/bookManage/bookManage.js
Page({
  data: {
    bookList: [],
    showPopup: false,
    showOperatePopup: false,
    showDeleteConfirm: false,

    editId: '',
    tempName: '',
    selectColor: '#ffdd99',
    selectIcon: '📒',
    isDefault: false,

    curOperateId: '',
    curOperateName: '',

    colorList: [
      '#ffdd99', '#ffc8c8', '#c8e5ff', '#c8ffd9',
      '#e8c8ff', '#fff2c8', '#ffdfc8', '#d9d9ff',
      '#ffd9d9', '#d9e8ff', '#d9ffea', '#ffe0f5'
    ],
    iconList: ['📒', '🏠', '👛', '✈️', '🍜', '🛍️', '🚗', '🎮', '💼', '📚', '🐱', '🌿'],

    // 统计
    totalSpend: '0.00',
    bookCount: 0,
    defaultBookName: '无'
  },

  onLoad() { this.loadBookData() },
  onShow() { this.loadBookData() },

  // ============ 加载 ============
  loadBookData() {
    const bookStorage = wx.getStorageSync('bookList')
    let list = []
    try {
      list = bookStorage ? JSON.parse(bookStorage) : []
    } catch (e) { list = [] }

    const allBill = wx.getStorageSync('all_bill') || []
    let totalSpend = 0
    let defaultBookName = '无'

    list.forEach(book => {
      let spend = 0
      let income = 0
      let count = 0
      allBill.forEach(bill => {
        if (bill.bookName === book.name || bill.bookId === book.id) {
          count++
          if (bill.type === 0) spend += Number(bill.money)
          else income += Number(bill.money)
        }
      })
      book.totalSpend = spend.toFixed(2)
      book.totalIncome = income.toFixed(2)
      book.billCount = count
      totalSpend += spend
      if (book.isDefault) defaultBookName = book.name
    })

    this.setData({
      bookList: list,
      totalSpend: totalSpend.toFixed(2),
      bookCount: list.length,
      defaultBookName
    })
  },

  // ============ 弹窗控制 ============
  openAddPopup() {
    this.setData({
      showPopup: true,
      editId: '',
      tempName: '',
      selectColor: '#ffdd99',
      selectIcon: '📒',
      isDefault: false
    })
  },

  closePopup() {
    this.setData({ showPopup: false })
  },

  openOperate(e) {
    const id = e.currentTarget.dataset.id
    const book = this.data.bookList.find(b => b.id === id)
    this.setData({
      curOperateId: id,
      curOperateName: book ? book.name : '',
      showOperatePopup: true
    })
  },

  closeOperatePopup() {
    this.setData({ showOperatePopup: false })
  },

  closeDeleteConfirm() {
    this.setData({ showDeleteConfirm: false })
  },

  noop() {},

  // ============ 输入与选择 ============
  inputBookName(e) { this.setData({ tempName: e.detail.value }) },

  selectColor(e) { this.setData({ selectColor: e.currentTarget.dataset.color }) },
  selectIcon(e) { this.setData({ selectIcon: e.currentTarget.dataset.icon }) },

  toggleDefault() {
    this.setData({ isDefault: !this.data.isDefault })
  },

  // ============ 保存 ============
  saveBook() {
    const { tempName, selectColor, selectIcon, isDefault, editId, bookList } = this.data
    const name = tempName.trim()
    if (!name) {
      wx.showToast({ title: '请输入账本名称', icon: 'none' })
      return
    }
    // 名称重复检查（排除自己）
    const dup = bookList.find(b => b.name === name && b.id !== editId)
    if (dup) {
      wx.showToast({ title: '账本名称已存在', icon: 'none' })
      return
    }

    let list = [...bookList]
    if (editId) {
      const idx = list.findIndex(item => item.id === editId)
      list[idx].name = name
      list[idx].color = selectColor
      list[idx].icon = selectIcon
      if (isDefault) {
        list.forEach(item => item.isDefault = false)
        list[idx].isDefault = true
      }
    } else {
      const newBook = {
        id: Date.now().toString(),
        name,
        color: selectColor,
        icon: selectIcon,
        isDefault,
        totalSpend: '0.00',
        totalIncome: '0.00',
        billCount: 0
      }
      if (isDefault) list.forEach(item => item.isDefault = false)
      list.unshift(newBook)
    }

    wx.setStorageSync('bookList', JSON.stringify(list))
    wx.showToast({ title: editId ? '修改成功' : '创建成功', icon: 'none' })
    this.setData({ showPopup: false })
    this.loadBookData()
  },

  // ============ 操作菜单 ============
  setDefault() {
    const { curOperateId, bookList } = this.data
    let list = [...bookList]
    list.forEach(item => item.isDefault = false)
    const idx = list.findIndex(i => i.id === curOperateId)
    if (idx >= 0) list[idx].isDefault = true
    wx.setStorageSync('bookList', JSON.stringify(list))
    wx.showToast({ title: '已设为默认', icon: 'none' })
    this.setData({ showOperatePopup: false })
    this.loadBookData()
  },

  editBook() {
    const { curOperateId, bookList } = this.data
    const target = bookList.find(item => item.id === curOperateId)
    if (!target) return
    this.setData({
      showOperatePopup: false,
      showPopup: true,
      editId: curOperateId,
      tempName: target.name,
      selectColor: target.color,
      selectIcon: target.icon,
      isDefault: target.isDefault
    })
  },

  delBook() {
    this.setData({ showOperatePopup: false, showDeleteConfirm: true })
  },

  confirmDelete() {
    const { curOperateId, bookList } = this.data
    let list = bookList.filter(item => item.id !== curOperateId)
    wx.setStorageSync('bookList', JSON.stringify(list))
    wx.showToast({ title: '已删除', icon: 'none' })
    this.setData({ showDeleteConfirm: false })
    this.loadBookData()
  },

  // ============ 返回 ============
  backMine() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  }
})
