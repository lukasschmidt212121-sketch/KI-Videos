"""usage: python contact.py out.jpg a.jpg b.jpg ... (rows of 5, each scaled to 270 px wide, frame number labels)"""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert("RGB") for f in files]
w = 270; h = int(ims[0].height * w / ims[0].width); cols = min(5, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "black"); d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im.resize((w, h)), (x, y)); d.text((x + 6, y + 6), f.split("_")[-1].split(".")[0], fill="yellow")
sheet.save(out, quality=88)
