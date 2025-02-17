from fastapi import FastAPI
from fastapi.responses import FileResponse
from gtts import gTTS
import os

# Initialize FastAPI app
app = FastAPI()

@app.post("/text-to-speech/")
async def text_to_speech(text: str):
    """Converts input text into speech and returns an audio file."""

    # Generate speech from text
    tts = gTTS(text=text, lang="en")
    audio_path = "output.mp3"
    tts.save(audio_path)

    # Return the generated audio file
    return FileResponse(audio_path, media_type="audio/mpeg", filename="output.mp3")
