const DB = require('../../utils/db.js')

Page({
  data: {
    isLoading: true,
    aiAvatar: '🤖',
    aiName: '智能理财助手',
    
    analysisData: null,
    suggestions: [],
    savingGoals: [],
    budgetPrediction: null,
    
    showDetail: false,
    currentDetail: null
  },

  onLoad() {
    this.loadAnalysisData()
  },

  async loadAnalysisData() {
    this.setData({ isLoading: true })
    
    try {
      const billResult = await DB.getBillList()
      const allBill = billResult.success && billResult.data ? billResult.data : (wx.getStorageSync('all_bill') || [])
      
      const analysis = this.analyzeBills(allBill)
      const suggestions = this.generateSuggestions(analysis)
      const savingGoals = this.generateSavingGoals(analysis)
      const budgetPrediction = this.predictBudget(analysis)
      
      const displayData = {
        totalExpense: analysis.totalExpense.toFixed(2),
        totalIncome: analysis.totalIncome.toFixed(2),
        balance: analysis.balance.toFixed(2),
        balanceRaw: analysis.balance,
        categoryList: analysis.categoryList.map(item => ({
          name: item.name,
          amount: item.amount.toFixed(2),
          amountRaw: item.amount,
          percent: item.percent
        })),
        avgDailyExpense: analysis.avgDailyExpense.toFixed(2),
        billCount: analysis.billCount,
        daysInMonth: analysis.daysInMonth,
        currentDay: analysis.currentDay
      }
      
      this.setData({
        analysisData: displayData,
        suggestions,
        savingGoals,
        budgetPrediction,
        isLoading: false
      })
    } catch (err) {
      console.error('AI analysis error:', err)
      this.setData({ isLoading: false })
      wx.showToast({ title: '分析失败', icon: 'none' })
    }
  },

  parseBillDate(item, currentYear) {
    if (item.fullDate) {
      try {
        const arr = String(item.fullDate).split('-')
        if (arr.length >= 3) {
          return new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2]))
        }
        if (typeof item.fullDate === 'number') {
          return new Date(item.fullDate)
        }
      } catch (e) {}
    }
    if (item.date) {
      const m = item.date.match(/(\d+)月(\d+)日?/)
      if (m) {
        return new Date(currentYear, Number(m[1]) - 1, Number(m[2]))
      }
    }
    return null
  },

  analyzeBills(bills) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    let totalExpense = 0
    let totalIncome = 0
    const categoryExpenses = {}
    const dailyExpenses = {}
    let billCount = 0
    
    bills.forEach(item => {
      const billDate = this.parseBillDate(item, currentYear)
      if (!billDate) return
      
      const money = Number(item.money) || 0
      const billType = item.billType !== undefined ? item.billType : (item.type !== undefined ? item.type : 0)
      const isThisMonth = billDate.getFullYear() === currentYear && billDate.getMonth() === currentMonth
      
      if (isThisMonth) {
        billCount++
        if (billType === 0) {
          totalExpense += money
          const cate = item.cateName || '其他'
          categoryExpenses[cate] = (categoryExpenses[cate] || 0) + money
          const dateKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}-${String(billDate.getDate()).padStart(2, '0')}`
          dailyExpenses[dateKey] = (dailyExpenses[dateKey] || 0) + money
        } else {
          totalIncome += money
        }
      }
    })
    
    const categoryList = Object.entries(categoryExpenses)
      .map(([name, amount]) => ({ name, amount, percent: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.amount - a.amount)
    
    const avgDailyExpense = Object.keys(dailyExpenses).length > 0 
      ? totalExpense / Object.keys(dailyExpenses).length 
      : 0
    
    const maxDailyExpense = Object.values(dailyExpenses).length > 0 
      ? Math.max(...Object.values(dailyExpenses)) 
      : 0
    
    return {
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      categoryList,
      avgDailyExpense,
      maxDailyExpense,
      billCount,
      daysInMonth: new Date(currentYear, currentMonth + 1, 0).getDate(),
      currentDay: now.getDate()
    }
  },

  generateSuggestions(analysis) {
    const suggestions = []
    
    if (analysis.totalExpense > analysis.totalIncome * 0.8) {
      suggestions.push({
        icon: '⚠️',
        title: '支出偏高',
        desc: `本月支出已达收入的${((analysis.totalExpense / analysis.totalIncome) * 100).toFixed(0)}%，建议控制消费`,
        type: 'warning',
        detail: `当前支出 ¥${analysis.totalExpense.toFixed(2)}，收入 ¥${analysis.totalIncome.toFixed(2)}。建议减少非必要消费，特别是餐饮和购物类支出。`
      })
    }
    
    if (analysis.categoryList.length > 0) {
      const topCategory = analysis.categoryList[0]
      if (Number(topCategory.percent) > 40) {
        suggestions.push({
          icon: '🥗',
          title: `${topCategory.name}占比过高`,
          desc: `${topCategory.name}支出占总支出的${topCategory.percent}%，建议适当控制`,
          type: 'info',
          detail: `${topCategory.name}本月支出 ¥${topCategory.amount.toFixed(2)}，占比${topCategory.percent}%。建议设定预算上限，合理规划消费。`
        })
      }
    }
    
    if (analysis.avgDailyExpense > 100) {
      suggestions.push({
        icon: '💰',
        title: '日均消费较高',
        desc: `日均消费 ¥${analysis.avgDailyExpense.toFixed(2)}，建议设定每日消费上限`,
        type: 'info',
        detail: `本月日均消费 ¥${analysis.avgDailyExpense.toFixed(2)}。建议设定每日消费上限，如 ¥80，超过部分需要特别说明。`
      })
    }
    
    if (analysis.balance > 0 && analysis.balance > analysis.totalIncome * 0.3) {
      suggestions.push({
        icon: '💸',
        title: '储蓄能力强',
        desc: `本月结余 ¥${analysis.balance.toFixed(2)}，建议设置自动储蓄`,
        type: 'success',
        detail: `本月结余 ¥${analysis.balance.toFixed(2)}，占收入的${((analysis.balance / analysis.totalIncome) * 100).toFixed(0)}%。建议开通自动储蓄功能，每月固定存入一定金额。`
      })
    }
    
    if (analysis.billCount > 30) {
      suggestions.push({
        icon: '📝',
        title: '记账频率高',
        desc: `本月已记${analysis.billCount}笔账，继续保持！`,
        type: 'success',
        detail: `本月已记录${analysis.billCount}笔账单，记账习惯很好！建议定期查看统计分析，了解消费趋势。`
      })
    }
    
    if (suggestions.length === 0) {
      suggestions.push({
        icon: '🎉',
        title: '财务状况良好',
        desc: '你的消费习惯健康，继续保持！',
        type: 'success',
        detail: '本月收支平衡，消费结构合理。建议设定新的储蓄目标，挑战更高的储蓄率。'
      })
    }
    
    return suggestions
  },

  generateSavingGoals(analysis) {
    const goals = []
    const monthlyBalance = analysis.balance
    
    if (monthlyBalance > 0) {
      goals.push({
        icon: '💎',
        name: '应急基金',
        desc: `3-6个月生活费`,
        target: (monthlyBalance * 3).toFixed(0),
        progress: 0,
        reason: '应急基金可以应对突发情况，建议先存够3个月生活费'
      })
      
      goals.push({
        icon: '🏠',
        name: '购房首付',
        desc: `每月存${(monthlyBalance * 0.5).toFixed(0)}`,
        target: '50000',
        progress: 0,
        reason: '长期储蓄目标，建议每月固定存入'
      })
      
      goals.push({
        icon: '✈️',
        name: '旅行基金',
        desc: `每月存${(monthlyBalance * 0.3).toFixed(0)}`,
        target: '10000',
        progress: 0,
        reason: '设定旅行目标，激励自己省钱'
      })
    } else {
      goals.push({
        icon: '📉',
        name: '收支平衡',
        desc: '先实现收支平衡',
        target: '0',
        progress: 0,
        reason: '当前支出大于收入，建议先控制支出，实现收支平衡'
      })
    }
    
    return goals
  },

  predictBudget(analysis) {
    const remainingDays = analysis.daysInMonth - analysis.currentDay
    const avgDaily = analysis.avgDailyExpense
    const predictedRemaining = remainingDays * avgDaily
    const budgetUsed = analysis.totalExpense
    
    return {
      remainingDays,
      avgDaily: avgDaily.toFixed(2),
      predictedRemaining: predictedRemaining.toFixed(2),
      budgetUsed: budgetUsed.toFixed(2),
      totalPredicted: (budgetUsed + predictedRemaining).toFixed(2)
    }
  },

  showDetail(e) {
    const { index, type } = e.currentTarget.dataset
    if (type === 'suggestion') {
      this.setData({ currentDetail: this.data.suggestions[index], showDetail: true })
    } else if (type === 'goal') {
      this.setData({ currentDetail: this.data.savingGoals[index], showDetail: true })
    }
  },

  closeDetail() {
    this.setData({ showDetail: false, currentDetail: null })
  },

  goToBudget() {
    wx.navigateTo({ url: '/pages/budget/budget' })
  },

  goToStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' })
  },

  refresh() {
    this.loadAnalysisData()
  }
})
