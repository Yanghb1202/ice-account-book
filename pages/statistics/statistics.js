// pages/statistics/statistics.js
const now = new Date();
const defaultYear = now.getFullYear();
const defaultMonth = now.getMonth() + 1;

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,

    billType: 0,        // 0支出 1收入
    timeType: 1,        // 0周 1月 2年 3自定义
    currentDate: `${defaultYear}年${defaultMonth}月`,
    titleText: `${defaultYear}年${defaultMonth}月`,

    // 周期定位（内部使用 fullDate 范围）
    rangeStart: '',     // YYYY-MM-DD
    rangeEnd: '',       // YYYY-MM-DD
    weekAnchor: '',     // 周视图：当前所在周的任一日期 YYYY-MM-DD
    yearAnchor: defaultYear,
    customStart: '',
    customEnd: '',

    // 汇总数据
    totalRaw: 0,
    totalExp: '0.00',
    dayAvgExp: '0.00',
    compareRate: '0.0%',
    compareUp: false,

    billCount: 0,
    maxSingle: '0.00',
    maxSingleDesc: '',
    maxDay: '0.00',
    maxDayDesc: '',

    // 折线图
    lineChartData: { categories: [], series: [{ name: '支出', data: [] }] },
    lineOpts: {
      color: ['#ffc837'],
      padding: [10, 15, 0, 5],
      enableScroll: false,
      legend: { show: false },
      dataLabel: false,
      dataPointShape: true,
      dataPointShapeType: 'hollow',
      extra: {
        line: { type: 'curve', width: 2, activeType: 'hollow' },
        tooltip: {
          showBox: true,
          bgColor: 'rgba(255,248,225,0.95)',
          borderColor: '#f0e9d6',
          borderWidth: 1,
          fontColor: '#333',
          fontSize: 13,
          lineHeight: 18
        },
        column: { type: 'group', width: 18, activeBgColor: '#ffe9b8', activeBgOpacity: 0.4 }
      },
      xAxis: { disableGrid: true, axisLine: { show: true, color: '#eee' }, calibration: true, fontSize: 11, color: '#999', marginTop: 5 },
      yAxis: { disabled: false, disableGrid: false, gridType: 'dash', dashLength: 4, splitNumber: 4, gridColor: '#f0f0f0', fontSize: 11, color: '#999', min: 0, showTitle: false }
    },
    chartType: 'line', // 周/月用 line,年用 column

    // 环形图
    ringChartData: { series: [{ name: '支出占比', data: [] }] },
    ringOpts: {
      color: ['#ffc837', '#6399cc', '#f2a25c', '#a8b0b9', '#d4b899', '#e898a2', '#9bd2a4', '#c9a9e0'],
      padding: [5, 5, 5, 5],
      enableScroll: false,
      legend: { show: false },
      dataLabel: false,
      title: { name: '0.00', fontSize: 24, color: '#222', offsetY: -8 },
      subtitle: { name: '总支出', fontSize: 13, color: '#999', offsetY: 8 },
      extra: {
        ring: {
          ringWidth: 30,
          activeOpacity: 0.8,
          activeRadius: 6,
          offsetAngle: 0,
          labelWidth: 10,
          border: false,
          borderWidth: 0,
          borderColor: '#fff9e8',
          centerColor: '#fff9e8',
          customRadius: 0,
          linearType: 'custom'
        }
      }
    },

    catePercentList: [],
    topCate: null,        // 排名第一的分类
    recentBills: []       // 当前周期最近 5 笔
  },

  calcTimer: null,

  onLoad() {
    // 自定义导航高度
    try {
      const sys = wx.getSystemInfoSync();
      const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      const sb = sys.statusBarHeight || 20;
      const navH = menu ? (menu.top - sb) * 2 + menu.height : 44;
      this.setData({ statusBarHeight: sb, navBarHeight: navH });
    } catch (e) {}

    // 默认锚点
    const today = this.formatDate(now);
    this.setData({
      weekAnchor: today,
      customStart: today,
      customEnd: today
    });
  },

  onShow() {
    if (this.calcTimer) clearTimeout(this.calcTimer);
    this.calcTimer = setTimeout(() => this.calcStatisticsData(), 120);
  },

  // ============ 工具：日期 ============
  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  parseDate(s) {
    if (!s) return null;
    const arr = s.split('-');
    return new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2]));
  },
  // 获取该日期所在周的周一/周日（中国习惯）
  getWeekRange(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay() === 0 ? 7 : date.getDay(); // 周日=7
    const monday = new Date(date);
    monday.setDate(date.getDate() - (day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
  },

  // ============ Tab 切换 ============
  switchOutIn(e) {
    const type = Number(e.currentTarget.dataset.type);
    if (type === this.data.billType) return;
    this.setData({ billType: type });
    this.calcStatisticsData();
  },
  switchTime(e) {
    const type = Number(e.currentTarget.dataset.type);
    if (type === this.data.timeType) return;
    this.setData({ timeType: type });
    if (type === 3) {
      // 自定义：弹出选择
      this.pickCustomRange();
    } else {
      this.calcStatisticsData();
    }
  },

  // ============ 周期前后切换 ============
  prevPeriod() {
    const { timeType } = this.data;
    if (timeType === 0) {
      const d = this.parseDate(this.data.weekAnchor);
      d.setDate(d.getDate() - 7);
      this.setData({ weekAnchor: this.formatDate(d) });
    } else if (timeType === 1) {
      let [y, m] = this.data.currentDate.split('年');
      m = parseInt(m.replace('月', ''));
      y = parseInt(y);
      m--;
      if (m < 1) { m = 12; y--; }
      this.setData({ currentDate: `${y}年${m}月` });
    } else if (timeType === 2) {
      this.setData({ yearAnchor: this.data.yearAnchor - 1 });
    }
    this.calcStatisticsData();
  },
  nextPeriod() {
    const { timeType } = this.data;
    if (timeType === 0) {
      const d = this.parseDate(this.data.weekAnchor);
      d.setDate(d.getDate() + 7);
      this.setData({ weekAnchor: this.formatDate(d) });
    } else if (timeType === 1) {
      let [y, m] = this.data.currentDate.split('年');
      m = parseInt(m.replace('月', ''));
      y = parseInt(y);
      m++;
      if (m > 12) { m = 1; y++; }
      this.setData({ currentDate: `${y}年${m}月` });
    } else if (timeType === 2) {
      this.setData({ yearAnchor: this.data.yearAnchor + 1 });
    }
    this.calcStatisticsData();
  },

  // ============ 自定义范围 ============
  pickCustomRange() {
    wx.showModal({
      title: '自定义周期',
      content: '请依次选择开始日期与结束日期',
      showCancel: false,
      success: () => {
        wx.showActionSheet({
          itemList: ['最近7天', '最近30天', '最近90天', '本年至今'],
          success: (res) => {
            const today = new Date();
            const end = new Date(today);
            const start = new Date(today);
            const map = [7, 30, 90];
            if (res.tapIndex < 3) {
              start.setDate(today.getDate() - (map[res.tapIndex] - 1));
            } else {
              start.setMonth(0); start.setDate(1);
            }
            this.setData({
              customStart: this.formatDate(start),
              customEnd: this.formatDate(end)
            });
            this.calcStatisticsData();
          },
          fail: () => {
            this.setData({ timeType: 1 });
            this.calcStatisticsData();
          }
        });
      }
    });
  },
  bindCustomStart(e) {
    this.setData({ customStart: e.detail.value });
    this.calcStatisticsData();
  },
  bindCustomEnd(e) {
    this.setData({ customEnd: e.detail.value });
    this.calcStatisticsData();
  },

  // ============ 计算当前周期范围 ============
  resolveRange() {
    const { timeType } = this.data;
    if (timeType === 0) {
      const anchor = this.parseDate(this.data.weekAnchor) || new Date();
      const { start, end } = this.getWeekRange(anchor);
      return { start, end, label: `${start.getMonth() + 1}.${start.getDate()} - ${end.getMonth() + 1}.${end.getDate()}` };
    }
    if (timeType === 1) {
      const arr = this.data.currentDate.split('年');
      const y = parseInt(arr[0]);
      const m = parseInt(arr[1].replace('月', ''));
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { start, end, label: `${y}年${m}月` };
    }
    if (timeType === 2) {
      const y = this.data.yearAnchor;
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { start, end, label: `${y}年` };
    }
    // 自定义
    const start = this.parseDate(this.data.customStart) || new Date();
    const end = this.parseDate(this.data.customEnd) || new Date();
    return { start, end, label: `${this.data.customStart} 至 ${this.data.customEnd}` };
  },

  // ============ 主计算 ============
  calcStatisticsData() {
    const allBill = wx.getStorageSync('all_bill') || [];
    const { billType, timeType } = this.data;
    const chartName = billType === 0 ? '支出' : '收入';

    const range = this.resolveRange();
    const { start, end, label } = range;
    const startTs = start.getTime();
    const endTs = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();

    // 过滤出当前周期数据
    const inRange = [];
    allBill.forEach(item => {
      if (item.type !== billType) return;
      let billDate;
      if (item.fullDate) {
        billDate = this.parseDate(item.fullDate);
      } else {
        // 兼容旧数据：仅有 "M月D日"，按今年补全
        const m = item.date && item.date.match(/(\d+)月(\d+)/);
        if (!m) return;
        billDate = new Date(defaultYear, Number(m[1]) - 1, Number(m[2]));
      }
      if (!billDate) return;
      const ts = billDate.getTime();
      if (ts >= startTs && ts <= endTs) {
        inRange.push({ ...item, _ts: ts, _date: billDate });
      }
    });

    // 汇总
    let totalMoney = 0;
    let maxSingle = 0, maxSingleItem = null;
    const cateMap = {};
    inRange.forEach(it => {
      const m = Number(it.money);
      totalMoney += m;
      if (m > maxSingle) { maxSingle = m; maxSingleItem = it; }
      cateMap[it.cateName] = (cateMap[it.cateName] || 0) + m;
    });

    // 构建图表数据（不同周期不同分桶）
    const buckets = this.buildBuckets(timeType, start, end, inRange);

    // 日均
    const dayMs = 1000 * 60 * 60 * 24;
    const dayCount = Math.max(1, Math.round((endTs - startTs) / dayMs) + 1);
    const dayAvg = totalMoney / dayCount;

    // 单日最高
    const dayAggMap = {};
    inRange.forEach(it => {
      const k = this.formatDate(it._date);
      dayAggMap[k] = (dayAggMap[k] || 0) + Number(it.money);
    });
    let maxDay = 0, maxDayKey = '';
    Object.keys(dayAggMap).forEach(k => {
      if (dayAggMap[k] > maxDay) { maxDay = dayAggMap[k]; maxDayKey = k; }
    });

    // 环比
    const compare = this.calcCompare(allBill, billType, timeType, start, end);

    // 占比列表
    const colorArr = this.data.ringOpts.color;
    const cateArr = [];
    const ringData = [];
    Object.keys(cateMap)
      .map(name => ({ name, value: cateMap[name] }))
      .sort((a, b) => b.value - a.value)
      .forEach((it, idx) => {
        const pct = totalMoney === 0 ? 0 : Math.round(it.value / totalMoney * 100);
        cateArr.push({
          name: it.name,
          percent: pct + '%',
          money: this.formatNum(it.value),
          color: colorArr[idx % colorArr.length]
        });
        ringData.push({ name: it.name, value: it.value });
      });

    // 最近账单 5 条
    const recent = inRange
      .sort((a, b) => (b.createTime || b._ts) - (a.createTime || a._ts))
      .slice(0, 5)
      .map(it => ({
        id: it.id,
        emoji: it.cateEmoji || '📌',
        cateName: it.cateName,
        remark: it.remark || it.cateName,
        date: it.date,
        money: this.formatNum(Number(it.money))
      }));

    // 标题
    let titleText = label;

    // AI趋势预测
    const predictionData = this.predictTrend(allBill, billType, timeType, start, end, totalMoney, dayAvg);

    this.setData({
      titleText,
      currentDate: timeType === 1 ? this.data.currentDate : (timeType === 2 ? `${this.data.yearAnchor}年` : label),
      totalRaw: totalMoney,
      totalExp: this.formatNum(totalMoney),
      dayAvgExp: this.formatNum(dayAvg),
      compareRate: compare.rate,
      compareUp: compare.up,
      billCount: inRange.length,
      maxSingle: this.formatNum(maxSingle),
      maxSingleDesc: maxSingleItem ? `${maxSingleItem.cateName} · ${maxSingleItem.date}` : '暂无',
      maxDay: this.formatNum(maxDay),
      maxDayDesc: maxDayKey ? this.shortDate(maxDayKey) : '暂无',
      lineChartData: { categories: buckets.categories, series: [{ name: chartName, data: buckets.values }] },
      chartType: timeType === 2 ? 'column' : 'line',
      ringChartData: { series: [{ name: chartName, data: ringData }] },
      'ringOpts.title.name': this.formatNum(totalMoney),
      'ringOpts.subtitle.name': billType === 0 ? '总支出' : '总收入',
      catePercentList: cateArr,
      topCate: cateArr[0] || null,
      recentBills: recent,
      predictionData
    });
  },

  // ============ AI趋势预测 ============
  predictTrend(allBill, billType, timeType, start, end, currentTotal, dayAvg) {
    const today = new Date();
    const dayMs = 86400000;
    
    let remainingDays = 0;
    let trend = 0;
    let trendPercent = 0;
    let trendDesc = '';
    let analysis = '';
    
    if (timeType === 1) {
      const currentDay = today.getDate();
      const daysInMonth = end.getDate();
      remainingDays = Math.max(0, daysInMonth - currentDay);
    } else if (timeType === 0) {
      const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      remainingDays = Math.max(0, 7 - currentDayOfWeek + 1);
    }
    
    const predictedRemaining = remainingDays * dayAvg;
    const predictedTotal = currentTotal + predictedRemaining;
    
    const prevPeriodData = this.getPrevPeriodData(allBill, billType, timeType, start, end);
    if (prevPeriodData > 0) {
      trend = predictedTotal - prevPeriodData;
      trendPercent = (trend / prevPeriodData * 100).toFixed(1);
      
      if (trend > 0) {
        trendDesc = '消费呈上升趋势';
      } else if (trend < 0) {
        trendDesc = '消费呈下降趋势';
      } else {
        trendDesc = '消费趋势平稳';
      }
    }
    
    const analysisTemplates = {
      up: [
        '本月消费预计比上月增加{{percent}}%，建议关注主要支出类目，适当控制消费。',
        '消费趋势向上，本月预计支出{{total}}元。建议设定预算上限，避免超支。',
        '近期消费增长明显，AI分析显示您在{{category}}方面支出较多，建议优化消费习惯。'
      ],
      down: [
        '本月消费预计比上月减少{{percent}}%，继续保持良好的理财习惯！',
        '消费趋势向下，本月预计支出{{total}}元，节省了{{saved}}元。',
        'AI分析显示您的消费控制效果显著，建议继续坚持当前的消费策略。'
      ],
      stable: [
        '本月消费趋势平稳，预计支出{{total}}元。建议保持现有消费习惯。',
        '消费波动较小，AI分析显示您的支出结构健康合理。',
        '本月支出预计与上月持平，建议设定新的储蓄目标。'
      ]
    };
    
    const trendType = trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable';
    const templateList = analysisTemplates[trendType];
    const template = templateList[Math.floor(Math.random() * templateList.length)];
    
    analysis = template
      .replace('{{percent}}', Math.abs(Number(trendPercent)).toFixed(1))
      .replace('{{total}}', this.formatNum(predictedTotal))
      .replace('{{saved}}', this.formatNum(Math.abs(trend)))
      .replace('{{category}}', '餐饮、购物');
    
    return {
      currentTotal: this.formatNum(currentTotal),
      remainingPrediction: this.formatNum(predictedRemaining),
      predictedTotal: this.formatNum(predictedTotal),
      trend,
      trendPercent,
      trendDesc,
      analysis
    };
  },

  getPrevPeriodData(allBill, billType, timeType, start, end) {
    const dayMs = 86400000;
    let prevStart, prevEnd;
    
    if (timeType === 0) {
      prevEnd = new Date(start.getTime() - dayMs);
      prevStart = new Date(prevEnd.getTime() - 6 * dayMs);
    } else if (timeType === 1) {
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    } else if (timeType === 2) {
      prevStart = new Date(start.getFullYear() - 1, 0, 1);
      prevEnd = new Date(start.getFullYear() - 1, 11, 31);
    } else {
      const span = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
      prevEnd = new Date(start.getTime() - dayMs);
      prevStart = new Date(prevEnd.getTime() - (span - 1) * dayMs);
    }
    
    const ps = prevStart.getTime();
    const pe = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59).getTime();
    
    let total = 0;
    allBill.forEach(item => {
      if (item.type !== billType) return;
      let d;
      if (item.fullDate) d = this.parseDate(item.fullDate);
      else {
        const m = item.date && item.date.match(/(\d+)月(\d+)/);
        if (!m) return;
        d = new Date(defaultYear, Number(m[1]) - 1, Number(m[2]));
      }
      if (!d) return;
      const ts = d.getTime();
      if (ts >= ps && ts <= pe) total += Number(item.money);
    });
    
    return total;
  },

  // ============ 图表分桶 ============
  buildBuckets(timeType, start, end, inRange) {
    const dayMs = 86400000;
    if (timeType === 0) {
      // 周：7 天
      const categories = [];
      const values = [];
      const weekDayLabels = ['一', '二', '三', '四', '五', '六', '日'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * dayMs);
        categories.push(`周${weekDayLabels[i]}`);
        values.push(0);
      }
      inRange.forEach(it => {
        const idx = Math.floor((it._ts - start.getTime()) / dayMs);
        if (idx >= 0 && idx < 7) values[idx] += Number(it.money);
      });
      return { categories, values };
    }
    if (timeType === 1) {
      // 月：每天
      const dayCount = end.getDate();
      const categories = [];
      const values = new Array(dayCount).fill(0);
      for (let d = 1; d <= dayCount; d++) {
        if (d === 1 || d === 10 || d === 20 || d === dayCount) categories.push(`${d}日`);
        else categories.push('');
      }
      inRange.forEach(it => {
        const day = it._date.getDate();
        values[day - 1] += Number(it.money);
      });
      return { categories, values };
    }
    if (timeType === 2) {
      // 年：12 个月
      const categories = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
      const values = new Array(12).fill(0);
      inRange.forEach(it => {
        values[it._date.getMonth()] += Number(it.money);
      });
      return { categories, values };
    }
    // 自定义：按天，最多 31 个标签
    const total = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
    const categories = [];
    const values = new Array(total).fill(0);
    const step = Math.max(1, Math.floor(total / 6));
    for (let i = 0; i < total; i++) {
      const d = new Date(start.getTime() + i * dayMs);
      categories.push((i % step === 0 || i === total - 1) ? `${d.getMonth() + 1}.${d.getDate()}` : '');
    }
    inRange.forEach(it => {
      const idx = Math.floor((it._ts - start.getTime()) / dayMs);
      if (idx >= 0 && idx < total) values[idx] += Number(it.money);
    });
    return { categories, values };
  },

  // ============ 环比 ============
  calcCompare(allBill, billType, timeType, start, end) {
    const dayMs = 86400000;
    let prevStart, prevEnd;
    if (timeType === 0) {
      prevEnd = new Date(start.getTime() - dayMs);
      prevStart = new Date(prevEnd.getTime() - 6 * dayMs);
    } else if (timeType === 1) {
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0); // 上月最后一天
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    } else if (timeType === 2) {
      prevStart = new Date(start.getFullYear() - 1, 0, 1);
      prevEnd = new Date(start.getFullYear() - 1, 11, 31);
    } else {
      const span = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
      prevEnd = new Date(start.getTime() - dayMs);
      prevStart = new Date(prevEnd.getTime() - (span - 1) * dayMs);
    }

    const ps = prevStart.getTime();
    const pe = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59).getTime();
    const cs = start.getTime();
    const ce = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();

    let prevTotal = 0, curTotal = 0;
    allBill.forEach(item => {
      if (item.type !== billType) return;
      let d;
      if (item.fullDate) d = this.parseDate(item.fullDate);
      else {
        const m = item.date && item.date.match(/(\d+)月(\d+)/);
        if (!m) return;
        d = new Date(defaultYear, Number(m[1]) - 1, Number(m[2]));
      }
      if (!d) return;
      const ts = d.getTime();
      const money = Number(item.money);
      if (ts >= cs && ts <= ce) curTotal += money;
      if (ts >= ps && ts <= pe) prevTotal += money;
    });
    if (prevTotal === 0) {
      if (curTotal === 0) return { rate: '0.0%', up: false };
      return { rate: '+100%', up: true };
    }
    const diff = (curTotal - prevTotal) / prevTotal * 100;
    const sign = diff > 0 ? '+' : '';
    return { rate: `${sign}${diff.toFixed(1)}%`, up: diff > 0 };
  },

  // ============ 工具：格式化 ============
  formatNum(n) {
    if (isNaN(n)) n = 0;
    return Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },
  shortDate(s) {
    const d = this.parseDate(s);
    if (!d) return s;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  // ============ 跳转 ============
  goCompare() {
    wx.showModal({
      title: '环比对比',
      content: this.data.compareUp
        ? `本期较上期增加 ${this.data.compareRate}，注意控制开支哦~`
        : `本期较上期减少 ${this.data.compareRate}，做得不错！`,
      showCancel: false
    });
  },
  goMore() {
    wx.showToast({ title: '更多分类明细开发中', icon: 'none' });
  },
  goBillDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: '账单详情：' + id, icon: 'none' });
  },

  onUnload() {
    if (this.calcTimer) clearTimeout(this.calcTimer);
  }
});
