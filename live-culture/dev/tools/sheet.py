# contact sheet: python3 -I tools/sheet.py out.png cols file1 file2 ...
import sys
from PIL import Image
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (cols * w + (cols - 1) * 8, rows * h + (rows - 1) * 8), (40, 40, 40))
for i, im in enumerate(ims):
    s.paste(im.resize((w, h)), ((i % cols) * (w + 8), (i // cols) * (h + 8)))
s.save(out); print(s.size)
