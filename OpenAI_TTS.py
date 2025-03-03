from openai import OpenAI
from dotenv import load_dotenv
import os
from pathlib import Path
from pydub import AudioSegment
from pydub.effects import low_pass_filter, high_pass_filter
import numpy as np

load_dotenv()
apikey = os.getenv("OPENAI_API_KEY")

# Set up file paths
speech_file_path = Path(__file__).parent / "speech.wav"
output_file_path = Path(__file__).parent / "Nano.wav"

# client = OpenAI()
# response = client.audio.speech.create(
#     model="tts-1-hd",
#     voice="echo",  # Deeper, male voice works better as starting point for Baymax
#     input="Hello, I am Nano, your personal Mental Wellbeing Assistant. I am here for you.",
#     speed=0.9  # Slower speed for Baymax's deliberate speech pattern
# )
# response.stream_to_file(speech_file_path)

audio = AudioSegment.from_file(speech_file_path)

# Step 2: Apply Baymax-like sound processing
def process_for_baymax(audio):
    audio = low_pass_filter(audio, 4000)
    audio = audio.normalize()
    reverb = audio - 8  # Much quieter copy
    delay_ms = 70
    audio = audio.overlay(reverb, position=delay_ms)
    audio = audio.normalize()
    return audio

baymax_audio = process_for_baymax(audio=audio)
baymax_audio.export(output_file_path, format="wav")
print(f"Baymax-style speech generated and saved to {output_file_path}")