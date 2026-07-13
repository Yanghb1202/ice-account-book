const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { phone, password, nickname } = event
    
    const existResult = await db.collection('users').where({
      phone: phone
    }).get()
    
    if (existResult.data.length > 0) {
      return {
        success: false,
        message: '手机号已被注册'
      }
    }
    
    const result = await db.collection('users').add({
      data: {
        phone: phone,
        password: password,
        nickname: nickname || '记账用户',
        avatar: event.avatar || '',
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      data: {
        userId: result._id,
        phone: phone,
        nickname: nickname || '记账用户',
        avatar: event.avatar || ''
      },
      message: '注册成功'
    }
  } catch (err) {
    console.error('registerUser error:', err)
    return {
      success: false,
      message: '注册失败',
      error: err.message
    }
  }
}
