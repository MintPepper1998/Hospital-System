"""Render the video-production edit described by the adjacent edit.json file."""

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

import imageio_ffmpeg  # type: ignore  # supplied by the video-tools bundle
from artwork import font, wrap
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FPS = 1080, 1920, 30
NAVY = "0x071426"


def _number(value: Any, name: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be numeric") from exc
    if result < 0:
        raise ValueError(f"{name} must not be negative")
    return result


def _crop(values: Any) -> tuple[int, int, int, int]:
    if not isinstance(values, list) or len(values) != 4:
        raise ValueError("crop must contain [x, y, w, h]")
    numbers = [int(_number(v, "crop value")) for v in values]
    if numbers[2] <= 0 or numbers[3] <= 0:
        raise ValueError("crop width and height must be positive")
    return tuple(numbers)  # type: ignore[return-value]


def _ffmpeg_error(exc: subprocess.CalledProcessError) -> str:
    # Do not echo ffmpeg's command line or source paths into the user-facing log.
    details = (exc.stderr or "").strip().splitlines()
    if not details:
        return "ffmpeg failed"
    detail = " | ".join(details[-3:]).lower()
    if "no such file" in detail or "not found" in detail:
        return "ffmpeg could not open an input"
    if "invalid argument" in detail:
        return "ffmpeg rejected an argument"
    return "ffmpeg failed while encoding: " + detail[-300:]


def _drawtext(text: str, x: str, y: str, size: int, color: str = "white",
              start: float = 0.0, fade: float = 0.65) -> str:
    """Return a shell-free, UTF-8-safe drawtext filter with slide/fade entrance."""
    text_path = ROOT / "assets" / ("copy-" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] + ".txt")
    text_path.write_text(text, encoding="utf-8")
    escaped_path = text_path.as_posix().replace(":", r"\:")
    font = r"C\:/Windows/Fonts/arial.ttf"
    # Keep each line's claim verbatim; only whitespace is introduced for layout.
    alpha = rf"if(lt(t\,{start + fade:.3f})\,if(lt(t\,{start:.3f})\,0\,(t-{start:.3f})/{fade:.3f})\,1)"
    slide = rf"({x}-30*(1-min(max(t-{start:.3f}\,0)/{fade:.3f}\,1)))"
    return (f"drawtext=fontfile='{font}':textfile='{escaped_path}':expansion=none:x={slide}:y={y}:"
            f"fontsize={size}:fontcolor={color}:alpha='{alpha}'")


def _animated_copy(scene: dict[str, Any], duration: float) -> list[str]:
    """Animate editorial copy and a compact floating callout over the footage."""
    lines: list[str] = []
    eyebrow = str(scene.get("eyebrow", "SYSTEM OVERVIEW")).upper()
    title = str(scene.get("title", "Hospital operations, clearly connected"))
    body = str(scene.get("body", "A focused product walkthrough for modern hospital teams."))
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    eyebrow_lines = wrap(measure, eyebrow, font(21), 888)
    title_lines = wrap(measure, title, font(64), 888)
    body_lines = wrap(measure, body, font(29), 920)
    lines.append("drawbox=x=64:y=250:w=952:h=285:color=0x071426@0.84:t=fill")
    lines.append("drawbox=x=64:y=250:w=8:h=285:color=0x2dc5b2:t=fill")
    for row, value in enumerate(eyebrow_lines):
        lines.append(_drawtext(value, "96", str(274 + row * 28), 21, "0x2dc5b2", 0.05, 0.45))
    title_y = 320 + (len(eyebrow_lines) - 1) * 28
    for row, value in enumerate(title_lines):
        lines.append(_drawtext(value, "96", str(title_y + row * 74), 64, "0xf4f1e8", 0.18 + row * 0.07, 0.68))
    body_y = 1518
    for row, value in enumerate(body_lines):
        lines.append(_drawtext(value, "80", str(body_y + row * 38), 29, "0xaabec6", 0.35, 0.7))
    # Progress/callout accent is intentionally decorative; no metric is implied.
    lines.append(f"drawbox=x=64:y=1488:w=952:h=5:color=0x264b5a:t=fill")
    return lines


def _scene_filter(scene: dict[str, Any], duration: float) -> str:
    x, y, w, h = _crop(scene["crop"])
    filters: list[str] = []
    for mask in scene.get("masks", []) or []:
        mx, my, mw, mh = _crop(mask)
        filters.append(f"drawbox=x={mx}:y={my}:w={mw}:h={mh}:color=black@1:t=fill")
    filters.extend([
        f"crop={w}:{h}:{x}:{y}",
        # Gentle 4% push-in keeps UI footage alive without inventing content.
        "fps=30,scale=1904:1072:force_original_aspect_ratio=decrease,pad=1904:1072:(ow-iw)/2:(oh-ih)/2",
        f"zoompan=z='1+0.04*on/{duration * FPS:.3f}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=952x536:fps=30",
        f"pad=952:850:(ow-iw)/2:(oh-ih)/2:color={NAVY}",
        "setsar=1",
        "format=yuva420p",
        "fade=t=in:st=0:d=0.25:alpha=1",
    ])
    if duration > 0.25:
        filters.append(f"fade=t=out:st={max(0, duration - 0.25):.6f}:d=0.25:alpha=1")
    filters.append("setpts=PTS-STARTPTS")
    return ",".join(filters)


def _render_scene(ffmpeg: str, scene: dict[str, Any], index: int, destination: Path) -> None:
    duration = _number(scene["duration"], "duration")
    if duration <= 0:
        raise ValueError(f"scene {index + 1} duration must be positive")
    background = ROOT / "assets" / f"bg-{index:02d}.png"
    if not background.exists():
        raise ValueError(f"missing background for scene {index + 1}")

    source_value = scene.get("source")
    if source_value:
        source = Path(str(source_value))
        if not source.is_absolute() or not source.exists():
            raise ValueError(f"scene {index + 1} source is not an existing absolute path")
        graph = (
            f"[1:v]{_scene_filter(scene, duration)}[footage];"
            f"[0:v]scale={WIDTH}:{HEIGHT},format=yuva420p[base];"
            "[base][footage]overlay=x=64:y=600:format=auto:shortest=1[plate];"
            f"[plate]{','.join(_animated_copy(scene, duration))}[copy]"
        )
    else:
        graph = (f"[0:v]scale={WIDTH}:{HEIGHT},format=yuva420p[plate];"
                 f"[plate]{','.join(_animated_copy(scene, duration))}[copy]")
    # A transparent local strip clips the animated teal reveal to its track.
    graph += (f";color=c=0x2dc5b2:s=952x6:r={FPS}:d={duration}[line];"
              f"color=c=black@0:s=952x6:r={FPS}:d={duration},format=yuva420p[track];"
              f"[track][line]overlay=x='-952+952*min(t/{duration:.6f},1)':y=0:format=auto[progress];"
              "[copy][progress]overlay=x=64:y=1488:format=auto[composed]")
    # FFmpeg owns both footage movement and typography timing.
    video_map = "[composed]"

    destination.parent.mkdir(parents=True, exist_ok=True)
    command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-i", str(background)]
    if source_value:
        command.extend(["-ss", str(_number(scene["start"], "start")), "-t", f"{duration:.6f}", "-i", str(source)])
    command.extend(["-filter_complex", graph,
        "-map", video_map, "-an", "-t", f"{duration:.6f}", "-r", str(FPS),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "fast",
        "-threads", "2", "-movflags", "+faststart", str(destination)])
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       text=True, encoding="utf-8", errors="replace")
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"scene {index + 1}: {_ffmpeg_error(exc)}") from exc


def _verify(ffmpeg: str, output: Path) -> tuple[str, str]:
    try:
        result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(output), "-f", "null", "-"],
                                 check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, encoding="utf-8", errors="replace")
    except OSError as exc:
        raise RuntimeError(f"verification failed: {exc}") from exc
    if result.returncode not in (0, 1):
        raise RuntimeError(f"verification failed: {result.stderr.strip().splitlines()[-1]}")
    match = re.search(r"Duration:\s*([^,]+).*?Stream .*?Video:.*?(\d{2,5})x(\d{2,5})", result.stderr, re.S)
    if not match:
        raise RuntimeError("verification failed: could not read duration or dimensions")
    return match.group(1).strip(), f"{match.group(2)}x{match.group(3)}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--edit", default="edit.json")
    args = parser.parse_args()
    edit_path = ROOT / args.edit
    try:
        data = json.loads(edit_path.read_text(encoding="utf-8"))
        scenes = data["scenes"]
        if not isinstance(scenes, list) or not scenes:
            raise ValueError("edit.json must contain a non-empty scenes list")
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        work = ROOT / "work"
        selected = scenes[:1] if args.preview else scenes
        rendered: list[Path] = []
        for index, scene in enumerate(selected):
            rendered_path = work / ("preview.mp4" if args.preview else f"scene-{index + 1:02d}.mp4")
            _render_scene(ffmpeg, scene, index, rendered_path)
            rendered.append(rendered_path)
        output = work / "preview.mp4" if args.preview else ROOT / str(data["output"])
        if not args.preview:
            output.parent.mkdir(parents=True, exist_ok=True)
            concat = work / "concat.txt"
            concat.write_text("".join(f"file '{p.as_posix().replace("'", "'\\''")}'\n" for p in rendered), encoding="utf-8")
            command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
                       "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(output)]
            try:
                 subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, encoding="utf-8", errors="replace")
            except subprocess.CalledProcessError as exc:
                raise RuntimeError(_ffmpeg_error(exc)) from exc
        duration, dimensions = _verify(ffmpeg, output)
        for copy_file in (ROOT / "assets").glob("copy-*.txt"):
            try:
                copy_file.unlink()
            except OSError:
                pass
        print(f"Rendered {len(selected)} scene(s): {output} | duration {duration} | {dimensions}")
        return 0
    except (OSError, KeyError, TypeError, ValueError, RuntimeError) as exc:
        print(f"Render failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
