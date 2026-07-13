const db = wx.cloud.database()

const getUserId = () => {
  const userInfo = wx.getStorageSync('userLogin')
  return userInfo && userInfo.userId ? userInfo.userId : ''
}

const cloudFn = async (name, data) => {
  try {
    const result = await wx.cloud.callFunction({
      name: name,
      data: data
    })
    return result.result
  } catch (err) {
    console.error(`cloud function ${name} error:`, err)
    return { success: false, message: '网络错误' }
  }
}

const localFn = {
  addBill: async (data) => {
    const allBill = wx.getStorageSync('all_bill') || []
    const billData = {
      ...data,
      id: Date.now().toString(),
      billType: data.billType !== undefined ? data.billType : data.type,
      type: data.type !== undefined ? data.type : data.billType
    }
    allBill.unshift(billData)
    wx.setStorageSync('all_bill', allBill)
    return { success: true, message: '记账成功' }
  },
  getBillList: async (params) => {
    const allBill = wx.getStorageSync('all_bill') || []
    let list = allBill
    const billType = params.billType !== undefined ? params.billType : params.type
    if (billType !== undefined && billType !== null) {
      list = list.filter(item => (item.billType !== undefined ? item.billType : item.type) === billType)
    }
    if (params.startDate && params.endDate) {
      list = list.filter(item => item.fullDate >= params.startDate && item.fullDate <= params.endDate)
    }
    list.forEach(item => {
      if (item.type === undefined) item.type = item.billType
      if (item.billType === undefined) item.billType = item.type
    })
    return { success: true, data: list, total: list.length }
  },
  userLogin: async (params) => {
    const accountList = wx.getStorageSync('userAccountList') || []
    const user = accountList.find(item => item.phone === params.phone)
    if (!user) return { success: false, message: '用户不存在' }
    if (user.password !== params.password) return { success: false, message: '密码错误' }
    return {
      success: true,
      data: { userId: user.phone || 'demo', phone: user.phone, nickname: user.nickname || '记账用户' }
    }
  },
  registerUser: async (params) => {
    const accountList = wx.getStorageSync('userAccountList') || []
    const exist = accountList.find(item => item.phone === params.phone)
    if (exist) return { success: false, message: '手机号已被注册' }
    accountList.push({
      phone: params.phone,
      password: params.password,
      nickname: params.nickname || '记账用户'
    })
    wx.setStorageSync('userAccountList', accountList)
    return { success: true, data: { userId: params.phone, phone: params.phone, nickname: params.nickname || '记账用户' } }
  },
  foodAi: async (params) => {
    return {
      success: true,
      data: {
        foodName: '美食',
        calories: 250,
        nutrients: { protein: 15, fat: 10, carbs: 30 },
        confidence: 85,
        tip: '合理饮食，健康生活'
      }
    }
  }
}

const useCloud = false

const DB = {
  addBill: async (data) => {
    const userId = getUserId()
    const billData = {
      ...data,
      billType: data.billType !== undefined ? data.billType : (data.type !== undefined ? data.type : 0),
      type: data.type !== undefined ? data.type : (data.billType !== undefined ? data.billType : 0)
    }
    if (useCloud && userId) {
      return await cloudFn('addBill', { ...billData, userId })
    }
    return await localFn.addBill(billData)
  },
  getBillList: async (params = {}) => {
    const userId = getUserId()
    const queryParams = {
      ...params,
      billType: params.billType !== undefined ? params.billType : params.type
    }
    if (useCloud && userId) {
      return await cloudFn('getBillList', { ...queryParams, userId })
    }
    return await localFn.getBillList(queryParams)
  },
  userLogin: async (params) => {
    if (useCloud) {
      return await cloudFn('userLogin', params)
    }
    return await localFn.userLogin(params)
  },
  registerUser: async (params) => {
    if (useCloud) {
      return await cloudFn('registerUser', params)
    }
    return await localFn.registerUser(params)
  },
  foodAi: async (params) => {
    if (useCloud) {
      return await cloudFn('foodAi', params)
    }
    return await localFn.foodAi(params)
  },
  getBillById: async (id) => {
    const allBill = wx.getStorageSync('all_bill') || []
    return allBill.find(item => item.id == id) || null
  },
  getStorage: (key) => {
    return wx.getStorageSync(key) || null
  },
  setStorage: (key, value) => {
    wx.setStorageSync(key, value)
  },
  removeStorage: (key) => {
    wx.removeStorageSync(key)
  }
}

module.exports = DB
