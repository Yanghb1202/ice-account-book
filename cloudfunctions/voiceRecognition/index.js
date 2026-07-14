const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const fs = require('fs')
const path = require('path')

const recognitionPatterns = [
  { pattern: /(午餐|晚餐|早餐|早饭|中饭|晚饭|吃饭|餐)/i, type: 'expense', category: '餐饮' },
  { pattern: /(奶茶|咖啡|饮料|水|果汁|可乐|雪碧|茶)/i, type: 'expense', category: '餐饮' },
  { pattern: /(零食|薯片|饼干|糖果|巧克力|蛋糕|面包|点心)/i, type: 'expense', category: '餐饮' },
  { pattern: /(水果|苹果|香蕉|橙子|葡萄|西瓜|草莓)/i, type: 'expense', category: '餐饮' },
  { pattern: /(火锅|烧烤|麻辣烫|汉堡|披萨|炸鸡|麦当劳|肯德基)/i, type: 'expense', category: '餐饮' },
  { pattern: /(外卖|美团|饿了么|订餐)/i, type: 'expense', category: '餐饮' },
  { pattern: /(打车|滴滴|出租车|网约车|快车)/i, type: 'expense', category: '交通' },
  { pattern: /(地铁|公交|公交卡|充值)/i, type: 'expense', category: '交通' },
  { pattern: /(加油|停车费|过路费|高速费)/i, type: 'expense', category: '交通' },
  { pattern: /(高铁|火车|机票|火车票|飞机)/i, type: 'expense', category: '交通' },
  { pattern: /(购物|买东西|超市|商场|淘宝|京东|拼多多)/i, type: 'expense', category: '购物' },
  { pattern: /(衣服|裤子|鞋子|包包|化妆品|护肤品)/i, type: 'expense', category: '购物' },
  { pattern: /(电影|游戏|KTV|唱歌|游乐场|游乐园)/i, type: 'expense', category: '娱乐' },
  { pattern: /(话费|流量|充值|手机费)/i, type: 'expense', category: '通讯' },
  { pattern: /(医院|看病|买药|体检|挂号)/i, type: 'expense', category: '医疗' },
  { pattern: /(书|课程|培训|学习|教育)/i, type: 'expense', category: '学习' },
  { pattern: /(水电|房租|物业|电费|水费|燃气)/i, type: 'expense', category: '日用' },
  { pattern: /(工资|薪水|发工资|月薪|年薪)/i, type: 'income', category: '工资' },
  { pattern: /(奖金|绩效|提成|年终奖)/i, type: 'income', category: '奖金' },
  { pattern: /(兼职|副业|外快)/i, type: 'income', category: '兼职' },
  { pattern: /(理财|利息|基金|股票|收益)/i, type: 'income', category: '理财' },
  { pattern: /(红包|压岁钱|礼金)/i, type: 'income', category: '红包' },
  { pattern: /(退款|退货)/i, type: 'income', category: '退款' },
]

const sampleTexts = [
  { text: '今天午餐花了35块钱', type: 'expense', category: '餐饮', money: '35.00' },
  { text: '打车花了20块', type: 'expense', category: '交通', money: '20.00' },
  { text: '买了一杯奶茶15元', type: 'expense', category: '餐饮', money: '15.00' },
  { text: '工资收入8000元', type: 'income', category: '工资', money: '8000.00' },
  { text: '超市购物花了128元', type: 'expense', category: '购物', money: '128.00' },
  { text: '晚餐吃火锅花了156元', type: 'expense', category: '餐饮', money: '156.00' },
  { text: '交话费50元', type: 'expense', category: '通讯', money: '50.00' },
  { text: '买衣服花了320元', type: 'expense', category: '购物', money: '320.00' },
  { text: '兼职收入200元', type: 'income', category: '兼职', money: '200.00' },
  { text: '看电影花了60元', type: 'expense', category: '娱乐', money: '60.00' },
  { text: '水电费150元', type: 'expense', category: '日用', money: '150.00' },
  { text: '奖金发了500元', type: 'income', category: '奖金', money: '500.00' },
  { text: '买水果花了30元', type: 'expense', category: '餐饮', money: '30.00' },
  { text: '地铁充值100元', type: 'expense', category: '交通', money: '100.00' },
  { text: '买书花了89元', type: 'expense', category: '学习', money: '89.00' },
]

function extractMoney(text) {
  const moneyRegex = /(\d+(?:\.\d{1,2})?)\s*(元|块|钱|¥)/
  const match = text.match(moneyRegex)
  if (match) {
    return parseFloat(match[1]).toFixed(2)
  }
  
  const chineseNumRegex = /([零一二三四五六七八九十百千万亿]+)\s*(元|块|钱)/
  const chineseMatch = text.match(chineseNumRegex)
  if (chineseMatch) {
    const chinese = chineseMatch[1]
    const numMap = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 }
    const unitMap = { '十': 10, '百': 100, '千': 1000, '万': 10000 }
    
    let result = 0
    let temp = 0
    for (let i = 0; i < chinese.length; i++) {
      const char = chinese[i]
      if (numMap[char] !== undefined) {
        temp = numMap[char]
      } else if (unitMap[char] !== undefined) {
        const unit = unitMap[char]
        if (temp === 0) temp = 1
        temp *= unit
        result += temp
        temp = 0
      }
    }
    result += temp
    if (result > 0) return result.toFixed(2)
  }
  
  return '0.00'
}

function classifyText(text) {
  for (const pattern of recognitionPatterns) {
    if (pattern.pattern.test(text)) {
      return { type: pattern.type, category: pattern.category }
    }
  }
  return { type: 'expense', category: '其他' }
}

exports.main = async (event, context) => {
  const { audioBase64, audioUrl } = event
  
  let recognizedText = ''
  let isSimulated = true
  
  if (audioBase64) {
    try {
      const randomIndex = Math.floor(Math.random() * sampleTexts.length)
      const sample = sampleTexts[randomIndex]
      recognizedText = sample.text
      isSimulated = true
    } catch (error) {
      console.error('Audio processing error:', error)
    }
  }
  
  if (!recognizedText) {
    const randomIndex = Math.floor(Math.random() * sampleTexts.length)
    const sample = sampleTexts[randomIndex]
    recognizedText = sample.text
    isSimulated = true
  }
  
  const money = extractMoney(recognizedText)
  const classification = classifyText(recognizedText)
  
  return {
    success: true,
    text: recognizedText,
    money: money,
    type: classification.type,
    category: classification.category,
    isSimulated: isSimulated
  }
}
