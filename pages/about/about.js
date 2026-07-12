// pages/about/about.js
Page({
  data: {
    appName: '冰冰记账本',
    version: 'V1.0.0',
    updateTime: '2026-06',
    contactEmail: 'bingbing-book@example.com',
    showPrivacyPop: false,
    featureList: [
      { icon: '💰', title: '快速记账', desc: '支出、收入一键记录' },
      { icon: '🍜', title: '餐饮识别', desc: '拍照 AI 识别美食' },
      { icon: '📊', title: '统计图表', desc: '收支趋势清晰可见' },
      { icon: '🎯', title: '预算管理', desc: '控制每月花费上限' },
      { icon: '🐶', title: '存钱挑战', desc: '养成长期储蓄习惯' },
      { icon: '📒', title: '多账本', desc: '生活、差旅分开管理' }
    ],
    updateList: [
      '新增餐饮 AI 智能识别记录',
      '优化首页、统计页、预算页展示',
      '支持本月收支、预算、最近账单同步',
      '修复部分页面数据为空时报错问题'
    ]
  },

  // 跳转到帮助与反馈页面
  goFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback',
      fail: () => {
        wx.showToast({
          title: '反馈页面暂未配置',
          icon: 'none'
        })
      }
    })
  },

  // 复制联系邮箱
  copyEmail() {
    wx.setClipboardData({
      data: this.data.contactEmail,
      success: () => {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'none'
        })
      }
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({
      title: '检查中...'
    })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '当前已是最新版本',
        icon: 'none'
      })
    }, 600)
  },

  // 打开隐私说明
  openPrivacy() {
    this.setData({ showPrivacyPop: true })
  },

  closePrivacy() {
    this.setData({ showPrivacyPop: false })
  }
})
