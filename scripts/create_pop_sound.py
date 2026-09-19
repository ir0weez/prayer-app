import math
import wave
from pathlib import Path

sample_rate = 44100
duration = 0.16
frames = []
for i in range(int(sample_rate * duration)):
    t = i / sample_rate
    progress = t / duration
    frequency = 420 + 520 * progress
    envelope = min(1.0, t / 0.008) * max(0.0, 1.0 - progress) ** 1.8
    sample = 0.32 * math.sin(2 * math.pi * frequency * t) * envelope
    frames.append(int(sample * 32767))

output = Path(__file__).resolve().parents[1] / "assets" / "verified-pop.wav"
output.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(output), "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(sample_rate)
    wav.writeframes(b"".join(int(sample).to_bytes(2, "little", signed=True) for sample in frames))
print(output)
