# -*- coding: utf-8 -*-
import sys

with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_import = "import { toast } from '\''sonner'\'';"
new_import = "import { toast } from '\''sonner'\'';\nimport { recognizeImage, parseOCRResult } from '\''@/lib/ocr'\'';"
content = content.replace(old_import, new_import)

with open("src/components/quick-record.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added OCR import")
