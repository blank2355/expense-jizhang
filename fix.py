# -*- coding: utf-8 -*-
with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    c = f.read()
old = "import { toast } from 'sonner';"
new = "import { toast } from 'sonner';\nimport { recognizeImage, parseOCRResult } from '@/lib/ocr';"
c = c.replace(old, new)
with open("src/components/quick-record.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Done")
