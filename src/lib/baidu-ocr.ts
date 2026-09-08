/**
 * 百度 OCR API 集成
 * 优先使用百度 OCR，免费额度用完后自动切换 DeepSeek
 */

export interface BaiduOCRResult {
  text: string;
  words_result: string[];
  confidence?: number;
}

export interface AnalyzeResult {
  amount: number | null;
  category: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  date: string | null;
  time: string | null;
  note: string | null;
  confidence: number;
}

/**
 * 获取百度 AccessToken
 */
async function getBaiduAccessToken(): Promise<string | null> {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.log('[Baidu OCR] API Key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    );
    const data = await response.json();

    if (data.access_token) {
      return data.access_token;
    } else {
      console.error('[Baidu OCR] Failed to get access token:', data);
      return null;
    }
  } catch (error) {
    console.error('[Baidu OCR] Error getting access token:', error);
    return null;
  }
}

/**
 * 调用百度通用文字识别(高精度版)
 */
export async function recognizeWithBaidu(imageBase64: string): Promise<AnalyzeResult | null> {
  const accessToken = await getBaiduAccessToken();
  if (!accessToken) {
    console.log('[Baidu OCR] No access token, will use DeepSeek');
    return null;
  }

  try {
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurateBasic?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `image=${encodeURIComponent(imageBase64)}`,
    });

    const data = await response.json();

    if (data.words_result) {
      // 提取所有文字
      const text = data.words_result.map((item: any) => item.words).join('\n');
      console.log('[Baidu OCR] Extracted text:', text.substring(0, 200));
      return parseOCRResult(text);
    } else {
      console.error('[Baidu OCR] Error:', data);
      return null;
    }
  } catch (error) {
    console.error('[Baidu OCR] Error:', error);
    return null;
  }
}

/**
 * 解析 OCR 结果，提取支付信息
 */
export function parseOCRResult(text: string): AnalyzeResult {
  const result: AnalyzeResult = {
    amount: null,
    category: null,
    merchant: null,
    paymentMethod: null,
    date: null,
    time: null,
    note: null,
    confidence: 0.7,
  };

  // 提取金额
  const amountMatch = text.match(/(\d+\.?\d*)\s*(元|块|rmb|cny|￥)?/i);
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
    result.category = 'food';
  } else if (lowerText.includes('交通') || lowerText.includes('打车') || lowerText.includes('地铁') || lowerText.includes('公交')) {
    result.category = 'transport';
  } else if (lowerText.includes('住宿') || lowerText.includes('酒店')) {
    result.category = 'hotel';
  } else if (lowerText.includes('购物') || lowerText.includes('商店') || lowerText.includes('超市')) {
    result.category = 'shopping';
  } else if (lowerText.includes('娱乐') || lowerText.includes('电影') || lowerText.includes('游戏')) {
    result.category = 'entertainment';
  }

  return result;
}
