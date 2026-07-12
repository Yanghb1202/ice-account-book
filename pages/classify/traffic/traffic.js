Page({
  data: {
    weekList: [
      { week:"一", day:1, dateNum: 0 },
      { week:"二", day:2, dateNum: 0 },
      { week:"三", day:3, dateNum: 0 },
      { week:"四", day:4, dateNum: 0 },
      { week:"五", day:5, dateNum: 0 },
      { week:"六", day:6, dateNum: 0 },
      { week:"日", day:7, dateNum: 0 },
    ],
    currentDay: 3,
    totalMoney: 0,
    list: [],
    showPopup: false,
    name: "",
    price: ""
  },
  onLoad() {
    const now = new Date()
    const week = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (week === 0 ? 6 : week - 1))
    const weekList = this.data.weekList
    for(let i=0; i<7; i++){
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      weekList[i].dateNum = d.getDate()
      weekList[i].fullDateStr = `${d.getMonth()+1}月${d.getDate()}日`
    }
    let targetDay = week === 0 ? 7 : week
    this.setData({
      weekList: weekList,
      currentDay: targetDay
    })
    this.loadData()
  },
  onShow() { this.loadData() },

  loadData() {
    const allList = wx.getStorageSync("all_bill") || []
    const { currentDay, weekList } = this.data
    const targetDate = weekList[currentDay - 1].fullDateStr
    const filterList = allList.filter(item => item.cateName === "交通" && item.date === targetDate)
    let total = 0
    filterList.forEach(i => total += Number(i.money))
    this.setData({ list: filterList, totalMoney: total.toFixed(2) })
  },

  selectDay(e) {
    const day = e.currentTarget.dataset.day
    this.setData({ currentDay: day }, ()=>this.loadData())
  },
  openPopup() {
    this.setData({ showPopup:true, name:"", price:"" })
  },
  inputName(e) { this.setData({ name: e.detail.value }) },
  inputPrice(e) { this.setData({ price: e.detail.value }) },
  closeMask() { this.setData({ showPopup: false }) },
  noop() {},

  syncBudgetUsed(cateShortName, addMoney) {
    const map = {
      "餐饮": "餐饮美食",
      "购物": "日常购物",
      "日用": "日常购物",
      "交通": "交通出行",
      "旅游": "交通出行",
      "娱乐": "休闲娱乐"
    }
    const targetCateName = map[cateShortName]
    if (!targetCateName) return

    let budgetData = wx.getStorageSync("budgetData")
    if (!budgetData || !budgetData.budgetList) {
      budgetData = {
        totalBudget: 4000,
        usedMoney: 0,
        leftMoney: 4000,
        usedPercent: 0,
        budgetList: [
          { id: 1, name: "餐饮美食", icon: "🍜", color: "#ffd9d9", total: 1500, used: 0 },
          { id: 2, name: "日常购物", icon: "🛍️", color: "#d9e8ff", total: 1000, used: 0 },
          { id: 3, name: "交通出行", icon: "🚗", color: "#d9ffea", total: 100, used: 0 },
          { id: 4, name: "休闲娱乐", icon: "🎮", color: "#fff2cc", total: 1200, used: 0 }
        ]
      }
    }
    const list = budgetData.budgetList
    let find = false
    for (let i = 0; i < list.length; i++) {
      if (list[i].name === targetCateName) {
        const newUsed = Math.round((Number(list[i].used) + Number(addMoney)) * 100) / 100
        list[i].used = newUsed
        find = true
        break
      }
    }
    if (find) {
      let allUsed = 0
      for (let i = 0; i < list.length; i++) {
        allUsed += Number(list[i].used)
      }
      budgetData.usedMoney = Math.round(allUsed * 100) / 100
      budgetData.leftMoney = Math.round((budgetData.totalBudget - allUsed) * 100) / 100
      const pct = budgetData.totalBudget === 0 ? 0 : ((allUsed / budgetData.totalBudget) * 100).toFixed(1)
      budgetData.usedPercent = pct
    }
    wx.setStorageSync("budgetData", budgetData)
  },

  saveItem() {
    const {name, price} = this.data
    if(!name.trim()) return wx.showToast({title:"请输入出行项目",icon:"none"})
    if(!price || Number(price)<=0) return wx.showToast({title:"请输入有效金额",icon:"none"})
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const dateStr = `${m}月${d}日`
    const cateName = "交通"
    const cateIcon = "cate_car.png"
    const moneyNum = Number(price)
    const newItem = {
      id: Date.now(),
      type: 0,
      money: moneyNum.toFixed(2),
      cateName,
      cateIcon,
      remark: name,
      date: dateStr
    }
    let allBill = wx.getStorageSync("all_bill") || []
    allBill.unshift(newItem)
    wx.setStorageSync("all_bill", allBill)

    // 交通 → 交通出行
    this.syncBudgetUsed("交通", moneyNum)

    wx.showToast({title:"添加成功"})
    setTimeout(()=>{
      this.setData({
        showPopup: false
      })
      this.loadData()
    }, 1000)
  },

  backAddBill(){
    wx.navigateBack()
  }
})