Page({
  data: {
    weekList: [
      { week:"一", day:1 },{ week:"二", day:2 },{ week:"三", day:3 },
      { week:"四", day:4 },{ week:"五", day:5 },{ week:"六", day:6 },{ week:"日", day:7 },
    ],
    currentDay: 3,
    totalMoney: 0,
    list: [],
    showPopup: false,
    name: "",
    price: ""
  },
  onLoad() {
    // 自动计算本周日期 + 选中今天
    const now = new Date()
    const week = now.getDay() // 0周日 1周一
    // 计算本周周一
    const monday = new Date(now)
    monday.setDate(now.getDate() - (week === 0 ? 6 : week - 1))

    // 填充7天日期数字
    const weekList = this.data.weekList
    for(let i=0; i<7; i++){
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      weekList[i].dateNum = d.getDate()
    }

    // 匹配今日对应day
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
    const filterList = allList.filter(item => item.cateName === "通讯")
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

  saveItem() {
    const {name, price, list} = this.data
    if(!name.trim()) return wx.showToast({title:"请输入项目名称",icon:"none"})
    if(!price || Number(price)<=0) return wx.showToast({title:"请输入有效金额",icon:"none"})
    const now = new Date()
    const dateStr = `${now.getMonth()+1}月${now.getDate()}日`
    const cateName = "通讯"
    const cateIcon = "cate_phone.png"
    const newItem = {
      id: Date.now(),
      type: 0,
      money: Number(price).toFixed(2),
      cateName,
      cateIcon,
      remark: name,
      date: dateStr
    }
    let allBill = wx.getStorageSync("all_bill") || []
    allBill.unshift(newItem)
    wx.setStorageSync("all_bill", allBill)

    wx.showToast({title:"添加成功"})
    const newList = [...list, newItem]
    this.setData({
      showPopup: false,
      list: newList,
      totalMoney: (Number(this.data.totalMoney)+Number(newItem.money)).toFixed(2)
    })
  },

  backAddBill(){
    wx.navigateBack()
  }
})