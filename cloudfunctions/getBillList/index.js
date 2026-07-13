const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { userId, startDate, endDate, billType, page = 1, pageSize = 20 } = event
    
    let query = db.collection('bills').where({ userId })
    
    if (startDate && endDate) {
      query = query.where({
        fullDate: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }
    
    if (billType !== undefined && billType !== null) {
      query = query.where({ billType: Number(billType) })
    }
    
    const result = await query.orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    const countResult = await query.count()
    
    return {
      success: true,
      data: result.data,
      total: countResult.total,
      message: '查询成功'
    }
  } catch (err) {
    console.error('getBillList error:', err)
    return {
      success: false,
      message: '查询失败',
      error: err.message
    }
  }
}
