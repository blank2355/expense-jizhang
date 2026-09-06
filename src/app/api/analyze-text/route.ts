import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是支付信息分析助手。用户会给你一段从支付截图上OCR提取的文本内容，请从中提取以下信息并返回JSON格式。
注意：这是OCR提取的原始文本，可能包含噪声、错乱排版、无关信息。你需要从中识别出支付相关的关键信息。
需要提取的字段：
- amount: 金额（纯数字，单位元，如 35.50）
- category: 消费分类，仅限以下选项之一：餐饮/交通/住宿/购物/娱乐/票务/办公/其他
- merchant: 商家名称（如"星巴克"、"滴滴出行"）
- paymentMethod: 支付方式，仅限以下选项之一：微信支付/支付宝/花呗/信用卡/储蓄卡/现金/Apple Pay/其他
- date: 日期（格式 YYYY-MM-DD，如果文本中没有则返回 null）
- time: 时间（格式 HH:MM，如果文本中没有则返回 null）
- note: 备注摘要（简短描述消费内容）
- confidence: 识别置信度（0-1，0.7以下表示不太确定）

请严格按以下JSON格式返回，不要添加任何其他文字：
{"amount":35.50,"category":"餐饮","merchant":"星巴克","paymentMethod":"微信支付","date":"2024-01-15","time":"14:30","note":"拿铁咖啡","confidence":0.95}

如果某个字段无法从文本中识别，返回 null。如果文本完全不是支付相关内容，所有字段返回 null，confidence 设为 0。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text as string;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "请提供文本内容" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI 分析服务未配置" }, { status: 500 });
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `以下是从支付截图上OCR提取的文本内容，请分析并提取支付信息：\n\n${text}` },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze-text] DeepSeek API error:", errText);
      return NextResponse.json({ error: "文本分析失败，请重试" }, { status: 502 });
    }

    const data = await response.json();
    const textContent = (data.choices?.[0]?.message?.content ?? "").trim();

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "无法解析支付信息" }, { status: 400 });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.confidence === 0) {
      return NextResponse.json({ result: null, message: "未检测到支付信息" });
    }

    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error("[analyze-text] Error:", error);
    return NextResponse.json({ error: "文本分析失败，请重试" }, { status: 500 });
  }
}
