"""Generate the graphic plate used behind the animated portrait edit."""

from __future__ import annotations

import json
import sys
import argparse
from pathlib import Path

# The video tool environment supplies Pillow; keep this import path explicit so
# the script is portable when launched by the production tooling on Windows.
sys.path.insert(0, r"C:/Users/biswa/AppData/Local/Temp/omnirush/video-tools")

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1080, 1920
FOOTAGE = (64, 600, 1016, 1450)
NAVY = (12, 28, 48)
NAVY_DEEP = (7, 20, 37)
IVORY = (244, 241, 232)
MUTED = (170, 190, 198)
TEAL = (45, 197, 178)
TEAL_DARK = (18, 94, 101)
CARD = (18, 44, 66)
CARD_EDGE = (52, 83, 99)
LOGO_PATH = Path(r"C:/Users/biswa/omnirush.ai/.opencode/omnirush/inbox/chat-attachments/ses_ed6196d67ffeaBVm1CMVqO4ASt/273f915d-b6bd-4353-b2f8-a3b1be1247b5-Gemini_Generated_Image_cs12hgcs12hgcs12.jpg")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Load Segoe UI from the standard Windows locations, with safe fallback."""
    names = (
        (r"C:/Windows/Fonts/segoeuib.ttf", r"C:/Windows/Fonts/segoeui.ttf")
        if bold
        else (r"C:/Windows/Fonts/segoeui.ttf", r"C:/Windows/Fonts/arial.ttf")
    )
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, typeface: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Word-wrap text using measured pixel width, preserving explicit breaks."""
    lines: list[str] = []
    for paragraph in str(text or "").splitlines() or [""]:
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = f"{line} {word}"
            if draw.textbbox((0, 0), candidate, font=typeface)[2] <= max_width:
                line = candidate
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def text_block(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, typeface: ImageFont.FreeTypeFont,
               fill: tuple[int, int, int], max_width: int, spacing: int) -> int:
    lines = wrap(draw, text, typeface, max_width)
    draw.multiline_text(xy, "\n".join(lines), font=typeface, fill=fill, spacing=spacing)
    bbox = draw.multiline_textbbox(xy, "\n".join(lines), font=typeface, spacing=spacing)
    return bbox[3]


def rounded_rectangle(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int,
                      fill: tuple[int, int, int], outline: tuple[int, int, int] | None = None,
                      width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_background(image: Image.Image, index: int) -> ImageDraw.ImageDraw:
    draw = ImageDraw.Draw(image)
    # A restrained navy vertical gradient gives the flat card depth without
    # competing with footage or typography.
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        color = tuple(int(NAVY_DEEP[i] * (1 - t) + NAVY[i] * t) for i in range(3))
        draw.line((0, y, WIDTH, y), fill=color)

    # Quiet editorial geometry: a cropped teal ring and slim top rule establish
    # a repeatable visual system across the scene sequence.
    draw.ellipse((760, -150, 1240, 330), outline=(20, 75, 83), width=2)
    draw.ellipse((823, -87, 1177, 267), outline=(25, 101, 103), width=1)
    draw.line((64, 190, 1016, 190), fill=(39, 70, 85), width=1)
    draw.line((64, 190, 260 + (index % 4) * 45, 190), fill=TEAL, width=4)
    return draw


def draw_footage_placeholder(draw: ImageDraw.ImageDraw) -> None:
    x1, y1, x2, y2 = FOOTAGE
    # Exact reserved footage rectangle: the video compositor replaces this card.
    rounded_rectangle(draw, (x1, y1, x2, y2), 28, CARD, CARD_EDGE, 2)
    draw.rectangle((x1, y1, x2, y1 + 7), fill=TEAL)
    draw.text((x1 + 36, y1 + 34), "LIVE WORKFLOW VIEW", font=font(20, True), fill=(122, 159, 169))
    draw.text((x1 + 36, y2 - 54), "HOSPITAL MANAGER  /  PRODUCT DEMONSTRATION", font=font(16), fill=(93, 126, 140))
    # Minimal dashboard-like framing keeps the placeholder intentional while
    # making it easy to spot in an edit review.
    for offset, width in ((0, 190), (54, 135), (108, 245)):
        rounded_rectangle(draw, (x1 + 36, y1 + 136 + offset, x1 + 36 + width, y1 + 150 + offset), 7, (31, 67, 83))
    draw.ellipse((x2 - 104, y1 + 34, x2 - 72, y1 + 66), fill=TEAL)


def render_scene(scene: dict, index: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), NAVY_DEEP)
    draw = draw_background(image, index)
    if scene.get("source"):
        draw_footage_placeholder(draw)
    else:
        # The final CTA is a clean editorial end card, not a fake product frame.
        rounded_rectangle(draw, (64, 600, 1016, 1450), 28, NAVY, (39, 70, 85), 1)
        draw.line((64, 600, 1016, 600), fill=TEAL, width=7)
        draw.ellipse((850, 760, 930, 840), outline=TEAL, width=3)
        draw.line((120, 820, 690, 820), fill=(32, 68, 82), width=2)
        draw.line((120, 900, 560, 900), fill=(32, 68, 82), width=2)
        draw.line((120, 980, 760, 980), fill=(32, 68, 82), width=2)

    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert("RGB")
        logo.thumbnail((72, 72))
        image.paste(logo, (64, 98))
        draw.text((152, 130), "HOSPITAL MANAGER", font=font(25, True), fill=IVORY)
    else:
        draw.text((64, 130), "HOSPITAL MANAGER", font=font(25, True), fill=IVORY)
    draw.text((1016, 130), f"{index + 1:02d}", font=font(23, True), fill=TEAL, anchor="ra")

    # Typography is deliberately composited by render.py so it can enter with
    # motion and fade instead of being baked into a static card.
    draw.line((64, 1738, 1016, 1738), fill=(39, 70, 85), width=1)
    draw.text((64, 1770), "PRODUCT DEMONSTRATION • REVIEW CUT", font=font(18, True), fill=TEAL)
    draw.text((1016, 1770), "CONFIDENTIAL", font=font(18, True), fill=(120, 145, 153), anchor="ra")
    return image


def main() -> None:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--edit", default="edit.json")
    args = parser.parse_args()
    edit_path = root / args.edit
    with edit_path.open("r", encoding="utf-8") as handle:
        edit = json.load(handle)
    scenes = edit.get("scenes", [])
    if not isinstance(scenes, list):
        raise ValueError("edit.json must contain a scenes list")

    output = root / "assets"
    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob("bg-*.png"):
        old.unlink()
    for index, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            raise ValueError(f"scene {index} must be an object")
        render_scene(scene, index).save(output / f"bg-{index:02d}.png", "PNG")
    print(f"Generated {len(scenes)} artwork asset(s) in {output}")


if __name__ == "__main__":
    main()
