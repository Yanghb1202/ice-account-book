// pages/addbill/addbill.js
const app = getApp()
const DB = require('../../utils/db.js')

const recorderManager = wx.getRecorderManager()

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    billType: 0, // 0支出 1收入
    money: '0.00',
    tempMoney: '',
    expression: '', // 计算表达式显示
    pendingOp: '',  // 待计算的运算符 + / -
    lastNum: '',    // 上一个数字（用于运算）

    remark: '',
    dateStr: '',
    fullDate: '',

    curCateIndex: 0,

    // 支出分类（emoji 兜底，避免找不到图）
    expenseList: [
      { id: 1, name: '餐饮', emoji: '🍜', color: '#ffd9d9' },
      { id: 2, name: '购物', emoji: '🛍️', color: '#d9e8ff' },
      { id: 3, name: '交通', emoji: '🚗', color: '#d9ffea' },
      { id: 4, name: '日用', emoji: '🧴', color: '#fff2cc' },
      { id: 5, name: '娱乐', emoji: '🎮', color: '#ffe0f5' },
      { id: 6, name: '通讯', emoji: '📱', color: '#e6e6ff' },
      { id: 7, name: '旅行', emoji: '✈️', color: '#d6f5ff' },
      { id: 8, name: '医疗', emoji: '💊', color: '#ffe2cc' },
      { id: 9, name: '学习', emoji: '📚', color: '#e6f5d9' },
      { id: 10, name: '其他', emoji: '📌', color: '#eeeeee' }
    ],
    // 收入分类
    incomeList: [
      { id: 101, name: '工资', emoji: '💰', color: '#ffe9b8' },
      { id: 102, name: '兼职', emoji: '💼', color: '#d9e8ff' },
      { id: 103, name: '奖金', emoji: '🎁', color: '#ffd9d9' },
      { id: 104, name: '理财', emoji: '📈', color: '#d9ffea' },
      { id: 105, name: '红包', emoji: '🧧', color: '#ffe0e0' },
      { id: 106, name: '退款', emoji: '↩️', color: '#e6f5d9' },
      { id: 107, name: '转账', emoji: '💸', color: '#d6f5ff' },
      { id: 108, name: '其他', emoji: '📌', color: '#eeeeee' }
    ],
    cateList: [], // 当前展示的分类

    // 常用备注
    quickRemarks: ['早餐', '午餐', '晚餐', '打车', '奶茶', '水果'],

    // 今日 / 本月统计
    todayExpense: '0.00',
    monthExpense: '0.00',
    monthIncome: '0.00',

    // 账本
    bookName: '日常账本',

    // AI语音记账
    isRecording: false,
    voiceText: '',
    showAiResult: false,
    aiResultMoney: '0.00',
    aiResultCate: '',
    aiResultRemark: '',
    aiSuggestCate: ''
  },

  onLoad() {
    // 顶部状态栏 + 自定义导航高度
    try {
      const sys = wx.getSystemInfoSync()
      const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null
      const sb = sys.statusBarHeight || 20
      const navH = menu ? (menu.top - sb) * 2 + menu.height : 44
      this.setData({ statusBarHeight: sb, navBarHeight: navH })
    } catch (e) {}

    // 初始日期
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    this.setData({
      dateStr: `${m}月${d}日`,
      fullDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      cateList: this.data.expenseList
    })

    // 初始化录音管理器
    recorderManager.onStart(() => {
      console.log('录音开始')
    })

    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      wx.hideLoading()
      this.setData({ isRecording: false })
      this.recognizeVoice(res.tempFilePath)
    })

    recorderManager.onError((err) => {
      console.error('录音错误', err)
      wx.hideLoading()
      this.setData({ isRecording: false })
      wx.showToast({ title: '录音失败', icon: 'none' })
    })
  },

  onShow() {
    this.calcStat()
  },

  // ============ 类型切换：支出 / 收入 ============
  switchType(e) {
    const type = Number(e.currentTarget.dataset.type)
    if (type === this.data.billType) return
    this.setData({
      billType: type,
      curCateIndex: 0,
      cateList: type === 0 ? this.data.expenseList : this.data.incomeList
    })
  },

  // ============ 分类选择 ============
  selectCate(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const cate = this.data.cateList[idx]
    // 支出页点击“餐饮”时,进入餐饮手账 / AI 智能识别页面
    if (this.data.billType === 0 && cate && cate.name === '餐饮') {
      wx.navigateTo({
        url: '/pages/classify/food/food',
        fail: () => {
          wx.showToast({
            title: '请确认 food 页面已在 app.json 注册',
            icon: 'none'
          })
        }
      })
      return
    }
    this.setData({ curCateIndex: idx })
  },

  // ============ 数字键盘 ============
  inputNum(e) {
    const num = e.currentTarget.dataset.num
    let temp = this.data.tempMoney
    // 小数点限制
    if (num === '.') {
      if (!temp) { temp = '0'; }
      if (temp.includes('.')) return
      temp += '.'
    } else {
      // 限制整数位 8 位
      const intPart = temp.split('.')[0] || ''
      if (!temp.includes('.') && intPart.length >= 8) return
      // 小数限制 2 位
      if (temp.includes('.') && temp.split('.')[1].length >= 2) return
      // 避免前导 0
      if (temp === '0' && num !== '.') temp = ''
      temp += num
    }
    this.setData({
      tempMoney: temp,
      money: temp ? this.formatMoney(temp) : '0.00',
      expression: this.buildExpression(temp)
    })
  },

  delNum() {
    let temp = this.data.tempMoney.slice(0, -1)
    this.setData({
      tempMoney: temp,
      money: temp ? this.formatMoney(temp) : '0.00',
      expression: this.buildExpression(temp)
    })
  },

  // 加 / 减运算
  keyAdd() { this.handleOp('+') },
  keySub() { this.handleOp('-') },
  handleOp(op) {
    const cur = parseFloat(this.data.tempMoney || '0')
    if (this.data.pendingOp && this.data.lastNum !== '') {
      // 已有待运算符 → 先计算
      const result = this.compute(parseFloat(this.data.lastNum), cur, this.data.pendingOp)
      this.setData({
        lastNum: String(result),
        tempMoney: '',
        pendingOp: op,
        money: this.formatMoney(result),
        expression: `${this.formatMoney(result)} ${op}`
      })
    } else {
      this.setData({
        lastNum: String(cur),
        tempMoney: '',
        pendingOp: op,
        expression: `${this.formatMoney(cur)} ${op}`
      })
    }
  },
  compute(a, b, op) {
    const r = op === '+' ? a + b : a - b
    return Math.round(r * 100) / 100
  },
  buildExpression(temp) {
    if (this.data.pendingOp && this.data.lastNum !== '') {
      return `${this.formatMoney(this.data.lastNum)} ${this.data.pendingOp} ${temp || ''}`
    }
    return ''
  },
  formatMoney(v) {
    const n = parseFloat(v)
    if (isNaN(n)) return '0.00'
    return n.toFixed(2)
  },

  // 获取最终金额（处理未结算的表达式）
  getFinalMoney() {
    const cur = parseFloat(this.data.tempMoney || '0')
    if (this.data.pendingOp && this.data.lastNum !== '') {
      return this.compute(parseFloat(this.data.lastNum), cur, this.data.pendingOp)
    }
    return cur
  },

  // ============ 备注 ============
  inputRemark(e) {
    this.setData({ remark: e.detail.value })
  },
  selectQuickRemark(e) {
    const txt = e.currentTarget.dataset.txt
    this.setData({ remark: txt })
  },

  // ============ 日期 ============
  bindDateChange(e) {
    const val = e.detail.value
    const arr = val.split('-')
    this.setData({
      fullDate: val,
      dateStr: `${Number(arr[1])}月${Number(arr[2])}日`
    })
  },

  // ============ 账本 ============
  selectBook() {
    const books = ['日常账本', '工作账本', '差旅账本', '理财账本']
    wx.showActionSheet({
      itemList: books,
      success: (res) => {
        this.setData({ bookName: books[res.tapIndex] })
      }
    })
  },

  // ============ 顶部统计 ============
  calcStat() {
    const userInfo = wx.getStorageSync('userLogin')
    if (!userInfo) {
      this.setData({
        todayExpense: '0.00',
        monthExpense: '0.00',
        monthIncome: '0.00'
      })
      return
    }

    const all = wx.getStorageSync('all_bill') || []
    const now = new Date()
    const ty = now.getFullYear()
    const tm = now.getMonth() + 1
    const td = now.getDate()
    const todayKey = `${tm}月${td}日`

    let todayExp = 0, monthExp = 0, monthIn = 0
    const todayFullDate = `${ty}-${String(tm).padStart(2, '0')}-${String(td).padStart(2, '0')}`
    
    all.forEach(it => {
      let mY = ty, mM = tm, dD = td
      if (it.fullDate) {
        try {
          const a = String(it.fullDate).split('-')
          if (a.length >= 3) {
            mY = Number(a[0]); mM = Number(a[1]); dD = Number(a[2])
          } else if (typeof it.fullDate === 'number') {
            const d = new Date(it.fullDate)
            mY = d.getFullYear(); mM = d.getMonth() + 1; dD = d.getDate()
          }
        } catch (e) {}
      }
      const inThisMonth = (mY === ty && mM === tm)
      if (inThisMonth) {
        if (it.type === 0) monthExp += Number(it.money)
        else monthIn += Number(it.money)
      }
      if (it.type === 0 && mY === ty && mM === tm && dD === td) {
        todayExp += Number(it.money)
      }
    })
    this.setData({
      todayExpense: todayExp.toFixed(2),
      monthExpense: monthExp.toFixed(2),
      monthIncome: monthIn.toFixed(2)
    })
  },

  // ============ 返回 ============
  goBack() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }) },

  // ============ 提交 ============
  async submitBill() {
    const money = this.getFinalMoney()
    if (!money || money <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    const cateInfo = this.data.cateList[this.data.curCateIndex]
    const billData = {
      id: Date.now(),
      type: this.data.billType,
      billType: this.data.billType,
      money: Math.round(money * 100) / 100,
      cateName: cateInfo.name,
      cateEmoji: cateInfo.emoji,
      cateIcon: cateInfo.icon || '',
      remark: this.data.remark || cateInfo.name,
      date: this.data.dateStr,
      fullDate: this.data.fullDate,
      bookName: this.data.bookName,
      createTime: Date.now()
    }
    await DB.addBill(billData)

    // 同步预算（仅支出）
    if (this.data.billType === 0) {
      this.syncBudgetUsed(cateInfo.name, billData.money)
    }

    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '记录成功 🎉', icon: 'none' })

    // 重置输入
    this.setData({
      tempMoney: '',
      money: '0.00',
      remark: '',
      lastNum: '',
      pendingOp: '',
      expression: ''
    })
    this.calcStat()
  },

  // ============ 预算同步 ============
  syncBudgetUsed(cateShortName, addMoney) {
    const map = {
      '餐饮': '餐饮美食',
      '购物': '日常购物',
      '交通': '交通出行',
      '娱乐': '休闲娱乐'
    }
    const targetCateName = map[cateShortName]
    if (!targetCateName) return

    let budgetData = wx.getStorageSync('budgetData')
    if (!budgetData || !budgetData.budgetList) {
      budgetData = {
        totalBudget: 4000,
        usedMoney: 0,
        leftMoney: 4000,
        usedPercent: 0,
        budgetList: [
          { id: 1, name: '餐饮美食', icon: '🍜', color: '#ffd9d9', total: 1500, used: 0 },
          { id: 2, name: '日常购物', icon: '🛍️', color: '#d9e8ff', total: 1000, used: 0 },
          { id: 3, name: '交通出行', icon: '🚗', color: '#d9ffea', total: 100, used: 0 },
          { id: 4, name: '休闲娱乐', icon: '🎮', color: '#fff2cc', total: 1200, used: 0 }
        ]
      }
    }
    const list = budgetData.budgetList
    let find = false
    for (let i = 0; i < list.length; i++) {
      if (list[i].name === targetCateName) {
        list[i].used = Math.round((Number(list[i].used) + Number(addMoney)) * 100) / 100
        find = true
        break
      }
    }
    if (find) {
      let allUsed = 0
      list.forEach(it => allUsed += Number(it.used))
      budgetData.usedMoney = Math.round(allUsed * 100) / 100
      budgetData.leftMoney = Math.round((budgetData.totalBudget - allUsed) * 100) / 100
      budgetData.usedPercent = budgetData.totalBudget === 0 ? 0 : ((allUsed / budgetData.totalBudget) * 100).toFixed(1)
    }
    wx.setStorageSync('budgetData', budgetData)
  },

  // ============ AI语音记账 ============
  toggleVoice() {
    if (this.data.isRecording) {
      this.stopVoice()
    } else {
      this.startVoice()
    }
  },

  startVoice() {
    wx.showToast({ title: '请说话...', icon: 'none', duration: 2000 })
    this.setData({ isRecording: true })
    
    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  },

  stopVoice() {
    recorderManager.stop()
    this.setData({ isRecording: false })
  },

  recognizeVoice(filePath) {
    wx.showLoading({ title: 'AI识别中...', mask: true })
    
    setTimeout(() => {
      wx.hideLoading()
      this.simulateVoiceRecognition()
    }, 800)
  },

  simulateVoiceRecognition() {
    const examples = [
      { text: '今天午餐花了35块钱', type: 'expense', category: '餐饮', money: '35.00' },
      { text: '打车花了20块', type: 'expense', category: '交通', money: '20.00' },
      { text: '买了一杯奶茶15元', type: 'expense', category: '餐饮', money: '15.00' },
      { text: '工资收入8000元', type: 'income', category: '工资', money: '8000.00' },
      { text: '超市购物花了128元', type: 'expense', category: '购物', money: '128.00' },
      { text: '晚餐吃火锅花了156元', type: 'expense', category: '餐饮', money: '156.00' },
      { text: '交话费50元', type: 'expense', category: '通讯', money: '50.00' },
      { text: '买衣服花了320元', type: 'expense', category: '购物', money: '320.00' },
      { text: '兼职收入200元', type: 'income', category: '兼职', money: '200.00' },
      { text: '看电影花了60元', type: 'expense', category: '娱乐', money: '60.00' },
      { text: '早餐吃包子花了8元', type: 'expense', category: '餐饮', money: '8.00' },
      { text: '地铁充值100元', type: 'expense', category: '交通', money: '100.00' },
      { text: '买水果花了45元', type: 'expense', category: '餐饮', money: '45.00' },
      { text: '买书花了99元', type: 'expense', category: '学习', money: '99.00' },
      { text: '水电费200元', type: 'expense', category: '日用', money: '200.00' },
      { text: '奖金发了1000元', type: 'income', category: '奖金', money: '1000.00' },
      { text: '理财收益200元', type: 'income', category: '理财', money: '200.00' },
      { text: '红包收入500元', type: 'income', category: '红包', money: '500.00' },
      { text: '旅游花了2000元', type: 'expense', category: '旅行', money: '2000.00' },
      { text: '看病花了300元', type: 'expense', category: '医疗', money: '300.00' }
    ]
    
    const examplesByType = this.data.billType === 0 
      ? examples.filter(e => e.type === 'expense')
      : examples.filter(e => e.type === 'income')
    
    const randomIndex = Math.floor(Math.random() * examplesByType.length)
    const example = examplesByType[randomIndex] || examples[0]
    
    this.setData({
      voiceText: example.text,
      aiResultMoney: example.money,
      aiResultCate: example.category,
      aiResultRemark: example.text,
      showAiResult: true
    })
    
    if (example.type === 'income') {
      this.setData({ billType: 1 })
    } else {
      this.setData({ billType: 0 })
    }
  },

  aiParseText(text) {
    let money = '0.00'
    let cate = '其他'
    let remark = text

    money = this.extractMoney(text)

    const expenseKeywords = {
      '餐饮': ['餐', '饭', '吃', '午餐', '晚餐', '早餐', '早饭', '中饭', '晚饭', '奶茶', '咖啡', '饮料', '水', '果汁', '零食', '薯片', '饼干', '糖果', '巧克力', '蛋糕', '面包', '点心', '水果', '苹果', '香蕉', '橙子', '葡萄', '西瓜', '草莓', '火锅', '烧烤', '麻辣烫', '汉堡', '披萨', '炸鸡', '麦当劳', '肯德基', '外卖', '美团', '饿了么', '订餐', '食堂', '餐馆', '饭店', '面馆', '早点', '下午茶'],
      '购物': ['买', '购物', '买东西', '超市', '商场', '淘宝', '京东', '拼多多', '唯品会', '衣服', '裤子', '鞋子', '包包', '化妆品', '护肤品', '数码', '电器', '家具', '日用品', '百货', '专柜'],
      '交通': ['打车', '滴滴', '出租车', '网约车', '快车', '地铁', '公交', '公交卡', '充值', '加油', '停车费', '过路费', '高速费', '高铁', '火车', '机票', '火车票', '飞机', '租车', '自行车', '共享单车'],
      '娱乐': ['电影', '游戏', 'KTV', '唱歌', '游乐场', '游乐园', '旅游', '旅行', '演唱会', '话剧', '音乐会', '酒吧', '网咖', '桌游', '剧本杀', '密室逃脱'],
      '通讯': ['话费', '流量', '充值', '手机费', '电话', '宽带', '套餐'],
      '医疗': ['医院', '看病', '买药', '体检', '挂号', '门诊', '住院', '药店', '疫苗'],
      '学习': ['书', '课程', '培训', '学习', '教育', '学费', '书本', '文具', '考研', '考公', '证书', '网课'],
      '日用': ['水电', '房租', '物业', '电费', '水费', '燃气', '网费', '物业费', '维修', '清洁'],
      '旅行': ['旅行', '旅游', '酒店', '民宿', '景点', '门票', '机票', '车票']
    }

    const incomeKeywords = {
      '工资': ['工资', '薪水', '发工资', '月薪', '年薪', '底薪'],
      '兼职': ['兼职', '副业', '外快', '零时工', '跑腿'],
      '奖金': ['奖金', '绩效', '提成', '年终奖', '项目奖', '全勤奖'],
      '理财': ['利息', '理财', '基金', '股票', '收益', '分红', '存款'],
      '红包': ['红包', '转账', '礼金', '压岁钱', '份子钱'],
      '退款': ['退款', '退货', '返还', '报销'],
      '转账': ['转账', '汇款', '收款']
    }

    const keywords = this.data.billType === 0 ? expenseKeywords : incomeKeywords
    
    for (const [name, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        cate = name
        break
      }
    }

    return { money, cate, remark }
  },

  extractMoney(text) {
    const unitMap = { '百': 100, '千': 1000, '万': 10000, '亿': 100000000 }
    
    const digitRegex = /(\d+(?:\.\d{1,2})?)\s*(元|块|钱|¥|百|千|万|亿)/g
    let total = 0
    let match
    
    while ((match = digitRegex.exec(text)) !== null) {
      const num = parseFloat(match[1])
      const unit = match[2]
      
      if (unitMap[unit]) {
        total += num * unitMap[unit]
      } else {
        total += num
      }
    }

    if (total > 0) {
      return total.toFixed(2)
    }

    const chineseNumRegex = /([零一二三四五六七八九十百千万亿]+)\s*(元|块|钱)/
    const chineseMatch = text.match(chineseNumRegex)
    if (chineseMatch) {
      const chineseNum = this.chineseToArabic(chineseMatch[1])
      if (chineseNum > 0) {
        return chineseNum.toFixed(2)
      }
    }

    return '0.00'
  },

  chineseToArabic(chinese) {
    const numMap = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 }
    const unitMap = { '十': 10, '百': 100, '千': 1000, '万': 10000, '亿': 100000000 }
    
    let result = 0
    let temp = 0
    
    for (let i = 0; i < chinese.length; i++) {
      const char = chinese[i]
      if (numMap[char] !== undefined) {
        temp = numMap[char]
      } else if (unitMap[char] !== undefined) {
        const unit = unitMap[char]
        if (temp === 0) {
          temp = 1
        }
        if (unit === 10000 || unit === 100000000) {
          result = (result + temp) * unit
          temp = 0
        } else {
          temp *= unit
          result += temp
          temp = 0
        }
      }
    }
    
    result += temp
    return result
  },

  parseVoiceContent(text) {
    const result = this.aiParseText(text)
    this.setData({
      voiceText: text,
      aiResultMoney: result.money,
      aiResultCate: result.cate,
      aiResultRemark: result.remark,
      showAiResult: true
    })
  },

  onVoiceInput(e) {
    this.setData({ voiceText: e.detail.value })
  },

  reParseVoice() {
    const text = this.data.voiceText
    if (!text.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    const result = this.aiParseText(text)
    this.setData({
      aiResultMoney: result.money,
      aiResultCate: result.cate,
      aiResultRemark: result.remark
    })
  },

  aiParseText(text) {
    let money = '0.00'
    let cate = '其他'
    let remark = text

    money = this.extractMoney(text)

    const expenseKeywords = {
      '餐饮': ['餐', '饭', '吃', '午餐', '晚餐', '早餐', '奶茶', '咖啡', '零食', '水果', '外卖', '火锅', '烧烤', '麻辣烫', '汉堡', '披萨', '蛋糕', '甜品', '饮料', '酒水', '食堂', '餐馆', '饭店', '面馆', '早点', '下午茶'],
      '购物': ['买', '购物', '超市', '衣服', '鞋', '化妆品', '淘宝', '京东', '拼多多', '唯品会', '商场', '专柜', '衣服', '裤子', '包包', '饰品', '数码', '电器', '家具', '日用品', '百货'],
      '交通': ['打车', '滴滴', '地铁', '公交', '加油', '停车', '高铁', '机票', '火车票', '租车', '网约车', '自行车', '共享单车', '过路费', '高速费'],
      '娱乐': ['电影', '游戏', 'KTV', '旅游', '游乐场', '演出', '演唱会', '话剧', '音乐会', '酒吧', '网咖', '桌游', '剧本杀', '密室逃脱', '游乐园'],
      '通讯': ['话费', '流量', '宽带', '手机', '电话', '充值', '套餐'],
      '医疗': ['医院', '药', '看病', '体检', '挂号', '门诊', '住院', '买药', '药店', '疫苗'],
      '学习': ['书', '课程', '培训', '教材', '学费', '书本', '文具', '考研', '考公', '证书', '网课', '教育'],
      '日用': ['水电', '房租', '物业', '日用品', '电费', '水费', '燃气', '网费', '物业费', '维修', '清洁'],
      '旅行': ['旅行', '旅游', '酒店', '民宿', '景点', '门票', '机票', '车票']
    }

    const incomeKeywords = {
      '工资': ['工资', '薪水', '月薪', '年薪', '底薪', '发工资'],
      '兼职': ['兼职', '副业', '外快', '零时工', '跑腿'],
      '奖金': ['奖金', '绩效', '提成', '年终奖', '项目奖', '全勤奖'],
      '理财': ['利息', '理财', '基金', '股票', '分红', '收益', '利息', '存款'],
      '红包': ['红包', '转账', '礼金', '压岁钱', '份子钱'],
      '退款': ['退款', '退货', '返还', '报销'],
      '转账': ['转账', '汇款', '收款']
    }

    const keywords = this.data.billType === 0 ? expenseKeywords : incomeKeywords
    
    for (const [name, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        cate = name
        break
      }
    }

    return { money, cate, remark }
  },

  extractMoney(text) {
    const unitMap = { '百': 100, '千': 1000, '万': 10000, '亿': 100000000 }
    
    const digitRegex = /(\d+(?:\.\d{1,2})?)\s*(元|块|钱|¥|百|千|万|亿)/g
    let total = 0
    let match
    
    while ((match = digitRegex.exec(text)) !== null) {
      const num = parseFloat(match[1])
      const unit = match[2]
      
      if (unitMap[unit]) {
        total += num * unitMap[unit]
      } else {
        total += num
      }
    }

    if (total > 0) {
      return total.toFixed(2)
    }

    const chineseNumRegex = /([零一二三四五六七八九十百千万亿]+)\s*(元|块|钱)/
    const chineseMatch = text.match(chineseNumRegex)
    if (chineseMatch) {
      const chineseNum = this.chineseToArabic(chineseMatch[1])
      if (chineseNum > 0) {
        return chineseNum.toFixed(2)
      }
    }

    return '0.00'
  },

  chineseToArabic(chinese) {
    const numMap = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 }
    const unitMap = { '十': 10, '百': 100, '千': 1000, '万': 10000, '亿': 100000000 }
    
    let result = 0
    let temp = 0
    
    for (let i = 0; i < chinese.length; i++) {
      const char = chinese[i]
      if (numMap[char] !== undefined) {
        temp = numMap[char]
      } else if (unitMap[char] !== undefined) {
        const unit = unitMap[char]
        if (temp === 0) {
          temp = 1
        }
        if (unit === 10000 || unit === 100000000) {
          result = (result + temp) * unit
          temp = 0
        } else {
          temp *= unit
          result += temp
          temp = 0
        }
      }
    }
    
    result += temp
    return result
  },

  closeAiResult() {
    this.setData({ showAiResult: false })
  },

  confirmAiResult() {
    const { aiResultMoney, aiResultCate, aiResultRemark } = this.data
    
    this.setData({
      tempMoney: aiResultMoney,
      money: aiResultMoney,
      remark: aiResultRemark,
      showAiResult: false,
      expression: ''
    })

    const cateList = this.data.billType === 0 ? this.data.expenseList : this.data.incomeList
    const cateIndex = cateList.findIndex(item => item.name === aiResultCate)
    if (cateIndex !== -1) {
      this.setData({ curCateIndex: cateIndex })
    }
  },

  // ============ AI智能分类 ============
  inputRemark(e) {
    const remark = e.detail.value
    this.setData({ remark })
    
    if (remark && remark.length >= 2) {
      const suggestCate = this.aiClassify(remark)
      this.setData({ aiSuggestCate: suggestCate })
    } else {
      this.setData({ aiSuggestCate: '' })
    }
  },

  aiClassify(text) {
    const expenseKeywords = {
      '餐饮': ['餐', '饭', '吃', '午餐', '晚餐', '早餐', '奶茶', '咖啡', '零食', '水果', '外卖', '火锅', '烧烤', '面条', '汉堡', '炸鸡', '披萨'],
      '购物': ['买', '购物', '超市', '衣服', '鞋', '化妆品', '淘宝', '京东', '拼多多', '商场', '衣服', '裤子', '包包'],
      '交通': ['打车', '滴滴', '地铁', '公交', '加油', '停车', '高铁', '机票', '出租'],
      '娱乐': ['电影', '游戏', 'KTV', '旅游', '游乐场', '演出', '门票', '网吧'],
      '通讯': ['话费', '流量', '宽带', '手机', '充值'],
      '医疗': ['医院', '药', '看病', '体检', '挂号', '门诊'],
      '学习': ['书', '课程', '培训', '教材', '文具', '学费'],
      '日用': ['水电', '房租', '物业', '日用品', '保洁', '维修'],
      '旅行': ['酒店', '机票', '景点', '住宿']
    }

    const incomeKeywords = {
      '工资': ['工资', '薪水', '月薪', '薪资'],
      '兼职': ['兼职', '副业', '外快'],
      '奖金': ['奖金', '绩效', '提成', '年终奖'],
      '理财': ['利息', '理财', '基金', '股票', '收益'],
      '红包': ['红包', '转账', '礼金', '压岁钱'],
      '退款': ['退款', '退货']
    }

    const keywords = this.data.billType === 0 ? expenseKeywords : incomeKeywords
    
    for (const [name, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        return name
      }
    }
    
    return ''
  },

  selectAiCate() {
    const cateList = this.data.billType === 0 ? this.data.expenseList : this.data.incomeList
    const cateIndex = cateList.findIndex(item => item.name === this.data.aiSuggestCate)
    if (cateIndex !== -1) {
      this.setData({ curCateIndex: cateIndex })
    }
  }
})
