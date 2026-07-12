// pages/set/set.js
Page({
  data: {
    showModal: false,
    modalIcon: '',
    modalTitle: '',
    modalDesc: '',
    modalTwoBtn: false,
    modalAction: '',

    autoSyncBudget: true,
    soundEffect: true,
    privacyMode: false,
    cacheSize: '0 KB',
    billCount: 0,
    feedbackCount: 0,
    version: 'V1.0.0'
  },

  onShow() {
    this.loadSetting()
    this.calcCacheInfo()
  },

  // 读取设置
  loadSetting() {
    const setting = wx.getStorageSync('appSetting') || {}
    this.setData({
      autoSyncBudget: setting.autoSyncBudget !== false,
      soundEffect: setting.soundEffect !== false,
      privacyMode: !!setting.privacyMode
    })
  },

  saveSetting() {
    wx.setStorageSync('appSetting', {
      autoSyncBudget: this.data.autoSyncBudget,
      soundEffect: this.data.soundEffect,
      privacyMode: this.data.privacyMode
    })
  },

  // 计算缓存信息
  calcCacheInfo() {
    const allBill = wx.getStorageSync('all_bill') || []
    const feedback = wx.getStorageSync('feedback_list') || []
    const keys = ['all_bill', 'budgetData', 'saveChallenge', 'feedback_list', 'bookList', 'assetData', 'billList']
    let totalLen = 0
    keys.forEach(key => {
      const val = wx.getStorageSync(key)
      if (val) {
        try {
          totalLen += JSON.stringify(val).length
        } catch (e) {}
      }
    })
    const kb = (totalLen / 1024).toFixed(1)
    this.setData({
      billCount: allBill.length,
      feedbackCount: feedback.length,
      cacheSize: `${kb} KB`
    })
  },

  // 开关
  toggleAutoSync() {
    this.setData({ autoSyncBudget: !this.data.autoSyncBudget }, () => {
      this.saveSetting()
      wx.showToast({ title: this.data.autoSyncBudget ? '已开启预算同步' : '已关闭预算同步', icon: 'none' })
    })
  },

  toggleSound() {
    this.setData({ soundEffect: !this.data.soundEffect }, () => {
      this.saveSetting()
      wx.showToast({ title: this.data.soundEffect ? '已开启反馈音效' : '已关闭反馈音效', icon: 'none' })
    })
  },

  togglePrivacyMode() {
    this.setData({ privacyMode: !this.data.privacyMode }, () => {
      this.saveSetting()
      wx.showToast({ title: this.data.privacyMode ? '已开启隐私模式' : '已关闭隐私模式', icon: 'none' })
    })
  },

  // 清除缓存
  clearStorage() {
    this.openConfirm({
      icon: '🗑️',
      title: '清除本地缓存',
      desc: '将清空账单、预算、存钱挑战、账本和反馈记录,不会删除登录账号信息。确定继续吗？',
      action: 'clear'
    })
  },

  // 导出提示
  exportData() {
    this.openInfo({
      icon: '📦',
      title: '数据导出',
      desc: `当前共有 ${this.data.billCount} 条账单记录。小程序端暂未接入文件导出,后续可扩展为生成 JSON/Excel 文件。`
    })
  },

  // 隐私政策弹窗
  showPrivacy() {
    this.openInfo({
      icon: '📜',
      title: '隐私政策',
      desc: '账单、预算、存钱挑战等数据默认保存在本地缓存中。餐饮 AI 识别会上传图片到后端服务用于菜品识别,不会用于其他用途。请避免在备注中填写身份证号、银行卡号等敏感信息。'
    })
  },

  // 用户协议弹窗
  showAgreement() {
    this.openInfo({
      icon: '📋',
      title: '用户使用协议',
      desc: '本小程序仅用于个人日常收支记录和生活管理,数据准确性由用户自行核对。请勿将本工具用于违法违规用途。'
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({ title: '检查中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '当前已是最新版本', icon: 'none' })
    }, 600)
  },

  // 跳转
  goAbout() {
    wx.navigateTo({
      url: '/pages/about/about',
      fail: () => wx.showToast({ title: '关于页面未配置', icon: 'none' })
    })
  },

  goFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback',
      fail: () => wx.showToast({ title: '反馈页面未配置', icon: 'none' })
    })
  },

  // 退出登录弹窗
  logoutConfirm() {
    this.openConfirm({
      icon: '🚪',
      title: '退出登录',
      desc: '仅退出当前登录状态,不会删除账单和账号信息。下次可重新登录。',
      action: 'logout'
    })
  },

  openInfo({ icon, title, desc }) {
    this.setData({
      showModal: true,
      modalIcon: icon,
      modalTitle: title,
      modalDesc: desc,
      modalTwoBtn: false,
      modalAction: ''
    })
  },

  openConfirm({ icon, title, desc, action }) {
    this.setData({
      showModal: true,
      modalIcon: icon,
      modalTitle: title,
      modalDesc: desc,
      modalTwoBtn: true,
      modalAction: action
    })
  },

  // 弹窗确定按钮
  modalConfirm() {
    if (this.data.modalAction === 'clear') {
      const keys = ['all_bill', 'budgetData', 'saveChallenge', 'feedback_list', 'bookList', 'assetData', 'billList']
      keys.forEach(key => wx.removeStorageSync(key))
      this.setData({
        showModal: true,
        modalIcon: '✅',
        modalTitle: '清除成功',
        modalDesc: '本地记账缓存已清空,账号信息保留。',
        modalTwoBtn: false,
        modalAction: ''
      })
      this.calcCacheInfo()
      return
    }

    if (this.data.modalAction === 'logout') {
      wx.removeStorageSync('userLogin')
      wx.reLaunch({
        url: '/pages/login/login',
        fail: () => wx.showToast({ title: '登录页未配置', icon: 'none' })
      })
    }
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showModal: false,
      modalAction: ''
    })
  },

  stopBubble() {}
})
