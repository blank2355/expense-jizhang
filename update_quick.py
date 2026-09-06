with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Add import for OCR
old_import = "import { toast } from '\''sonner'\'';"
new_import = "import { toast } from '\''sonner'\'';\nimport { recognizeImage, parseOCRResult } from '\''@/lib/ocr'\'';"
c = c.replace(old_import, new_import)

# Replace handleImageUpload
old_func = """const handleImageUpload = useCallback(async (file: File) => {

    setAiLoading(true);

    try {

      const formData = new FormData();

      formData.append('image', file);



      const headers: Record<string, string> = {};

      if (session?.access_token) {

        headers['Authorization'] = `Bearer ${session.access_token}`;

      }



      const res = await fetch('/api/analyze', {

        method: 'POST',

        body: formData,

        headers,

      });



      const data = await res.json();

      if (data.result) {

        applyAIResult(data.result);

      }

    } catch {

      toast.error('AI 识别失败，请手动输入');

    } finally {

      setAiLoading(false);

    }

  }, [session]);"""

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

c = c.replace(old_func, new_func)

with open("src/components/quick-record.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Done")
