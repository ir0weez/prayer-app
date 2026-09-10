from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/recreated-prayer-app/assets/images/splash-icon.png')
temporary = source.with_suffix('.optimized.png')
image = Image.open(source).convert('RGBA')
image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
image.save(temporary, format='PNG', optimize=True, compress_level=9)
temporary.replace(source)
print(source, source.stat().st_size)
