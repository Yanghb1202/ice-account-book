const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { phone, password } = event
    
    const result = await db.collection('users').where({
      phone: phone
    }).get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const user = result.data[0]
    
    if (user.password !== password) {
      return {
        success: false,
        message: '密码错误'
      }
    }
    
    return {
      success: true,
      data: {
        userId: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar
      },
      message: '登录成功'
    }
  } catch (err) {
    console.error('userLogin error:', err)
    return {
      success: false,
      message: '登录失败',
      error: err.message
    }
  }
}
