// pages/login/login.js
const DB = require('../../utils/db.js')

Page({
  data: {
    phone: '',
    pwd: '',
    rememberPhone: true,
    showPwd: false
  },

  onLoad(options) {
    const lastPhone = wx.getStorageSync('lastLoginPhone') || ''
    this.setData({
      phone: options && options.phone ? options.phone : lastPhone
    })
  },

  inputPhone(e) {
    this.setData({ phone: e.detail.value })
  },

  inputPwd(e) {
    this.setData({ pwd: e.detail.value })
  },

  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd })
  },

  toggleRemember() {
    this.setData({ rememberPhone: !this.data.rememberPhone })
  },

  validateForm() {
    const { phone, pwd } = this.data
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return false
    }
    if (!pwd || pwd.length < 6) {
      wx.showToast({ title: '请输入至少 6 位密码', icon: 'none' })
      return false
    }
    return true
  },

  async doLogin() {
    if (!this.validateForm()) return

    const { phone, pwd } = this.data

    wx.showLoading({ title: '登录中...' })
    const result = await DB.userLogin({ phone, password: pwd })
    wx.hideLoading()

    if (!result.success) {
      if (result.message === '用户不存在') {
        wx.showModal({
          title: '账号不存在',
          content: '该手机号还没有注册,是否前往注册？',
          confirmText: '去注册',
          success: res => {
            if (res.confirm) {
              wx.redirectTo({ url: `/pages/register/register?phone=${phone}` })
            }
          }
        })
      } else {
        wx.showToast({ title: result.message, icon: 'none' })
      }
      return
    }

    const loginUser = {
      ...result.data,
      loginTime: Date.now()
    }
    wx.setStorageSync('userLogin', loginUser)
    if (this.data.rememberPhone) {
      wx.setStorageSync('lastLoginPhone', phone)
    } else {
      wx.removeStorageSync('lastLoginPhone')
    }

    wx.showToast({ title: '登录成功', icon: 'none' })
    setTimeout(() => {
      this.goHome()
    }, 700)
  },

  goHome() {
    wx.switchTab({
      url: '/pages/index/index',
      fail: () => {
        wx.reLaunch({
          url: '/pages/index/index',
          fail: () => {
            wx.showToast({ title: '请确认首页已在 app.json 注册', icon: 'none' })
          }
        })
      }
    })
  },

  goRegister() {
    wx.redirectTo({
      url: '/pages/register/register'
    })
  },

  goForget() {
    wx.showModal({
      title: '忘记密码',
      content: '当前为本地账号系统,请重新注册或在 userAccountList 缓存中重置密码。后续可接入后端短信验证码找回。',
      showCancel: false
    })
  },

  quickLoginDemo() {
    const demoPhone = '13800000000'
    const accountList = wx.getStorageSync('userAccountList') || []
    let demoUser = accountList.find(item => item.phone === demoPhone)
    if (!demoUser) {
      demoUser = {
        uid: 'demo',
        phone: demoPhone,
        password: '123456',
        nickname: '冰冰',
        avatar: '',
        createTime: Date.now()
      }
      accountList.push(demoUser)
      wx.setStorageSync('userAccountList', accountList)
    }
    this.setData({
      phone: demoPhone,
      pwd: '123456'
    })
    wx.showToast({ title: '已填入测试账号', icon: 'none' })
  }
})
