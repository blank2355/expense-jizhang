/**
 * 免费 OCR 服务 - 使用 Tesseract.js（浏览器本地运行，无需 API Key）
 */

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * 从图片中提取文本（使用 Tesseract.js）
 */
export async function recognizeImage(image: File | Blob): Promise<OCRResult> {
  // 动态导入 Tesseract.js（避免 SSR 问题）
  const Tesseract = await import('tesseract.js');
  
  const result = await Tesseract.default.recognize(image, 'chi_sim+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log('[OCR] 识别进度:', Math.round(m.progress * 100) + '%');
      }
    },
  });
  
  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  };
}

/**
 * 从 Base64 图片中提取文本
 */
export async function recognizeImageFromBase64(base64: string, mimeType?: string): Promise<OCRResult> {
  const Tesseract = await import('tesseract.js');
  
  const result = await Tesseract.default.recognize(base64, 'chi_sim+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log('[OCR] 识别进度:', Math.round(m.progress * 100) + '%');
      }
    },
  });
  
  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  };
}

/**
 * 解析 OCR 结果，提取支付信息
 */
export function parseOCRResult(text: string): {
  amount: number | null;
  category: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  date: string | null;
  time: string | null;
  note: string | null;
  confidence: number;
} {
  const result = {
    amount: null,
    category: null,
    merchant: null,
    paymentMethod: null,
    date: null,
    time: null,
    note: null,
    confidence: 0,
  };
  
  // 提取金额
  const amountMatch = text.match(/(\d+\.?\d*)\s*(元|块|rmb|cny)?/i);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1]);
  }
  
  // 提取日期
  const dateMatch = text.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2}日?)|(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  if (dateMatch) {
    result.date = dateMatch[0].replace(/[年月]/g, '-').replace(/日/g, '').padEnd(10, '-01');
  }
  
  // 提取时间
  const timeMatch = text.match(/(\d{1,2}[:：]\d{2})/);
  if (timeMatch) {
    result.time = timeMatch[1].replace('：', ':');
  }
  
  // 提取商家
  const merchantPatterns = [
    /商\s*家[：:]\s*(\S+)/,
    /收款方[：:]\s*(\S+)/,
    /商户[：:]\s*(\S+)/,
  ];
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.merchant = match[1];
      break;
    }
  }
  
  // 自动分类
  const lowerText = text.toLowerCase();
  if (lowerText.includes('餐饮') || lowerText.includes('吃饭') || lowerText.includes('餐厅') || lowerText.includes('咖啡')) {
    result.category = '餐饮';
  } else if (lowerText.includes('交通') || lowerText.includes('打车') || lowerText.includes('地铁') || lowerText.includes('公交')) {
    result.category = '交通';
  } else if (lowerText.includes('住宿') || lowerText.includes('酒店')) {
    result.category = '住宿';
  } else if (lowerText.includes('购物') || lowerText.includes('商店') || lowerText.includes('超市')) {
    result.category = '购物';
  } else if (lowerText.includes('娱乐') || lowerText.includes('电影') || lowerText.includes('游戏')) {
    result.category = '娱乐';
  }
  
  result.confidence = 0.7; // Tesseract 的 confidence 在 0-100 之间
  
  return result;
}
