"""Render the presenter-led Hindi Hospital Manager portrait ad.

The manifest is deliberately declarative: source recordings and approved copy live
in hindi-avatar-ad.json, while this renderer only composes those supplied assets.
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

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FPS = 1080, 1920, 30
NAVY = "0x071426"


def _font_file(preference: str) -> str:
    candidates = {
        "Nirmala UI": [Path(r"C:\Windows\Fonts\NirmalaUI.ttf"), Path(r"C:\Windows\Fonts\Nirmala.ttf"), Path(r"C:\Windows\Fonts\Nirmala.ttc")],
        "Segoe UI": [Path(r"C:\Windows\Fonts\segoeui.ttf")],
    }
    for path in candidates.get(preference, []) + candidates["Nirmala UI"] + candidates["Segoe UI"]:
        if path.exists():
            return path.as_posix().replace(":", r"\:")
    raise RuntimeError("could not find Nirmala UI or Segoe UI in C:/Windows/Fonts")


def _num(value: Any, label: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be numeric") from exc
    if result <= 0:
        raise ValueError(f"{label} must be positive")
    return result


def _textfile(text: str) -> str:
    path = ROOT / "assets" / ("hindi-copy-" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] + ".txt")
    path.write_text(text, encoding="utf-8")
    return path.as_posix().replace(":", r"\:")


def _caption(caption: str, font: str, duration: float, size: int = 42) -> str:
    if not caption:
        return ""
    text = _textfile(caption)
    # A translucent lower-third keeps supplied product pixels legible without fabricating UI.
    alpha = f"if(lt(t\\,0.35)\\,t/0.35\\,if(lt(t\\,{max(0.36, duration - 0.35):.3f})\\,1\\,({duration:.3f}-t)/0.35))"
    return (f"drawbox=x=48:y=1510:w=984:h=270:color=0x071426@0.88:t=fill,"
            f"drawbox=x=48:y=1510:w=10:h=270:color=0x2dc5b2:t=fill,"
            f"drawtext=fontfile='{font}':textfile='{text}':expansion=none:"
            f"x=88:y=1580:fontsize={size}:fontcolor=0xf4f1e8:line_spacing=14:" 
             f"text_align=center:box=0:alpha='{alpha}'")


def _avatar_filter(scene: dict[str, Any], font: str) -> str:
    duration = float(scene["duration"])
    # Portrait source fills the portrait canvas; no synthetic presenter imagery is added.
    filters = [
        "fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "setsar=1",
        "fade=t=in:st=0:d=0.30",
    ]
    if duration > 0.6:
        filters.append(f"fade=t=out:st={duration - 0.30:.3f}:d=0.30")
    cap = _caption(str(scene.get("caption", "")), font, duration, 39)
    if cap:
        filters.append(cap)
    return ",".join(filters)


def _product_filter(scene: dict[str, Any], font: str) -> str:
    duration = float(scene["duration"])
    # Crop the supplied 16:9 recording into a readable central portrait product plate.
    filters = [
        "fps=30,scale=952:536:force_original_aspect_ratio=decrease,pad=952:536:(ow-iw)/2:(oh-ih)/2:color=black",
        "zoompan=z='1+0.035*on/(" + f"{duration * FPS:.3f}" + ")':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=952x536:fps=30",
        f"pad=1080:1920:64:600:color={NAVY}",
        "setsar=1",
        "fade=t=in:st=0:d=0.25",
    ]
    if duration > 0.5:
        filters.append(f"fade=t=out:st={duration - 0.25:.3f}:d=0.25")
    cap = _caption(str(scene.get("caption", "")), font, duration)
    if cap:
        filters.append(cap)
    return ",".join(filters)


def _plate_filter(scene: dict[str, Any], font: str) -> str:
    duration = float(scene["duration"])
    cap = _caption(str(scene.get("caption", "")), font, duration, 54)
    return ",".join([f"color=c={NAVY}:s={WIDTH}x{HEIGHT}:r={FPS}:d={duration}",
                      "fade=t=in:st=0:d=0.25", f"fade=t=out:st={duration - 0.25:.3f}:d=0.25", cap]).rstrip(",")


def _run(command: list[str], label: str) -> None:
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       text=True, encoding="utf-8", errors="replace")
    except subprocess.CalledProcessError as exc:
        detail = " | ".join((exc.stderr or "").strip().splitlines()[-3:])
        raise RuntimeError(f"{label} failed: {detail[-500:]}") from exc


def _render_scene(ffmpeg: str, scene: dict[str, Any], index: int, work: Path, font: str) -> Path:
    duration = _num(scene.get("duration"), f"scene {index + 1} duration")
    kind = scene.get("kind")
    output = work / f"avatar-scene-{index + 1:02d}.mp4"
    if kind == "plate":
        command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
                   _plate_filter(scene, font), "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo",
                   "-map", "0:v", "-map", "1:a", "-t", f"{duration:.3f}"]
    else:
        source = Path(str(scene.get("source", "")))
        if not source.is_absolute() or not source.exists():
            raise ValueError(f"scene {index + 1} source is not an existing absolute path")
        start = float(scene.get("start", 0))
        vf = _avatar_filter(scene, font) if kind == "avatar" else _product_filter(scene, font)
        command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-i", str(source)]
        if kind == "product":
            command += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        command += ["-filter:v", vf, "-map", "0:v", "-map", "0:a" if kind == "avatar" else "1:a",
                    "-t", f"{duration:.3f}"]
    command += ["-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "fast",
                "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k", "-shortest", str(output)]
    _run(command, f"scene {index + 1}")
    return output


def _verify(ffmpeg: str, output: Path) -> str:
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(output), "-f", "null", "-"],
                            check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                            encoding="utf-8", errors="replace")
    match = re.search(r"Duration:\s*([^,]+).*?Video:.*?(\d{2,5})x(\d{2,5})", result.stderr, re.S)
    if not match:
        raise RuntimeError("verification could not read duration or dimensions")
    if f"{match.group(2)}x{match.group(3)}" != "1080x1920":
        raise RuntimeError("verification found unexpected output dimensions")
    return f"duration {match.group(1).strip()} | {match.group(2)}x{match.group(3)}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="hindi-avatar-ad.json")
    args = parser.parse_args()
    try:
        manifest = ROOT / args.manifest
        data = json.loads(manifest.read_text(encoding="utf-8"))
        scenes = data.get("scenes")
        if not isinstance(scenes, list) or len(scenes) != 7:
            raise ValueError("manifest must contain exactly 7 scenes")
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        font = _font_file(str(data.get("font_preference", "Nirmala UI")))
        work = ROOT / "work" / "hindi-avatar-ad"
        work.mkdir(parents=True, exist_ok=True)
        rendered = [_render_scene(ffmpeg, scene, i, work, font) for i, scene in enumerate(scenes)]
        output = ROOT / str(data.get("output", "output/hindi-avatar-ad.mp4"))
        output.parent.mkdir(parents=True, exist_ok=True)
        concat = work / "concat.txt"
        concat.write_text("".join(f"file '{p.as_posix().replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'\n" for p in rendered), encoding="utf-8")
        _run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
              "-c", "copy", "-movflags", "+faststart", str(output)], "concat")
        for path in (ROOT / "assets").glob("hindi-copy-*.txt"):
            path.unlink(missing_ok=True)
        print(f"Rendered {len(scenes)} scenes: {output} | {_verify(ffmpeg, output)}")
        return 0
    except (OSError, KeyError, TypeError, ValueError, RuntimeError) as exc:
        print(f"Render failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
