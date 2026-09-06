# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add OCR import
old_import = "import { toast } from '\''sonner'\'';"
new_import = "import { toast } from '\''sonner'\'';\nimport { recognizeImage, parseOCRResult } from '\''@/lib/ocr'\'';"
content = content.replace(old_import, new_import)
print("Added import")

# 2. Replace handleImageUpload - find it by searching for the pattern
start_marker = "const handleImageUpload = useCallback(async (file: File) => {"
end_marker = "}, [session]);"

start_idx = content.find(start_marker)
if start_idx >= 0:
    # Find the end of the function
    end_idx = content.find(end_marker, start_idx)
    if end_idx >= 0:
        end_idx += len(end_marker)
        old_func = content[start_idx:end_idx]
        print(f"Found function at {start_idx}-{end_idx}")
        
        new_func = """const handleImageUpload = useCallback(async (file: File) => {
      setAiLoading(true);
      try {
        const { recognizeImage, parseOCRResult } = await import('@/lib/ocr');
        const ocrResult = await recognizeImage(file);
        if (ocrResult.text.trim()) {
          const parsed = parseOCRResult(ocrResult.text);
          if (parsed.amount) {
            applyAIResult(parsed);
          } else {
            toast.success('已识别文本，请手动填写金额');
            setNote(ocrResult.text.substring(0, 200));
          }
        } else {
          toast.error('未能识别图片内容');
        }
      } catch (e) {
        console.error('[OCR] Error:', e);
        toast.error('OCR 识别失败，请手动输入');
      } finally {
        setAiLoading(false);
      }
    }, []);"""
        
        content = content[:start_idx] + new_func + content[end_idx:]
        print("Replaced function")
    else:
        print("End marker not found")
else:
    print("Start marker not found")

with open("src/components/quick-record.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
