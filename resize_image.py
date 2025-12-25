#!/usr/bin/env python3
"""
Resize an image to 640x400 and save as 640.png
- Preserves aspect ratio (no distortion) by letterboxing with white background.
- Usage:
  python resize_image.py [source_path]
  Defaults to images/attachment.png
"""
from PIL import Image
import sys
import os

TARGET_W, TARGET_H = 640, 400
DEFAULT_SRC = os.path.join('images', 'attachment.png')
OUT_PATH = '640.png'


def resize_letterbox(src_path: str, out_path: str):
    if not os.path.exists(src_path):
        print(f"Source image not found: {src_path}")
        return 1
    img = Image.open(src_path).convert('RGB')
    # Compute scale preserving aspect ratio
    src_w, src_h = img.size
    scale = min(TARGET_W / src_w, TARGET_H / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    # Paste centered on white background
    canvas = Image.new('RGB', (TARGET_W, TARGET_H), (255, 255, 255))
    offset_x = (TARGET_W - new_w) // 2
    offset_y = (TARGET_H - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    canvas.save(out_path, 'PNG')
    print(f"✓ Saved {out_path} ({TARGET_W}x{TARGET_H})")
    return 0


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    exit(resize_letterbox(src, OUT_PATH))


if __name__ == '__main__':
    main()
