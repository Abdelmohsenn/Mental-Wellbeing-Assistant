from concurrent import futures
import grpc
import media_pb2
import media_pb2_grpc
from openai import OpenAI
from pydub import AudioSegment
from pydub.effects import low_pass_filter
import os
import io
import numpy as np
from dotenv import load_dotenv
from tensorflow.keras.models import load_model
from PIL import Image
import cv2


# Load environment variables
load_dotenv()
# Load OpenAI client
client = OpenAI(api_key=os.getenv("API_KEY"))

# Load the emotion detection model (update path as needed)
FER_MODEL_PATH = "C:/Users/AUC/Desktop/API testing/gRPC_OpenAI/FER/AffectNet_Final.keras"

# List of emotion labels (adapt based on your model's output)
EMOTION_LABELS = ['anger', 'fear', 'happy', 'sad', 'surprise', 'neutral']

class MediaService(media_pb2_grpc.MediaServiceServicer):
    def __init__(self):
        self.FER_model = load_model(FER_MODEL_PATH)
        
    def TextToSpeech(self, request, context):
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="echo",
            input=request.text,
            speed=0.9,
            response_format="wav"
        )
        return media_pb2.SpeechResponse(audio_data=response.content)

    def SpeechToText(self, request, context):
        with open("temp_audio.wav", "wb") as f:
            f.write(request.audio_data)

        with open("temp_audio.wav", "rb") as f:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="en"
            )
        print(transcription.text)
        return media_pb2.TextResponse(text=transcription.text)

    def FilteredTextToSpeech(self, request, context):
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="echo",
            input=request.text,
            speed=0.9
        )

        audio = AudioSegment.from_file(io.BytesIO(response.content), format="wav")
        audio = low_pass_filter(audio, 4000)
        echo1 = (audio + 2).overlay(audio, position=20)
        echo2 = (audio + 5).overlay(audio, position=50)
        audio = audio.overlay(echo1).overlay(echo2).normalize()

        buffer = io.BytesIO()
        audio.export(buffer, format="wav", parameters=["-ac", "1", "-ar", "16000"])

        return media_pb2.SpeechResponse(audio_data=buffer.getvalue())

    def FER(self, request, context):
        try:
            # Convert bytes to NumPy array and decode image
            np_arr = np.frombuffer(request.image_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Invalid image format")
                return media_pb2.EmotionResponse()

            # Preprocessing
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (96, 96))  # Adjust if needed
            img = np.expand_dims(img, axis=0)
            img = img.astype('float32') / 255.0

            # Predict
            predictions = self.FER_model.predict(img)[0]  # Single prediction output

            # Map predictions to emotion names
            emotion_confidences = [
                media_pb2.Emotion(
                    label=EMOTION_LABELS[i],
                    confidence=float(predictions[i])
                ) for i in range(len(predictions))
            ]

            return media_pb2.EmotionsArray(emotions=emotion_confidences)

        except Exception as e:
            import traceback
            print("🔥 Exception in FER Handler 🔥")
            print(traceback.format_exc())  # this will print full error stack in terminal
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Server error: {str(e)}")
            return media_pb2.EmotionsArray()

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    media_pb2_grpc.add_MediaServiceServicer_to_server(MediaService(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("gRPC Server running on port 50051")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
