#!/usr/bin/env python3
"""
YouTube Notes 아이콘 생성 스크립트
필요: pip install Pillow
"""
from PIL import Image, ImageDraw, ImageFont
import os

# images 폴더 생성
os.makedirs('images', exist_ok=True)

sizes = [16, 48, 128]
colors = {
    'bg': '#FF0000',      # YouTube 빨강
    'text': '#FFFFFF'     # 흰색
}

for size in sizes:
    # 새 이미지 생성 (배경색)
    img = Image.new('RGB', (size, size), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    # 텍스트 그리기
    try:
        # 시스템 폰트 사용 시도
        font_size = max(8, int(size * 0.5))
        font = ImageFont.truetype('arial.ttf', font_size)
    except:
        # 기본 폰트 사용
        font = ImageFont.load_default()
    
    # "YN" (YouTube Notes) 텍스트 중앙 정렬
    bbox = draw.textbbox((0, 0), 'YN', font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    draw.text((x, y), 'YN', fill=colors['text'], font=font)
    
    # 저장
    filename = f'images/icon-{size}.png'
    img.save(filename, 'PNG')
    print(f'✓ {filename} 생성됨')

print('\n모든 아이콘이 생성되었습니다!')
