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
def TTS(output,outpath):
    client = OpenAI()
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice="echo",  # Deeper, male voice works better as starting point for Baymax
        input=output,
        speed=0.9  # Slower speed for Baymax's deliberate speech pattern
    )
    response.stream_to_file(outpath)

Text = "Hello, I am Nano, your personal Mental Wellbeing Assistant. I am here for you."
TTS(Text,speech_file_path)

audio = AudioSegment.from_file(speech_file_path)

def FilteringTTS(inputt,output_file_path):
    TTS(inputt,output_file_path)
    audio = AudioSegment.from_file(output_file_path)
    audio = low_pass_filter(audio, 4000)
    audio = audio.normalize()
    reverb = audio - 5  # Much quieter copy
    delay_ms = 50
    audio = audio.overlay(reverb, position=delay_ms)
    audio = audio.normalize()
    audio.export(output_file_path, format="wav")
    return audio

print(f"Baymax-style speech generated and saved to {output_file_path}")