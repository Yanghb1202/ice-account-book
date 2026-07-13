Page({
  data: {
    isLogin: false,
    userInfo: {
      avatar: "/images/default_avatar.jpg",
      nickname: "",
      uid: ""
    },

    assetTotal: "0.00",
    asset: "0.00",
    debt: "0.00",
    monthIncome: "0.00",
    monthExpense: "0.00",
    monthBalance: "0.00",
    billCount: 0,
    currentMonthText: "",

    quickList: [
      { type: "budget", icon: "📊", title: "预算", desc: "查看预算" },
      { type: "save", icon: "💰", title: "挑战", desc: "存钱计划" },
      { type: "book", icon: "📒", title: "账本", desc: "账本管理" },
      { type: "classify", icon: "🏷️", title: "分类", desc: "收支分类" }
    ],

    menuGroups: [
      {
        title: "账务管理",
        list: [
          { type: "budget", icon: "📊", iconClass: "yellow", text: "预算管理", sub: "控制每月花费" },
          { type: "save", icon: "💰", iconClass: "orange", text: "存钱挑战", sub: "养成储蓄习惯" },
          { type: "book", icon: "📒", iconClass: "green", text: "账本管理", sub: "管理不同账本" },
          { type: "classify", icon: "🏷️", iconClass: "pink", text: "分类管理", sub: "维护收支分类" }
        ]
      },
      {
        title: "服务与设置",
        list: [
          { type: "set", icon: "⚙️", iconClass: "blue", text: "账号设置", sub: "资料与安全" },
          { type: "feedback", icon: "❓", iconClass: "gray", text: "帮助与反馈", sub: "问题建议" },
          { type: "about", icon: "ⓘ", iconClass: "darkgray", text: "关于我们", sub: "应用说明" }
        ]
      }
    ]
  },

  onLoad() {
    this.initMonthText()
    this.refreshUser()
    this.calcAssetFromBill()
  },

  onShow() {
    this.refreshUser()
    this.calcAssetFromBill()
  },

  initMonthText() {
    const now = new Date()
    this.setData({
      currentMonthText: `${now.getFullYear()}年${now.getMonth() + 1}月`
    })
  },

  refreshUser() {
    const loginInfo = wx.getStorageSync("userLogin")
    if (loginInfo) {
      this.setData({
        isLogin: true,
        userInfo: {
          avatar: loginInfo.avatar || "/images/default_avatar.jpg",
          nickname: loginInfo.nickname || "记账用户",
          uid: loginInfo.uid || "",
          phone: loginInfo.phone || ""
        }
      })
    } else {
      this.setData({
        isLogin: false,
        userInfo: {
          avatar: "/images/default_avatar.jpg",
          nickname: "",
          uid: ""
        }
      })
    }
  },

  calcAssetFromBill() {
    const loginInfo = wx.getStorageSync("userLogin")
    if (!loginInfo) {
      this.setData({
        asset: "0.00",
        debt: "0.00",
        assetTotal: "0.00",
        monthIncome: "0.00",
        monthExpense: "0.00",
        monthBalance: "0.00",
        billCount: 0
      })
      return
    }

    const allBill = wx.getStorageSync("all_bill") || []
    const now = new Date()
    const currentMonth = now.getMonth() + 1

    let totalIncome = 0
    let totalPay = 0
    let monthIncome = 0
    let monthExpense = 0
    let billCount = 0

    allBill.forEach(item => {
      const money = Number(item.money || 0)
      const type = Number(item.type)

      if (type === 1) {
        totalIncome += money
      } else {
        totalPay += money
      }

      const billMonth = this.getBillMonth(item.date)
      if (billMonth === currentMonth) {
        billCount++
        if (type === 1) {
          monthIncome += money
        } else {
          monthExpense += money
        }
      }
    })

    const totalAsset = totalIncome - totalPay
    const realDebt = totalPay > totalIncome ? totalPay - totalIncome : 0
    const monthBalance = monthIncome - monthExpense

    this.setData({
      asset: this.formatMoney(totalIncome),
      debt: this.formatMoney(realDebt),
      assetTotal: this.formatMoney(totalAsset),
      monthIncome: this.formatMoney(monthIncome),
      monthExpense: this.formatMoney(monthExpense),
      monthBalance: this.formatMoney(monthBalance),
      billCount
    })
  },

  getBillMonth(dateText) {
    if (!dateText) return 0
    const match = String(dateText).match(/(\d+)月/)
    return match ? Number(match[1]) : 0
  },

  formatMoney(num) {
    return Number(num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  },

  handleAvatarClick() {
    if (!this.data.isLogin) {
      this.goLogin()
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempImg = res.tempFiles[0].tempFilePath
        const old = this.data.userInfo
        const newUserInfo = {
          avatar: tempImg,
          nickname: old.nickname,
          uid: old.uid,
          phone: old.phone
        }
        this.setData({ userInfo: newUserInfo })
        wx.setStorageSync("userLogin", newUserInfo)
        wx.showToast({ title: "头像更换成功", icon: "success" })
      }
    })
  },

  goSetPage() {
    this.checkLoginJump({
      currentTarget: {
        dataset: {
          type: "set"
        }
      }
    })
  },

  checkLoginJump(e) {
    const type = e.currentTarget.dataset.type

    if (!this.data.isLogin && type !== "about" && type !== "feedback") {
      wx.showModal({
        title: "未登录",
        content: "登录后可以使用完整的账本、预算和个人设置功能",
        confirmText: "去登录",
        cancelText: "稍后",
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: "/pages/login/login" })
          }
        }
      })
      return
    }

    const urlMap = {
      save: "/pages/saveChallenge/saveChallenge",
      budget: "/pages/budget/budget",
      book: "/pages/bookManage/bookManage",
      classify: "/pages/classify/classify",
      feedback: "/pages/feedback/feedback",
      about: "/pages/about/about",
      set: "/pages/set/set"
    }

    const targetUrl = urlMap[type]
    if (!targetUrl) return

    wx.navigateTo({
      url: targetUrl,
      fail: () => {
        wx.showToast({
          title: "页面暂未配置",
          icon: "none"
        })
      }
    })
  },

  clearLocalCache() {
    wx.showModal({
      title: "清理缓存",
      content: "仅清理页面缓存，不会删除账单和登录信息。",
      confirmText: "清理",
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: "清理完成", icon: "success" })
        }
      }
    })
  },

  logout() {
    if (!this.data.isLogin) {
      this.goLogin()
      return
    }

    wx.showModal({
      title: "退出登录",
      content: "退出后不会删除本地账单数据。",
      confirmText: "退出",
      confirmColor: "#e67e22",
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync("userLogin")
          this.refreshUser()
          wx.showToast({ title: "已退出登录", icon: "none" })
        }
      }
    })
  },

  switchTab(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const tabList = [
      "/pages/index/index",
      "/pages/addbill/addbill",
      "/pages/statistics/statistics",
      "/pages/mine/mine"
    ]
    wx.switchTab({
      url: tabList[idx]
    })
  },

  goRegister() {
    wx.navigateTo({ url: "/pages/register/register" })
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/login" })
  }
})
