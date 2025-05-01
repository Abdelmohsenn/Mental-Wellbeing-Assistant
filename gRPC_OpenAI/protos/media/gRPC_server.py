from concurrent import futures
import grpc
import speech_pb2
import speech_pb2_grpc
from openai import OpenAI
from pydub import AudioSegment
from pydub.effects import low_pass_filter
import os
import io
from dotenv import load_dotenv


# Load environment variables
load_dotenv()
# Load OpenAI client
client = OpenAI(api_key=os.getenv("API_KEY"))

class SpeechService(speech_pb2_grpc.SpeechServiceServicer):
        
    def TextToSpeech(self, request, context):
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="echo",
            input=request.text,
            speed=0.9,
            response_format="wav"
        )
        return speech_pb2.SpeechResponse(audio_data=response.content)

    def SpeechToText(self, request, context):
        with open("temp_audio.wav", "wb") as f:
            f.write(request.audio_data)

        with open("temp_audio.wav", "rb") as f:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="en"
            )
        # print(transcription.text)
        return speech_pb2.TextResponse(text=transcription.text)

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

        return speech_pb2.SpeechResponse(audio_data=buffer.getvalue())

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    speech_pb2_grpc.add_SpeechServiceServicer_to_server(SpeechService(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("gRPC Server running on port 50051")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
