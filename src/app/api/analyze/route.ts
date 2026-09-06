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

const SYSTEM_PROMPT = `你是支付截图分析助手。请分析用户上传的支付截图，提取以下信息并返回JSON格式。
规则：
1. 金额(amount)：提取支付金额，纯数字，单位为元。如显示币种不是人民币，请换算为人民币（大致汇率即可）。
2. 分类(category)：仅限以下选项之一：餐饮、交通、住宿、购物、娱乐、票务、办公、其他
3. 商家(merchant)：商家名称或收款方
4. 支付方式(paymentMethod)：仅限以下选项之一：微信支付、支付宝、花呗、信用卡、储蓄卡、现金、Apple Pay、其他
5. 日期(date)：格式 YYYY-MM-DD，如果截图中没有日期则使用今天
6. 时间(time)：格式 HH:MM，如果截图中没有时间则为null
7. 备注(note)：简短描述，如"咖啡"、"打车"等
8. 置信度(confidence)：0-1之间，表示识别的可信程度

请严格返回JSON格式，不要添加其他文字：
{"amount":35.50,"category":"餐饮","merchant":"星巴克","paymentMethod":"微信支付","date":"2024-01-15","time":"14:30","note":"拿铁咖啡","confidence":0.95}

无法识别的字段返回null。如果不是支付截图，所有字段返回null，confidence为0。`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: "请上传支付截图" }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = imageBuffer.toString("base64");
    const mimeType = imageFile.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI 识别服务未配置" }, { status: 500 });
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-vl-plus",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "请分析这张支付截图，提取支付信息。" },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze] DeepSeek API error:", errText);
      return NextResponse.json({ error: "AI 分析失败，请重试" }, { status: 502 });
    }

    const data = await response.json();
    const textContent = (data.choices?.[0]?.message?.content ?? "").trim();

    let result: AnalyzeResult = {
      amount: null, category: null, merchant: null, paymentMethod: null,
      date: null, time: null, note: null, confidence: 0,
    };

    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          amount: typeof parsed.amount === "number" ? parsed.amount : null,
          category: parsed.category || null,
          merchant: parsed.merchant || null,
          paymentMethod: parsed.paymentMethod || null,
          date: parsed.date || null,
          time: parsed.time || null,
          note: parsed.note || null,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        };
      }
    } catch {
      // parse failed
    }

    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "分析失败，请重试" }, { status: 500 });
  }
}
