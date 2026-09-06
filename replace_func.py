# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    c = f.read()

idx = c.find("const handleImageUpload")
if idx >= 0:
    # Get the exact old function text
    old_start = idx
    # Find the end of the function (look for }, [session]);)
    end_marker = "}, [session]);"
    end_idx = c.find(end_marker, idx)
    if end_idx >= 0:
        end_idx += len(end_marker)
        old_func = c[old_start:end_idx]
        print("Found old function:")
        print(repr(old_func[:200]))
        
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
        
        c = c[:old_start] + new_func + c[end_idx:]
        print("Replaced successfully")
    else:
        print("End marker not found")
else:
    print("Function not found")

with open("src/components/quick-record.tsx", "w", encoding="utf-8") as f:
    f.write(c)
