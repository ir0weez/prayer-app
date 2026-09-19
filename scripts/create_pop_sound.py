import math
import wave
from pathlib import Path

sample_rate = 44100
duration = 0.20
frames = []
for i in range(int(sample_rate * duration)):
    t = i / sample_rate
    progress = t / duration
    chirp_frequency = 760 - 360 * progress
    chirp_envelope = min(1.0, t / 0.004) * max(0.0, 1.0 - progress) ** 2.2
    thump_envelope = min(1.0, t / 0.003) * max(0.0, 1.0 - progress * 1.6) ** 2
    sample = (
        0.62 * math.sin(2 * math.pi * chirp_frequency * t) * chirp_envelope
        + 0.24 * math.sin(2 * math.pi * 115 * t) * thump_envelope
    )
    frames.append(max(-32767, min(32767, int(sample * 32767))))

output = Path(__file__).resolve().parents[1] / "assets" / "verified-pop.wav"
with wave.open(str(output), "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(sample_rate)
    wav.writeframes(b"".join(int(sample).to_bytes(2, "little", signed=True) for sample in frames))
print(output)
