#!/usr/bin/env python3
"""Build a smooth, percussion-free 24 s ambient hub loop with stdlib only."""

from array import array
from math import pi, sin
from pathlib import Path
import wave


RATE = 24_000
DURATION = 24
SAMPLES = RATE * DURATION
OUTPUT = Path("/tmp/creatordeck-hub-ambient.wav")


def loop_frequency(note_hz: float) -> float:
    """Round a note to a whole number of cycles so its phase meets at the seam."""
    return round(note_hz * DURATION) / DURATION


def main() -> None:
    # A quiet D-minor / suspended colour, built from sine partials. Slow level
    # movement has one complete cycle per file; there are no drums or transients.
    notes = [
        (73.416, 0.25),  # D2 anchor
        (110.000, 0.12),  # A2
        (146.832, 0.09),  # D3
        (174.614, 0.07),  # F3
        (220.000, 0.06),  # A3
        (261.626, 0.04),  # C4
        (329.628, 0.025),  # E4
    ]
    values = array("f")
    peak = 0.0
    for index in range(SAMPLES):
        t = index / RATE
        sample = 0.0
        for note, gain in notes:
            frequency = loop_frequency(note)
            slow_sway = 1.0 + 0.025 * sin(2 * pi * t / DURATION)
            fundamental = sin(2 * pi * frequency * t)
            second = sin(4 * pi * frequency * t)
            third = sin(6 * pi * frequency * t)
            slow_bloom = 1.0 + 0.07 * sin(2 * pi * t / DURATION)
            sample += gain * slow_bloom * (
                fundamental + 0.16 * second + 0.035 * third
            ) * slow_sway
        values.append(sample)
        peak = max(peak, abs(sample))

    # Leave comfortable headroom for the app's scene gain and master bus.
    scale = 0.28 / peak
    pcm = array("h", (int(max(-1.0, min(1.0, value * scale)) * 32767) for value in values))
    with wave.open(str(OUTPUT), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm.tobytes())
    print(f"Wrote {OUTPUT} ({DURATION}s; seam-aligned tones; no percussion)")


if __name__ == "__main__":
    main()
