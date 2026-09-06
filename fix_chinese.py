# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix corrupted Chinese characters
replacements = [
    ('èè¯†åå¨ä»¶', '获取识别结果失败'),
    ('AI å´è¯†ååˆ«ä»˜æ¬¾ä¿¡æ?', 'AI 已识别付款信息'),
    ('è¾åé', '请输入金额'),
    ('ç³»æœªå°±', '系统未就绪'),
    ('è´¦æ', '记账成功'),
    ('ä¿®å¤±è´¥ï¼ï¼è¯·é«è¯', '保存失败，请重试'),
    ('æ®ç½', '网络错误'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Fixed: {old[:20]}... -> {new}")

with open("src/components/quick-record.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
