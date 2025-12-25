#!/usr/bin/env python3
"""
YouTube Notes 아이콘 생성 스크립트
YouTube 로고 + 노트 아이콘 결합
필요: pip install Pillow
"""
from PIL import Image, ImageDraw, ImageFont
import os

# images 폴더 생성
os.makedirs('images', exist_ok=True)

sizes = [16, 48, 128]

for size in sizes:
    # 새 이미지 생성 (투명 배경)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # YouTube 빨강 재생 버튼 (왼쪽 하단)
    yt_size = int(size * 0.6)
    yt_x = int(size * 0.05)
    yt_y = int(size * 0.35)
    
    # 빨간 둥근 사각형
    draw.rounded_rectangle(
        [yt_x, yt_y, yt_x + yt_size, yt_y + yt_size],
        radius=int(yt_size * 0.15),
        fill='#FF0000'
    )
    
    # 흰색 재생 버튼 삼각형
    t_left = yt_x + yt_size * 0.3
    t_top = yt_y + yt_size * 0.28
    t_bottom = yt_y + yt_size * 0.72
    t_right = yt_x + yt_size * 0.75
    t_mid = (t_top + t_bottom) / 2
    draw.polygon(
        [(t_left, t_top), (t_right, t_mid), (t_left, t_bottom)],
        fill='#FFFFFF'
    )
    
    # 노트 아이콘 (우측 상단)
    note_size = int(size * 0.5)
    note_x = int(size * 0.45)
    note_y = int(size * 0.05)
    
    # 노트 용지 (흰색 둥근 사각형)
    draw.rounded_rectangle(
        [note_x, note_y, note_x + note_size, note_y + note_size],
        radius=int(note_size * 0.1),
        fill='#FFFFFF',
        outline='#333333',
        width=max(1, int(size * 0.02))
    )
    
    # 노트 선들
    line_count = 3 if size >= 48 else 2
    line_spacing = note_size / (line_count + 1)
    line_margin = note_size * 0.15
    for i in range(1, line_count + 1):
        line_y = note_y + line_spacing * i
        draw.line(
            [(note_x + line_margin, line_y), (note_x + note_size - line_margin, line_y)],
            fill='#666666',
            width=max(1, int(size * 0.015))
        )
    
    # 저장
    filename = f'images/icon-{size}.png'
    img.save(filename, 'PNG')
    print(f'✓ {filename} 생성됨 (YouTube + Notes)')

print('\n모든 아이콘이 생성되었습니다!')
