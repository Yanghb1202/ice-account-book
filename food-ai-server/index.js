const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 百度AI配置 - 已硬编码密钥
const BAIDU_API_KEY = '0OLx3LHRm7uSMDLJhsn2gcWV';
const BAIDU_SECRET_KEY = 'YP7q8SlcajUGMaoRwki1Sc45vAVidua3';

console.log('🔑 已加载百度AI密钥');

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、WEBP 格式的图片'));
    }
  }
});

// 缓存access_token
let accessTokenCache = {
  token: null,
  expireTime: 0
};

/**
 * 获取百度AI access_token
 */
async function getBaiduAccessToken() {
  // 如果token未过期，直接返回缓存的token
  if (accessTokenCache.token && Date.now() < accessTokenCache.expireTime) {
    return accessTokenCache.token;
  }

  try {
    const response = await axios.post(
      'https://aip.baidubce.com/oauth/2.0/token',
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: BAIDU_API_KEY,
          client_secret: BAIDU_SECRET_KEY
        }
      }
    );

    if (response.data.access_token) {
      accessTokenCache.token = response.data.access_token;
      // 提前5分钟过期
      accessTokenCache.expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
      return response.data.access_token;
    }
    throw new Error('获取access_token失败');
  } catch (error) {
    console.error('获取百度AI token失败:', error.message);
    throw error;
  }
}

/**
 * 调用百度AI菜品识别API
 * @param {string} imageBase64 - Base64编码的图片
 */
async function recognizeDish(imageBase64) {
  const accessToken = await getBaiduAccessToken();

  const cleanBase64 = String(imageBase64 || '')
    .replace(/^data:image\/\w+;base64,/, '')
    .trim();

  if (!cleanBase64) {
    throw new Error('图片数据为空');
  }

  const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${accessToken}`;

  const body = new URLSearchParams();
  body.append('image', cleanBase64);
  body.append('top_num', '5');

  let lastError = null;

  for (let i = 0; i < 2; i++) {
    try {
      const response = await axios.post(url, body.toString(), {
        timeout: 20000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Connection': 'close'
        }
      });

      return response.data;
    } catch (error) {
      lastError = error;

      const code = error.code || '';
      const status = error.response && error.response.status;
      const data = error.response && error.response.data;

      console.error('菜品识别请求失败:', {
        attempt: i + 1,
        code,
        status,
        message: error.message,
        data
      });

      if (i === 0 && (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED')) {
        await new Promise(resolve => setTimeout(resolve, 800));
        continue;
      }

      break;
    }
  }

  if (lastError && lastError.response && lastError.response.data) {
    throw new Error(`百度识别接口返回错误: ${JSON.stringify(lastError.response.data)}`);
  }

  if (lastError && lastError.code === 'ECONNRESET') {
    throw new Error('连接百度识别接口被重置，请检查网络/代理/防火墙，或稍后重试');
  }

  throw lastError || new Error('菜品识别请求失败');
}
/**
 * 根据菜品名称获取热量信息（使用内置数据库）
 * @param {string} dishName - 菜品名称
 */
function getCalorieInfo(dishName) {
  // 常见菜品热量数据库 (每100g热量)
  const calorieDB = {
    '麻辣烫': { cal: 620, tip: '油脂偏高，建议多搭配绿叶菜，少喝汤底' },
    '盖饭': { cal: 725, tip: '碳水充足，晚餐减少主食摄入' },
    '贝果': { cal: 380, tip: '优质碳水，适合早餐食用，搭配牛奶更佳' },
    '巧克力': { cal: 580, tip: '热量较高，少量解馋即可，不建议睡前吃' },
    '蛋炒饭': { cal: 550, tip: '油分较高，搭配青菜均衡饮食' },
    '牛肉面': { cal: 480, tip: '蛋白充足，少油汤底更健康' },
    '炸鸡': { cal: 890, tip: '油炸热量极高，每周不超过1次' },
    '沙拉': { cal: 320, tip: '低脂高蛋白，减脂友好' },
    '螺蛳粉': { cal: 750, tip: '米粉+油脂热量偏高，少辣油' },
    '饺子': { cal: 600, tip: '主食肉类一体，控制食用数量' },
    '奶茶': { cal: 420, tip: '糖分超标，建议三分糖或无糖' },
    '清蒸鱼': { cal: 260, tip: '低脂优质蛋白，推荐减脂食用' },
    '红烧肉': { cal: 520, tip: '脂肪含量高，适量食用' },
    '宫保鸡丁': { cal: 450, tip: '蛋白质丰富，注意花生热量' },
    '麻婆豆腐': { cal: 380, tip: '植物蛋白丰富，少油版更健康' },
    '番茄炒蛋': { cal: 350, tip: '营养均衡，家常健康菜' },
    '糖醋排骨': { cal: 580, tip: '糖分较高，偶尔食用' },
    '水煮鱼': { cal: 480, tip: '蛋白质丰富，注意油量' },
    '火锅': { cal: 800, tip: '选择清汤锅底，控制蘸料' },
    '烧烤': { cal: 750, tip: '高温烤制产生有害物质，适量食用' },
    '披萨': { cal: 680, tip: '芝士热量高，选择薄底更健康' },
    '汉堡': { cal: 650, tip: '快餐热量高，搭配沙拉均衡' },
    '寿司': { cal: 320, tip: '生鲜优质蛋白，控制酱油用量' },
    '拉面': { cal: 550, tip: '汤底盐分高，少喝汤' },
    '煎饼果子': { cal: 480, tip: '早餐优选，注意酱料用量' },
    '包子': { cal: 350, tip: '荤素搭配，控制数量' },
    '粥': { cal: 200, tip: '易消化，适合早餐或病后恢复' },
    '面条': { cal: 450, tip: '选择全麦面条，搭配蔬菜' },
    '米饭': { cal: 350, tip: '主食基础，搭配蛋白质和蔬菜' },
    '面包': { cal: 380, tip: '选择全麦面包，避免过多果酱' },
    '蛋糕': { cal: 450, tip: '糖分脂肪双高，偶尔食用' },
    '冰淇淋': { cal: 380, tip: '夏季解暑，控制分量' },
    '水果': { cal: 120, tip: '维生素丰富，注意糖分' },
    '酸奶': { cal: 180, tip: '益生菌有益肠道，选择无糖' },
    '豆浆': { cal: 150, tip: '植物蛋白丰富，早餐好选择' },
    '油条': { cal: 520, tip: '油炸热量高，偶尔食用' },
    '煎蛋': { cal: 280, tip: '优质蛋白，少油煎制' },
    '培根': { cal: 450, tip: '加工肉类，适量食用' },
    '香肠': { cal: 480, tip: '盐分脂肪高，偶尔食用' },
    '牛排': { cal: 550, tip: '优质蛋白，选择瘦肉部位' },
    '烤鸡': { cal: 480, tip: '去皮食用，减少脂肪摄入' },
    '烤鸭': { cal: 520, tip: '皮脂肪高，适量食用' },
    '酸菜鱼': { cal: 420, tip: '酸辣开胃，注意油量' },
    '干锅': { cal: 680, tip: '重油重辣，偶尔食用' },
    '煲仔饭': { cal: 650, tip: '锅巴香脆，控制分量' },
    '肠粉': { cal: 280, tip: '清淡可口，早餐好选择' },
    '叉烧': { cal: 480, tip: '蜜汁糖分高，适量食用' },
    '烧鹅': { cal: 550, tip: '皮脆肉嫩，控制分量' },
    '白切鸡': { cal: 350, tip: '清淡健康，优质蛋白' },
    '凉拌菜': { cal: 200, tip: '清爽低脂，夏季首选' },
    '汤': { cal: 180, tip: '营养丰富，饭前喝汤有助控制食量' }
  };

  // 模糊匹配
  for (const [key, value] of Object.entries(calorieDB)) {
    if (dishName.includes(key) || key.includes(dishName)) {
      return value;
    }
  }

  // 默认返回
  return { cal: 500, tip: '均衡饮食，搭配蔬菜和蛋白质' };
}

function parseCalorie(calorie) {
  if (calorie === undefined || calorie === null || calorie === '') return 0;
  const match = String(calorie).match(/\d+(\.\d+)?/);
  return match ? Math.round(Number(match[0])) : 0;
}

function normalizeDishCandidates(baiduResult) {
  const list = Array.isArray(baiduResult && baiduResult.result) ? baiduResult.result : [];
  return list
    .filter(item => item && item.name)
    .map(item => {
      const name = item.name || '未知菜品';
      const info = getCalorieInfo(name);
      const apiCal = parseCalorie(item.calorie);
      return {
        name,
        cal: apiCal > 0 ? apiCal : info.cal,
        tip: info.tip,
        confidence: Number(item.probability || 0),
        calorieText: item.calorie || ''
      };
    });
}

function buildRecognitionResponse(baiduResult) {
  const candidates = normalizeDishCandidates(baiduResult);

  if (candidates.length === 0) {
    return {
      success: true,
      data: {
        name: '请手动填写',
        cal: 0,
        tip: '没有识别到明确菜品，请点击编辑按钮手动填写名称和热量',
        confidence: 0,
        source: 'empty',
        candidates: []
      }
    };
  }

  const best = candidates[0];
  const lowConfidence = best.confidence > 0 && best.confidence < 0.55;

  return {
    success: true,
    data: {
      name: best.name,
      cal: best.cal,
      tip: lowConfidence
        ? '识别置信度偏低，建议从候选中选择或手动编辑'
        : best.tip,
      confidence: best.confidence,
      source: 'baidu',
      candidates
    }
  };
}

// ==================== API路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * 食物识别API - 接收图片文件
 * POST /api/recognize
 * Content-Type: multipart/form-data
 * Field: image (file)
 */
app.post('/api/recognize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '请上传图片文件' 
      });
    }

    // 读取图片并转为base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString('base64');

    const baiduResult = await recognizeDish(imageBase64);

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json(buildRecognitionResponse(baiduResult));

  } catch (error) {
    console.error('识别失败:', error);
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: '识别服务暂时不可用，请稍后重试'
    });
  }
});

/**
 * 食物识别API - 接收base64图片
 * POST /api/recognize/base64
 * Body: { image: "base64字符串" }
 */
app.post('/api/recognize/base64', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        error: '请提供图片base64数据'
      });
    }

    // 移除base64前缀
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const baiduResult = await recognizeDish(base64Data);

    res.json(buildRecognitionResponse(baiduResult));

  } catch (error) {
    console.error('识别失败:', error);
    res.status(500).json({
      success: false,
      error: error.response && error.response.data
        ? JSON.stringify(error.response.data)
        : error.message || '识别服务暂时不可用'
    });
  }
});

/**
 * 获取菜品热量信息
 * GET /api/calorie?name=菜品名称
 */
app.get('/api/calorie', (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({
      success: false,
      error: '请提供菜品名称'
    });
  }

  const info = getCalorieInfo(name);
  res.json({
    success: true,
    data: info
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: error.message || '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🔑 已加载百度AI密钥');
  console.log(`🍽️ 食物AI识别服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 API测试: http://localhost:${PORT}/health`);
});
