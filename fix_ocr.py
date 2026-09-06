import sys
f = open("src/components/quick-record.tsx", "rb")
c = f.read()
f.close()
old = b"const data = await response.json();"
new_code = b"let data; try{data=await response.json();}catch(e){data={error:\x27JSON parse error\x27};} console.log(\x27[OCR] status:\x27,response.status,\x27data:\x27,JSON.stringify(data).substring(0,200),\x27ocr:\x27,ocrText?.substring(0,50));"
c = c.replace(old, new_code)
f = open("src/components/quick-record.tsx", "wb")
f.write(c)
f.close()
print("ok")
