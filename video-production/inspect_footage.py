import os, sys, subprocess, re, json
from pathlib import Path
sys.path.insert(0, r'C:\Users\biswa\AppData\Local\Temp\omnirush\video-tools')
import imageio_ffmpeg
from PIL import Image, ImageDraw
ROOT = Path(__file__).parent
OUT = ROOT / 'inspection'
OUT.mkdir(exist_ok=True)
SOURCE = Path(r'C:\Users\biswa\Videos\hospital video')
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
manifest = []
for i, path in enumerate(sorted(SOURCE.glob('*.mp4'))):
    info = subprocess.run([ffmpeg, '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    duration = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', info)
    if not duration:
        raise RuntimeError('Cannot determine duration: ' + path.name)
    h,m,s = map(float, duration.groups())
    seconds = h*3600+m*60+s
    rows = [line.strip() for line in info.splitlines() if 'Stream #' in line]
    manifest.append({'file':str(path),'seconds':seconds,'streams':rows})
    sheet = Image.new('RGB',(1200,750),'#102631')
    draw = ImageDraw.Draw(sheet)
    for j, frac in enumerate([.10,.30,.50,.70,.85,.95]):
        t = seconds*frac
        target = OUT / f'{i+1:02d}-{j+1}.jpg'
        subprocess.run([ffmpeg,'-v','error','-y','-ss',str(t),'-i',str(path),'-frames:v','1','-vf','scale=580:330:force_original_aspect_ratio=decrease',str(target)],check=True)
        image=Image.open(target)
        x=(j%2)*600; y=(j//2)*250
        image.thumbnail((580,218))
        sheet.paste(image,(x,y+28))
        draw.text((x+8,y+6),f'{path.name} | {t:.1f}s',fill='white')
    sheet.save(OUT/f'{i+1:02d}-contact-sheet.jpg')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
