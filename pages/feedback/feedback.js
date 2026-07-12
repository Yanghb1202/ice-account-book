// pages/feedback/feedback.js
Page({
  data: {
    faqIndex: -1,
    feedType: 0,
    feedContent: '',
    imgList: [],
    contact: '',
    showPop: false,
    submitTime: '',

    typeList: [
      { id: 0, name: '功能 Bug', icon: '🐞' },
      { id: 1, name: '体验建议', icon: '💡' },
      { id: 2, name: 'AI 识别', icon: '🍜' },
      { id: 3, name: '其他问题', icon: '💬' }
    ],
    faqList: [
      {
        q: '点击餐饮后为什么要跳到 AI 识别页？',
        a: '餐饮分类已接入美食记录功能,点击餐饮会进入拍照识别页面,识别后可记录菜品和价格。'
      },
      {
        q: '记的账单怎么修改或删除？',
        a: '进入账单列表或详情页面,找到对应账单后可以进行编辑和删除。'
      },
      {
        q: '预算为什么会自动变化？',
        a: '记账时如果分类匹配预算分类,系统会自动同步已用金额,方便查看本月预算使用情况。'
      },
      {
        q: '反馈内容会保存在哪里？',
        a: '当前版本会先保存在本地缓存 feedback_list 中,方便你查看历史反馈记录。'
      }
    ],
    historyList: []
  },

  onShow() {
    this.loadHistory()
  },

  // 折叠展开 FAQ
  toggleFaq(e) {
    const idx = Number(e.currentTarget.dataset.index)
    this.setData({
      faqIndex: this.data.faqIndex === idx ? -1 : idx
    })
  },

  // 选择反馈类型
  selectType(e) {
    const t = Number(e.currentTarget.dataset.t)
    this.setData({ feedType: t })
  },

  // 输入反馈内容
  inputContent(e) {
    let val = e.detail.value || ''
    if (val.length > 300) val = val.slice(0, 300)
    this.setData({ feedContent: val })
  },

  // 输入联系方式
  inputContact(e) {
    this.setData({ contact: e.detail.value })
  },

  // 选择上传图片
  chooseImg() {
    const remain = 3 - this.data.imgList.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 3 张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const newImgs = res.tempFiles.map(item => item.tempFilePath)
        this.setData({ imgList: [...this.data.imgList, ...newImgs].slice(0, 3) })
      }
    })
  },

  // 预览图片
  previewImg(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: this.data.imgList,
      current: url
    })
  },

  // 删除图片
  delImg(e) {
    const i = Number(e.currentTarget.dataset.i)
    const arr = this.data.imgList.filter((_, idx) => idx !== i)
    this.setData({ imgList: arr })
  },

  // 提交反馈
  submitFeed() {
    const content = this.data.feedContent.trim()
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (content.length < 6) {
      wx.showToast({ title: '反馈内容再详细一点哦', icon: 'none' })
      return
    }
    const typeInfo = this.data.typeList.find(item => item.id === this.data.feedType) || this.data.typeList[0]
    const now = new Date()
    const submitTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const feedData = {
      id: Date.now().toString(),
      type: this.data.feedType,
      typeName: typeInfo.name,
      typeIcon: typeInfo.icon,
      content,
      imgs: this.data.imgList,
      contact: this.data.contact,
      time: submitTime,
      status: '已提交'
    }

    const allFeed = wx.getStorageSync('feedback_list') || []
    allFeed.unshift(feedData)
    wx.setStorageSync('feedback_list', allFeed)

    this.setData({
      showPop: true,
      submitTime,
      historyList: allFeed.slice(0, 3)
    })
  },

  closePop() {
    this.setData({
      showPop: false,
      feedContent: '',
      imgList: [],
      contact: '',
      feedType: 0
    })
  },

  loadHistory() {
    const allFeed = wx.getStorageSync('feedback_list') || []
    this.setData({ historyList: allFeed.slice(0, 3) })
  },

  clearHistory() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空本地反馈记录吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('feedback_list')
          this.setData({ historyList: [] })
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  },

  copyEmail() {
    wx.setClipboardData({
      data: 'bingbing-book@example.com',
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'none' })
    })
  },

  noop() {}
})
