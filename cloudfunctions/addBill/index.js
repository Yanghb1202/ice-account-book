const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { billType, money, remark, date, fullDate, cateName, cateEmoji, userId } = event
    
    const result = await db.collection('bills').add({
      data: {
        billType: Number(billType),
        money: Number(money),
        remark: remark || '',
        date: date || '',
        fullDate: fullDate || '',
        cateName: cateName || '',
        cateEmoji: cateEmoji || '',
        userId: userId || '',
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      data: result,
      message: '记账成功'
    }
  } catch (err) {
    console.error('addBill error:', err)
    return {
      success: false,
      message: '记账失败',
      error: err.message
    }
  }
}
