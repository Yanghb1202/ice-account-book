const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { phone, password } = event
    
    if (!phone || !password) {
      return {
        success: false,
        message: '手机号和密码不能为空'
      }
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        message: '请输入正确的手机号'
      }
    }
    
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
        nickname: user.nickname || '记账用户',
        avatar: user.avatar || ''
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
