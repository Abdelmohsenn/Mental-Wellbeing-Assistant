from openai import OpenAI
from dotenv import load_dotenv
import os
from pathlib import Path
from pydub import AudioSegment
from pydub.effects import low_pass_filter, high_pass_filter
import numpy as np
import speech_recognition as sr

load_dotenv()
apikey = os.getenv("OPENAI_API_KEY")
client = OpenAI()

Text = "Hello, I am Nano, your personal Mental Wellbeing Assistant. I am here for you."

# Set up file paths
speech_file_path = Path(__file__).parent / "speech.wav"
output_file_path = Path(__file__).parent / "Nano.wav"

# speech to text using open ai
def TTS(output,outpath):
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice="echo",  # Deeper, male voice works better as starting point for Baymax
        input=output,
        speed=0.9  # Slower speed for Baymax's deliberate speech pattern
    )
    response.stream_to_file(outpath)

# TTS(Text,speech_file_path)
audio = AudioSegment.from_file(speech_file_path)

# text to speech usning open ai
def STT():
    response = client.audio.transcriptions.create(
        model="whisper-1",
        file=speech_file_path
    )
    # print(response.text)
    return response.text

def FilteringTTS(inputt,output_file_path):
    TTS(inputt,output_file_path)
    audio = AudioSegment.from_file(output_file_path)
    audio = audio - 10
    audio = low_pass_filter(audio, 4000)
    audio = audio.normalize()
    reverb = audio - 15  # Much quieter copy
    delay_ms = 50
    audio = audio.overlay(reverb, position=delay_ms)
    audio = audio.normalize()
    audio.export(output_file_path, format="wav")
    return audio

#local Speech to text
def NanoEar():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Nano is Listening...")
        r.adjust_for_ambient_noise(source)
        while True:
            try:
                audio = r.listen(source)  # Listen in real-time
                text = r.recognize_google(audio)  # Convert to text
                print(f"You said: {text}")
                return text
            except sr.UnknownValueError:
                print("Could not understand.")
            except sr.RequestError:
                print("API unavailable.")

# print(f"Baymax-style speech generated and saved to {output_file_path}")
# demotext = STT()
# print(demotext)