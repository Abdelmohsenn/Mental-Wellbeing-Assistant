from fastapi import FastAPI, UploadFile, File
import wave
import json
import os
from vosk import Model, KaldiRecognizer

# Ensure Vosk model exists
if not os.path.exists("model"):
    raise ValueError("Please download and extract the Vosk model in the 'model' folder.")

# Load the Vosk model
model = Model("model")

# Initialize FastAPI
app = FastAPI()

@app.post("/speech-to-text/")
async def speech_to_text(file: UploadFile = File(...)):
    """Converts uploaded WAV audio to text using Vosk."""
    with wave.open(file.file, "rb") as wf:
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
            return {"error": "Audio must be WAV format, mono channel, PCM 16-bit"}

        recognizer = KaldiRecognizer(model, wf.getframerate())
        text = ""

        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                result = json.loads(recognizer.Result())
                text += result.get("text", "") + " "

        final_result = json.loads(recognizer.FinalResult())
        text += final_result.get("text", "")

    return {"transcript": text.strip()}

