const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('registerUser called with:', event)
    
    const { phone, password, nickname } = event
    
    console.log('checking if user exists:', phone)
    const existResult = await db.collection('users').where({
      phone: phone
    }).get()
    console.log('exist check result:', existResult)
    
    if (existResult.data.length > 0) {
      console.log('user exists, updating info')
      const existUser = existResult.data[0]
      const result = await db.collection('users').doc(existUser._id).update({
        data: {
          nickname: nickname || existUser.nickname || '记账用户',
          avatar: event.avatar || existUser.avatar || '',
          updateTime: db.serverDate()
        }
      })
      console.log('update result:', result)
      return {
        success: true,
        data: {
          userId: existUser._id,
          phone: phone,
          nickname: nickname || existUser.nickname || '记账用户',
          avatar: event.avatar || existUser.avatar || ''
        },
        message: '账号已更新'
      }
    }
    
    console.log('user not exists, adding to database')
    const result = await db.collection('users').add({
      data: {
        phone: phone,
        password: password,
        nickname: nickname || '记账用户',
        avatar: event.avatar || '',
        createTime: db.serverDate()
      }
    })
    console.log('add result:', result)
    
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
      error: err.message,
      stack: err.stack
    }
  }
}
