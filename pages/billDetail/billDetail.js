Page({
  data: {
    item: {}
  },

  onLoad(options) {
    // 接收传过来的账单id
    const billId = options.id;
    const allBill = wx.getStorageSync("all_bill") || [];
    const target = allBill.find(b => b.id == billId);
    if (target) {
      this.setData({ item: target })
    }
  },

  goBack() {
    wx.navigateBack()
  }
})