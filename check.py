with open("src/components/quick-record.tsx", "r", encoding="utf-8") as f:
    c = f.read()
idx = c.find("const handleImageUpload")
print("Found at:", idx)
print(c[idx:idx+600])
