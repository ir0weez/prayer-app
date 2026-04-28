from pathlib import Path
from PIL import Image

PROJECT = Path('/home/ubuntu/recreated-prayer-app')
SOURCE = Path('/home/ubuntu/webdev-static-assets/prayercircle-icon.png')
TARGETS = [
    PROJECT / 'assets/images/icon.png',
    PROJECT / 'assets/images/splash-icon.png',
    PROJECT / 'assets/images/favicon.png',
    PROJECT / 'assets/images/android-icon-foreground.png',
]

# Expo accepts PNG launcher/splash assets; 512px is sufficient for preview and keeps checkpoints lean.
with Image.open(SOURCE) as img:
    img = img.convert('RGBA')
    img.thumbnail((512, 512), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    x = (512 - img.width) // 2
    y = (512 - img.height) // 2
    canvas.alpha_composite(img, (x, y))
    for target in TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(target, format='PNG', optimize=True, compress_level=9)
        print(f'{target}: {target.stat().st_size / 1024:.1f}KB')
