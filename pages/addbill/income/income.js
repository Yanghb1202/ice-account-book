const DB = require('../../utils/db.js')
Page({
  data: {
    incomeMoney: "0",
    remark: "",
    showDate: "6月16日",
    curCateIndex: 0,
    incomeCateList: [
      { img: "cate_salary.png", name: "工资" },
      { img: "cate_red.png", name: "红包" },
    ]
  },
  // 数字输入
  inputNum(e) {
    const num = e.currentTarget.dataset.num
    let money = this.data.incomeMoney
    // 禁止多个小数点
    if(num == "." && money.includes(".")) return
    // 小数点后最多两位
    if(money.includes(".") && money.split(".")[1].length >= 2) return
    if(money == "0" && num != ".") money = ""
    this.setData({ incomeMoney: money + num })
  },
  // 删除数字
  delNum() {
    let money = this.data.incomeMoney
    money = money.slice(0, -1)
    if(money == "") money = "0"
    this.setData({ incomeMoney: money })
  },
  // 选择分类
  selectCate(e) {
    this.setData({ curCateIndex: e.currentTarget.dataset.index })
  },
  // 备注输入
  inputRemark(e) {
    this.setData({ remark: e.detail.value })
  },
// 切回支出记账tab页
goOutBill(){
  wx.switchTab({
    url:"pages/addbill/addbill"
  })
},
  // 日期弹窗（简易）
  openDatePicker() {
    wx.showModal({ title: "日期选择", content: "简易版可接入日期组件" })
  },
  // 保存收入到全局账单
  async saveIncome() {
    const money = Number(this.data.incomeMoney)
    if(money <= 0) return wx.showToast({ title: "请输入金额", icon: "none" })
    const cate = this.data.incomeCateList[this.data.curCateIndex]
    const now = Date.now()
    const newIncome = {
      id: now,
      type: 1,
      billType: 1,
      money: Math.round(money * 100) / 100,
      cateName: cate.name,
      cateEmoji: '',
      cateIcon: cate.img,
      remark: this.data.remark || cate.name,
      date: this.data.showDate,
      fullDate: now,
      bookName: '日常账本',
      createTime: now
    }
    await DB.addBill(newIncome)
    wx.showToast({ title: "收入记录成功" })
    setTimeout(()=>wx.navigateBack(), 800)
  }
})