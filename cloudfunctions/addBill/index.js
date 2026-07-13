const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { billType = 0, money = 0, remark = '', date = '', fullDate = '', cateName = '', cateEmoji = '', userId = '' } = event
    
    const cleanCateEmoji = typeof cateEmoji === 'string' ? cateEmoji : ''
    
    const result = await db.collection('bills').add({
      data: {
        billType: Number(billType),
        money: Number(money),
        remark: String(remark),
        date: String(date),
        fullDate: String(fullDate),
        cateName: String(cateName),
        cateEmoji: cleanCateEmoji,
        userId: String(userId),
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      data: { _id: result._id },
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
