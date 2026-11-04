"""Render a 1080x1080 square Facebook ad video from the hindi manifest.

Combines recorded hospital software demo clips with animated Hindi text plates.
Designed for Meta (Facebook/Instagram) feed placement.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

TOOLS = Path(r"C:\Users\biswa\AppData\Local\Temp\omnirush\video-tools")
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import imageio_ffmpeg  # type: ignore
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FPS = 1080, 1080, 30
NAVY = (12, 28, 48)
NAVY_HEX = "0x0c1c30"
TEAL = (45, 197, 178)
TEAL_HEX = "0x2dc5b2"
IVORY = (244, 241, 232)
RED_CTA = (220, 53, 69)
RED_HEX = "0xdc3545"


def _font_file(preference: str) -> str:
    candidates = {
        "Nirmala UI": [
            Path(r"C:\Windows\Fonts\NirmalaUI.ttf"),
            Path(r"C:\Windows\Fonts\Nirmala.ttf"),
            Path(r"C:\Windows\Fonts\Nirmala.ttc"),
        ],
        "Segoe UI": [Path(r"C:\Windows\Fonts\segoeui.ttf")],
    }
    for path in candidates.get(preference, []) + candidates["Nirmala UI"] + candidates["Segoe UI"]:
        if path.exists():
            return path.as_posix().replace(":", r"\:")
    raise RuntimeError("could not find Nirmala UI or Segoe UI")


def _pil_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = (
        (r"C:/Windows/Fonts/NirmalaUI-Bold.ttf", r"C:/Windows/Fonts/NirmalaUI.ttf",
         r"C:/Windows/Fonts/segoeuib.ttf", r"C:/Windows/Fonts/segoeui.ttf")
        if bold
        else (r"C:/Windows/Fonts/NirmalaUI.ttf", r"C:/Windows/Fonts/Nirmala.ttf",
              r"C:/Windows/Fonts/segoeui.ttf", r"C:/Windows/Fonts/arial.ttf")
    )
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def _num(value: Any, label: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be numeric") from exc
    if result < 0:
        raise ValueError(f"{label} must not be negative")
    return result


def _textfile(text: str) -> str:
    path = ROOT / "assets" / ("fb-copy-" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] + ".txt")
    path.write_text(text, encoding="utf-8")
    return path.as_posix().replace(":", r"\:")


def _run(command: list[str], label: str) -> None:
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       text=True, encoding="utf-8", errors="replace")
    except subprocess.CalledProcessError as exc:
        detail = " | ".join((exc.stderr or "").strip().splitlines()[-3:])
        raise RuntimeError(f"{label} failed: {detail[-500:]}") from exc


# ── Background plate generators ──────────────────────────────────────

def _generate_plate(scene: dict, index: int, data: dict) -> Path:
    """Generate a 1080x1080 background plate for text-only scenes."""
    img = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        c = tuple(int(NAVY[i] * (1 - t * 0.3)) for i in range(3))
        draw.line((0, y, WIDTH, y), fill=c)

    kind = scene.get("kind", "plate")
    accent = scene.get("accent", "")
    headline = scene.get("headline", "")
    subtext = scene.get("subtext", "")

    # Top accent bar
    draw.rectangle((0, 0, WIDTH, 6), fill=TEAL)

    # Load logo if available
    logo_path = data.get("logo")
    if logo_path and Path(logo_path).exists():
        try:
            logo = Image.open(logo_path).convert("RGBA")
            logo.thumbnail((120, 120))
            # Center logo at top
            lx = (WIDTH - logo.width) // 2
            img.paste(logo, (lx, 40), logo)
        except Exception:
            pass

    # Brand name
    brand = data.get("brand_name", "Shree Kamal Hospital ERP")
    brand_font = _pil_font(28, bold=True)
    bbox = draw.textbbox((0, 0), brand, font=brand_font)
    bw = bbox[2] - bbox[0]
    draw.text(((WIDTH - bw) // 2, 170), brand, font=brand_font, fill=TEAL)

    if kind == "cta":
        # CTA end card — red banner + big phone number
        draw.rectangle((40, 320, WIDTH - 40, 520), fill=RED_CTA)
        draw.rounded_rectangle((40, 320, WIDTH - 40, 520), radius=16, fill=RED_CTA)
        headline_font = _pil_font(48, bold=True)
        hbbox = draw.textbbox((0, 0), headline, font=headline_font)
        hw = hbbox[2] - hbbox[0]
        draw.text(((WIDTH - hw) // 2, 370), headline, font=headline_font, fill=(255, 255, 255))

        sub_font = _pil_font(56, bold=True)
        lines = subtext.split("\n")
        y = 580
        for line in lines:
            lbbox = draw.textbbox((0, 0), line, font=sub_font)
            lw = lbbox[2] - lbbox[0]
            draw.text(((WIDTH - lw) // 2, y), line, font=sub_font, fill=IVORY)
            y += 80

        # Tagline at bottom
        tagline = data.get("brand_tagline", "Life Matters")
        tf = _pil_font(24)
        tbbox = draw.textbbox((0, 0), tagline, font=tf)
        tw = tbbox[2] - tbbox[0]
        draw.text(((WIDTH - tw) // 2, HEIGHT - 60), tagline, font=tf, fill=(170, 190, 198))

    else:
        # Standard plate — headline + subtext centered
        headline_font = _pil_font(52, bold=True)
        lines = headline.split("\n")
        total_h = len(lines) * 68
        start_y = (HEIGHT - total_h) // 2 - 60
        for line in lines:
            lbbox = draw.textbbox((0, 0), line, font=headline_font)
            lw = lbbox[2] - lbbox[0]
            draw.text(((WIDTH - lw) // 2, start_y), line, font=headline_font, fill=IVORY)
            start_y += 68

        if subtext:
            sub_font = _pil_font(32)
            sub_lines = subtext.split("\n")
            sub_y = start_y + 40
            for sl in sub_lines:
                sbbox = draw.textbbox((0, 0), sl, font=sub_font)
                sw = sbbox[2] - sbbox[0]
                draw.text(((WIDTH - sw) // 2, sub_y), sl, font=sub_font, fill=TEAL)
                sub_y += 48

        # Accent label
        if accent:
            af = _pil_font(18, bold=True)
            draw.text((40, HEIGHT - 50), accent, font=af, fill=(100, 130, 140))

    # Bottom teal line
    draw.rectangle((0, HEIGHT - 6, WIDTH, HEIGHT), fill=TEAL)

    out = ROOT / "assets" / f"fb-bg-{index:02d}.png"
    img.save(out, "PNG")
    return out


def _generate_product_bg(scene: dict, index: int, data: dict) -> Path:
    """Generate a 1080x1080 background plate for product footage scenes."""
    img = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
    draw = ImageDraw.Draw(img)

    # Gradient
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        c = tuple(int(NAVY[i] * (1 - t * 0.3)) for i in range(3))
        draw.line((0, y, WIDTH, y), fill=c)

    # Top accent bar
    draw.rectangle((0, 0, WIDTH, 4), fill=TEAL)

    # Brand name small top-left
    brand_font = _pil_font(22, bold=True)
    draw.text((30, 16), data.get("brand_name", "Shree Kamal Hospital ERP"), font=brand_font, fill=TEAL)

    # Bottom caption area placeholder (ffmpeg overlays the real text)
    draw.rectangle((0, HEIGHT - 200, WIDTH, HEIGHT), fill=(7, 20, 37))
    draw.rectangle((0, HEIGHT - 200, WIDTH, HEIGHT - 196), fill=TEAL)

    # Footage area frame
    draw.rounded_rectangle((30, 50, WIDTH - 30, HEIGHT - 210), radius=12, outline=(39, 70, 85), width=2)

    # Bottom teal line
    draw.rectangle((0, HEIGHT - 4, WIDTH, HEIGHT), fill=TEAL)

    out = ROOT / "assets" / f"fb-bg-{index:02d}.png"
    img.save(out, "PNG")
    return out


# ── Scene renderers ──────────────────────────────────────────────────

def _render_plate_scene(ffmpeg: str, scene: dict, index: int, work: Path, bg: Path, font: str) -> Path:
    """Render a text-only plate scene with fade-in/out."""
    duration = _num(scene["duration"], "duration")
    output = work / f"fb-scene-{index:02d}.mp4"

    command = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-loop", "1", "-i", str(bg),
        "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo",
        "-filter_complex",
        f"[0:v]scale={WIDTH}:{HEIGHT},format=yuv420p,"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={duration - 0.4:.3f}:d=0.4[v]",
        "-map", "[v]", "-map", "1:a",
        "-t", f"{duration:.3f}", "-r", str(FPS),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "fast",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k",
        "-shortest", str(output),
    ]
    _run(command, f"plate scene {index + 1}")
    return output


def _render_product_scene(ffmpeg: str, scene: dict, index: int, work: Path, bg: Path, font: str) -> Path:
    """Render a product footage scene with caption overlay."""
    duration = _num(scene["duration"], "duration")
    start = _num(scene.get("start", 0), "start")
    source = Path(str(scene["source"]))
    if not source.exists():
        raise ValueError(f"scene {index + 1} source not found: {source}")

    caption = str(scene.get("caption", ""))
    caption_file = _textfile(caption)
    output = work / f"fb-scene-{index:02d}.mp4"

    # Product footage: scale into a centered box (1020x620) on the 1080x1080 canvas
    alpha = f"if(lt(t\\,0.35)\\,t/0.35\\,if(lt(t\\,{max(0.36, duration - 0.35):.3f})\\,1\\,({duration:.3f}-t)/0.35))"

    graph = (
        # Scale source footage to fit the center area
        f"[1:v]fps=30,scale=1020:620:force_original_aspect_ratio=decrease,"
        f"pad=1020:620:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"zoompan=z='1+0.03*on/({duration * FPS:.3f})':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1020x620:fps=30,"
        f"setsar=1,format=yuva420p,"
        f"fade=t=in:st=0:d=0.3:alpha=1,fade=t=out:st={max(0, duration - 0.3):.3f}:d=0.3:alpha=1[footage];"
        # Background
        f"[0:v]scale={WIDTH}:{HEIGHT},format=yuva420p[base];"
        # Overlay footage on background
        f"[base][footage]overlay=x=30:y=60:format=auto:shortest=1[plate];"
        # Caption overlay
        f"[plate]drawbox=x=30:y={HEIGHT - 200}:w=1020:h=180:color=0x071426@0.90:t=fill,"
        f"drawbox=x=30:y={HEIGHT - 200}:w=6:h=180:color={TEAL_HEX}:t=fill,"
        f"drawtext=fontfile='{font}':textfile='{caption_file}':expansion=none:"
        f"x=60:y={HEIGHT - 180}:fontsize=36:fontcolor=0xf4f1e8:line_spacing=10:alpha='{alpha}'[out]"
    )

    command = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-loop", "1", "-i", str(bg),
        "-ss", str(start), "-t", f"{duration:.3f}", "-i", str(source),
        "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo",
        "-filter_complex", graph,
        "-map", "[out]", "-map", "2:a",
        "-t", f"{duration:.3f}", "-r", str(FPS),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "fast",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k",
        "-shortest", str(output),
    ]
    _run(command, f"product scene {index + 1}")
    return output


def _verify(ffmpeg: str, output: Path) -> str:
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(output), "-f", "null", "-"],
        check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", errors="replace",
    )
    match = re.search(r"Duration:\s*([^,]+).*?Video:.*?(\d{2,5})x(\d{2,5})", result.stderr, re.S)
    if not match:
        raise RuntimeError("verification could not read duration or dimensions")
    return f"duration {match.group(1).strip()} | {match.group(2)}x{match.group(3)}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="facebook-ad-hindi.json")
    args = parser.parse_args()

    try:
        manifest = ROOT / args.manifest
        data = json.loads(manifest.read_text(encoding="utf-8"))
        scenes = data.get("scenes")
        if not isinstance(scenes, list) or not scenes:
            raise ValueError("manifest must contain a non-empty scenes list")

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        font = _font_file(str(data.get("font_preference", "Nirmala UI")))
        work = ROOT / "work" / "facebook-ad"
        work.mkdir(parents=True, exist_ok=True)

        # Generate artwork backgrounds
        print("Generating background plates...")
        backgrounds: list[Path] = []
        for i, scene in enumerate(scenes):
            kind = scene.get("kind", "product")
            if kind in ("plate", "cta"):
                bg = _generate_plate(scene, i, data)
            else:
                bg = _generate_product_bg(scene, i, data)
            backgrounds.append(bg)

        # Render each scene
        print("Rendering scenes...")
        rendered: list[Path] = []
        for i, scene in enumerate(scenes):
            kind = scene.get("kind", "product")
            if kind in ("plate", "cta"):
                out = _render_plate_scene(ffmpeg, scene, i, work, backgrounds[i], font)
            else:
                out = _render_product_scene(ffmpeg, scene, i, work, backgrounds[i], font)
            rendered.append(out)
            print(f"  Scene {i + 1}/{len(scenes)} ({scene.get('name', '')}) done")

        # Concatenate all scenes
        print("Concatenating...")
        output = ROOT / str(data.get("output", "output/facebook-ad-hindi-square.mp4"))
        output.parent.mkdir(parents=True, exist_ok=True)
        concat = work / "concat.txt"
        concat.write_text(
            "".join(f"file '{p.as_posix().replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'\n"
                    for p in rendered),
            encoding="utf-8",
        )
        _run([
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(concat),
            "-c", "copy", "-movflags", "+faststart", str(output),
        ], "concat")

        # Clean up temp text files
        for path in (ROOT / "assets").glob("fb-copy-*.txt"):
            path.unlink(missing_ok=True)

        info = _verify(ffmpeg, output)
        print(f"\n[DONE] Rendered {len(scenes)} scenes: {output}")
        print(f"   {info}")
        return 0

    except (OSError, KeyError, TypeError, ValueError, RuntimeError) as exc:
        print(f"Render failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
