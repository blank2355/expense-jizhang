import { NextRequest, NextResponse } from 'next/server';

interface AnalyzeResult {
  amount: number | null;
  category: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  date: string | null;
  time: string | null;
  note: string | null;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: '请上传支付截图' }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = imageBuffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';
    const dataUrl = data:;base64,;

    // 1. 先尝试使用百度 OCR
    const baiduApiKey = process.env.BAIDU_API_KEY;
    if (baiduApiKey) {
      console.log('[Analyze] Trying Baidu OCR...');
      try {
        const accessToken = await getBaiduAccessToken();
        if (accessToken) {
          const baiduResult = await recognizeWithBaidu(base64);
          if (baiduResult && baiduResult.amount) {
            console.log('[Analyze] Baidu OCR success');
            return NextResponse.json({ result: baiduResult });
          }
        }
      } catch (e) {
        console.log('[Analyze] Baidu OCR failed, trying DeepSeek...', e);
      }
    }

    // 2. 百度失败或未配置，使用 DeepSeek
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'AI 识别服务未配置' }, { status: 500 });
    }

    console.log('[Analyze] Using DeepSeek VL Plus');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Bearer ,
      },
      body: JSON.stringify({
        model: 'deepseek-vl-plus',
        messages: [
          {
            role: 'system',
            content: '你是支付截图分析助手。请分析用户上传的支付截图，提取以下信息并返回JSON格式：金额(amount)、分类(category)、商家(merchant)、支付方式(paymentMethod)、日期(date)、时间(time)、备注(note)、置信度(confidence)',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请分析这张支付截图，提取支付信息' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Analyze] DeepSeek API error:', errText);
      return NextResponse.json({ error: 'AI 分析失败，请重试' }, { status: 502 });
    }

    const data = await response.json();
    const textContent = (data.choices?.[0]?.message?.content ?? '').trim();

    let result: any = {
      amount: null,
      category: null,
      merchant: null,
      paymentMethod: null,
      date: null,
      time: null,
      note: null,
      confidence: 0,
    };

    try {
      const jsonMatch = textContent.match(/[\{][\s\S]*[\}]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          amount: typeof parsed.amount === 'number' ? parsed.amount : null,
          category: parsed.category || null,
          merchant: parsed.merchant || null,
          paymentMethod: parsed.paymentMethod || null,
          date: parsed.date || null,
          time: parsed.time || null,
          note: parsed.note || null,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        };
      }
    } catch {
      // parse failed
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[Analyze] Error:', error);
    return NextResponse.json({ error: '分析失败，请重试' }, { status: 500 });
  }
}

async function getBaiduAccessToken(): Promise<string | null> {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  if (!apiKey || !secretKey) return null;

  try {
    const response = await fetch(
      https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=&client_secret=
    );
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function recognizeWithBaidu(base64: string): Promise<any> {
  const accessToken = await getBaiduAccessToken();
  if (!accessToken) return null;

  const response = await fetch(
    https://aip.baidubce.com/rest/2.0/ocr/v1/accurateBasic?access_token=,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: image=,
    }
  );
  const data = await response.json();
  if (data.words_result) {
    const text = data.words_result.map((item: any) => item.words).join('\n');
    return parseOCRResult(text);
  }
  return null;
}

function parseOCRResult(text: string): any {
  const result: any = { amount: null, category: null, merchant: null, paymentMethod: null, date: null, time: null, note: null, confidence: 0.7 };
  const amountMatch = text.match(/(\d+\.?\d*)\s*(元|块|rmb|cny|￥)?/i);
  if (amountMatch) result.amount = parseFloat(amountMatch[1]);
  const dateMatch = text.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2}日?)|(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  if (dateMatch) result.date = dateMatch[0].replace(/[年月]/g, '-').replace(/日/g, '').padEnd(10, '-01');
  const timeMatch = text.match(/(\d{1,2}[:：]\d{2})/);
  if (timeMatch) result.time = timeMatch[1].replace('：', ':');
  const lowerText = text.toLowerCase();
  if (lowerText.includes('餐饮') || lowerText.includes('吃饭') || lowerText.includes('餐厅')) result.category = 'food';
  else if (lowerText.includes('交通') || lowerText.includes('打车') || lowerText.includes('地铁')) result.category = 'transport';
  else if (lowerText.includes('住宿') || lowerText.includes('酒店')) result.category = 'hotel';
  else if (lowerText.includes('购物') || lowerText.includes('商店') || lowerText.includes('超市')) result.category = 'shopping';
  else if (lowerText.includes('娱乐') || lowerText.includes('电影') || lowerText.includes('游戏')) result.category = 'entertainment';
  return result;
}
