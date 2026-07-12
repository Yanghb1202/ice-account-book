// pages/register/register.js
Page({
  data: {
    phone: '',
    nickname: '',
    pwd: '',
    repwd: '',
    avatar: '',
    agree: true,
    showPwd: false,
    showRepwd: false
  },

  inputPhone(e) {
    this.setData({ phone: e.detail.value })
  },

  inputNickname(e) {
    this.setData({ nickname: e.detail.value })
  },

  inputPwd(e) {
    this.setData({ pwd: e.detail.value })
  },

  inputRepwd(e) {
    this.setData({ repwd: e.detail.value })
  },

  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd })
  },

  toggleRepwd() {
    this.setData({ showRepwd: !this.data.showRepwd })
  },

  toggleAgree() {
    this.setData({ agree: !this.data.agree })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        this.setData({
          avatar: res.tempFiles[0].tempFilePath
        })
      }
    })
  },

  validateForm() {
    const { phone, nickname, pwd, repwd, agree } = this.data
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return false
    }
    if (!nickname.trim()) {
      wx.showToast({ title: '请设置昵称', icon: 'none' })
      return false
    }
    if (nickname.trim().length > 12) {
      wx.showToast({ title: '昵称最多 12 个字', icon: 'none' })
      return false
    }
    if (!pwd || pwd.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' })
      return false
    }
    if (pwd !== repwd) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return false
    }
    if (!agree) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' })
      return false
    }
    return true
  },

  doRegister() {
    if (!this.validateForm()) return

    const { phone, nickname, pwd, avatar } = this.data
    const accountList = wx.getStorageSync('userAccountList') || []
    const exist = accountList.find(item => item.phone === phone)
    if (exist) {
      wx.showToast({ title: '该手机号已注册,请直接登录', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/login/login?phone=${phone}` })
      }, 800)
      return
    }

    wx.showLoading({ title: '注册中...' })
    setTimeout(() => {
      wx.hideLoading()
      const userInfo = {
        uid: Date.now().toString(),
        phone,
        password: pwd,
        nickname: nickname.trim(),
        avatar,
        createTime: Date.now()
      }
      accountList.push(userInfo)
      wx.setStorageSync('userAccountList', accountList)

      wx.showToast({ title: '注册成功,请登录', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/login/login?phone=${phone}`
        })
      }, 900)
    }, 600)
  },

  goLogin() {
    wx.redirectTo({
      url: '/pages/login/login'
    })
  },

  showAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '当前账号数据保存在本地缓存中,请妥善保管手机号和密码。注册后需要返回登录页完成登录。',
      showCancel: false
    })
  }
})
