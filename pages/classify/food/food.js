Page({
  data: {
    weekList: [
      { week: "一", day: 1, dateNum: 0, fullDateStr: "" },
      { week: "二", day: 2, dateNum: 0, fullDateStr: "" },
      { week: "三", day: 3, dateNum: 0, fullDateStr: "" },
      { week: "四", day: 4, dateNum: 0, fullDateStr: "" },
      { week: "五", day: 5, dateNum: 0, fullDateStr: "" },
      { week: "六", day: 6, dateNum: 0, fullDateStr: "" },
      { week: "日", day: 7, dateNum: 0, fullDateStr: "" }
    ],
    currentDay: 1,
    targetCal: 2000,
    totalCal: "0.00",
    foodList: [],
    holeList: [1, 2, 3, 4, 5, 6, 7, 8, 9],

    showPopup: false,
    tempImg: "",
    loadingAi: false,
    aiFoodName: "",
    aiCal: 0,
    aiTip: "",
    aiConfidence: 0,
    aiConfidenceText: "",
    candidateList: [],
    price: "",

    // 后端API地址
    // 开发者工具优先使用 127.0.0.1；真机调试再使用电脑 IPv4
    apiBaseList: [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "http://192.168.130.24:3000"
    ],
    apiBase: "http://127.0.0.1:3000"
  },

  onLoad() {
    this.initWeek();
    this.loadFoodData();
  },

  onShow() {
    this.loadFoodData();
  },

  initWeek() {
    const now = new Date();
    const todayWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (todayWeek === 0 ? 6 : todayWeek - 1));

    const weekList = this.data.weekList.map((item, i) => {
      const curDate = new Date(monday);
      curDate.setDate(monday.getDate() + i);
      const m = curDate.getMonth() + 1;
      const d = curDate.getDate();
      return {
        ...item,
        dateNum: d,
        fullDateStr: `${m}月${d}日`
      };
    });

    let targetDay = todayWeek === 0 ? 7 : todayWeek;
    this.setData({ weekList, currentDay: targetDay });
  },

  loadFoodData() {
    const allList = wx.getStorageSync("all_bill") || [];
    const { currentDay, weekList } = this.data;
    const targetDate = weekList[currentDay - 1].fullDateStr;

    const filterList = allList.filter(
      item => item.cateName === "餐饮" && item.date === targetDate
    );

    // 转换为页面展示格式
    const foodList = filterList.map(item => ({
      id: item.id,
      name: item.remark || item.name || "美食",
      cal: item.cal || 0,
      price: item.money || "0.00",
      img: item.img || "",
      date: item.date
    }));

    let total = 0;
    filterList.forEach(i => total += Number(i.cal || 0));

    this.setData({
      foodList,
      totalCal: total.toFixed(2)
    });
  },

  selectDay(e) {
    const day = Number(e.currentTarget.dataset.day);
    this.setData({ currentDay: day }, () => this.loadFoodData());
  },

  // ==================== AI识别 ====================

  chooseFoodImg() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["camera", "album"],
      success: res => {
        const path = res.tempFiles[0].tempFilePath;
        this.setData({
          tempImg: path,
          showPopup: true,
          loadingAi: true,
          price: "",
          aiFoodName: "",
          aiCal: 0,
          aiTip: "",
          aiConfidence: 0,
          aiConfidenceText: "",
          candidateList: []
        });
        // 先压缩图片再识别，避免大图上传后百度接口超时
        this.compressAndRecognize(path);
      }
    });
  },

  /**
   * 压缩图片后再调用识别
   */
  compressAndRecognize(imagePath) {
    if (!wx.compressImage) {
      this.callAiRecognize(imagePath);
      return;
    }

    wx.compressImage({
      src: imagePath,
      quality: 55,
      success: res => {
        this.callAiRecognize(res.tempFilePath || imagePath);
      },
      fail: () => {
        this.callAiRecognize(imagePath);
      }
    });
  },

  /**
   * 调用后端AI识别API
   */
  callAiRecognize(imagePath) {
    // 读取图片为base64
    wx.getFileSystemManager().readFile({
      filePath: imagePath,
      encoding: "base64",
      success: res => {
        const base64 = res.data;
        this.requestRecognizeWithFallback(`data:image/jpeg;base64,${base64}`, 0);
      },
      fail: () => {
        this.showRecognizeFail("图片读取失败，请重新选择");
      }
    });
  },

  /**
   * 依次尝试多个后端地址，避免 localhost/127.0.0.1 不兼容
   */
  requestRecognizeWithFallback(imageBase64, index) {
    const apiList = this.data.apiBaseList || [this.data.apiBase];
    const apiBase = String(apiList[index] || "").replace(/`/g, "").trim();

    if (!apiBase) {
      this.showRecognizeFail("后端连接失败，请检查地址或服务是否启动");
      return;
    }

    wx.request({
      url: `${apiBase}/api/recognize/base64`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { image: imageBase64 },
      timeout: 45000,
      success: response => {
        const result = response.data;
        if (result && result.success && result.data) {
          const candidates = this.formatCandidateList(result.data.candidates || []);
          this.setData({
            apiBase,
            loadingAi: false,
            aiFoodName: result.data.name,
            aiCal: result.data.cal,
            aiTip: result.data.tip,
            aiConfidence: result.data.confidence || 0,
            aiConfidenceText: this.formatConfidence(result.data.confidence || 0),
            candidateList: candidates
          });
        } else {
          const msg = result && result.message ? result.message : "识别失败，请手动填写";
          this.showRecognizeFail(msg);
        }
      },
      fail: err => {
        console.log("AI识别后端连接失败:", apiBase, err);
        this.requestRecognizeWithFallback(imageBase64, index + 1);
      }
    });
  },

  /**
   * 识别失败时不再随机返回，避免保存错误菜品
   */
  showRecognizeFail(msg) {
    this.setData({
      loadingAi: false,
      aiFoodName: "请手动填写",
      aiCal: 0,
      aiTip: msg,
      aiConfidence: 0,
      aiConfidenceText: "",
      candidateList: []
    });
    wx.showToast({ title: msg, icon: "none" });
  },

  formatConfidence(confidence) {
    const num = Number(confidence || 0);
    if (!num) return "";
    return `${Math.round(num * 100)}%`;
  },

  formatCandidateList(list) {
    return (list || []).map(item => ({
      ...item,
      confidenceText: this.formatConfidence(item.confidence)
    }));
  },

  /**
   * 点击候选菜品
   */
  selectCandidate(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.candidateList[index];
    if (!item) return;
    this.setData({
      aiFoodName: item.name,
      aiCal: item.cal,
      aiTip: item.tip,
      aiConfidence: item.confidence || 0,
      aiConfidenceText: item.confidenceText || this.formatConfidence(item.confidence)
    });
  },

  // ==================== 价格输入 ====================

  inputPrice(e) {
    let val = e.detail.value;
    val = val.replace(/[^\d.]/g, "");
    let dotCount = (val.match(/\./g) || []).length;
    if (dotCount > 1) val = val.slice(0, val.lastIndexOf("."));
    let arr = val.split(".");
    if (arr.length === 2 && arr[1].length > 2) {
      val = arr[0] + "." + arr[1].slice(0, 2);
    }
    this.setData({ price: val });
  },

  // ==================== 弹窗操作 ====================

  closeMask() {
    this.setData({ showPopup: false });
  },

  reTake() {
    this.setData({ showPopup: false }, () => this.chooseFoodImg());
  },

  editFood() {
    const { aiFoodName, aiCal } = this.data;
    wx.showModal({
      title: "修改菜名和热量",
      content: `当前：${aiFoodName}\n热量：${aiCal} kcal`,
      editable: true,
      placeholderText: "例如：炒饭 550",
      success: res => {
        if (res.confirm && res.content) {
          const text = res.content.trim();
          const calMatch = text.match(/\d+(\.\d+)?/);
          const name = text.replace(/\d+(\.\d+)?/g, "").replace(/kcal|大卡|千卡/g, "").trim();
          this.setData({
            aiFoodName: name || text,
            aiCal: calMatch ? Math.round(Number(calMatch[0])) : this.data.aiCal,
            aiTip: "已手动修正，请确认价格后保存"
          });
        }
      }
    });
  },

  saveFood() {
    const { tempImg, aiFoodName, aiCal, price } = this.data;
    const foodPrice = price ? Number(price) : 0;
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const dateStr = `${m}月${d}日`;
    const cateName = "餐饮";
    const cateIcon = "cate_food.png";
    const moneyNum = Number(foodPrice);

    if (!aiFoodName || aiFoodName === "请手动填写") {
      wx.showToast({ title: "请先编辑正确菜名", icon: "none" });
      return;
    }

    const newItem = {
      id: Date.now(),
      type: 0,
      money: moneyNum.toFixed(2),
      cateName,
      cateIcon,
      remark: aiFoodName,
      date: dateStr,
      cal: aiCal,
      img: tempImg,
      name: aiFoodName,
      price: moneyNum.toFixed(2)
    };

    let allBill = wx.getStorageSync("all_bill") || [];
    allBill.unshift(newItem);
    wx.setStorageSync("all_bill", allBill);

    // 同步预算
    this.syncBudgetUsed("餐饮", moneyNum);

    wx.showToast({ title: "添加成功", icon: "success" });
    setTimeout(() => {
      this.setData({ showPopup: false });
      this.loadFoodData();
    }, 800);
  },

  // ==================== 预算同步 ====================

  syncBudgetUsed(cateShortName, addMoney) {
    const map = {
      "餐饮": "餐饮美食",
      "购物": "日常购物",
      "日用": "日常购物",
      "交通": "交通出行",
      "旅游": "交通出行",
      "娱乐": "休闲娱乐"
    };
    const targetCateName = map[cateShortName];
    if (!targetCateName) return;

    let budgetData = wx.getStorageSync("budgetData");
    if (!budgetData || !budgetData.budgetList) {
      budgetData = {
        totalBudget: 4000,
        usedMoney: 0,
        leftMoney: 4000,
        usedPercent: 0,
        budgetList: [
          { id: 1, name: "餐饮美食", icon: "🍜", color: "#ffd9d9", total: 1500, used: 0 },
          { id: 2, name: "日常购物", icon: "🛍️", color: "#d9e8ff", total: 1000, used: 0 },
          { id: 3, name: "交通出行", icon: "🚗", color: "#d9ffea", total: 100, used: 0 },
          { id: 4, name: "休闲娱乐", icon: "🎮", color: "#fff2cc", total: 1200, used: 0 }
        ]
      };
    }
    const list = budgetData.budgetList;
    let find = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].name === targetCateName) {
        const newUsed = Math.round((Number(list[i].used) + Number(addMoney)) * 100) / 100;
        list[i].used = newUsed;
        find = true;
        break;
      }
    }
    if (find) {
      let allUsed = 0;
      for (let i = 0; i < list.length; i++) {
        allUsed += Number(list[i].used);
      }
      budgetData.usedMoney = Math.round(allUsed * 100) / 100;
      budgetData.leftMoney = Math.round((budgetData.totalBudget - allUsed) * 100) / 100;
      const pct = budgetData.totalBudget === 0 ? 0 : ((allUsed / budgetData.totalBudget) * 100).toFixed(1);
      budgetData.usedPercent = pct;
    }
    wx.setStorageSync("budgetData", budgetData);
  },

  backAddBill() {
    wx.navigateBack();
  }
});
