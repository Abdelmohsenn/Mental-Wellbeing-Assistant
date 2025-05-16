from concurrent import futures
from pydub.effects import low_pass_filter, normalize, compress_dynamic_range
import grpc
import speech_pb2
import speech_pb2_grpc
from openai import OpenAI
from pydub import AudioSegment
from pydub.effects import low_pass_filter
import os
import io
from dotenv import load_dotenv
from TTS.api import TTS
from pydub import AudioSegment
import torch
import torchaudio


# Load environment variables
load_dotenv()
# Load OpenAI client
client = OpenAI(api_key=os.getenv("API_KEY"))

# Load the TTS model once (outside the method for efficiency)
#tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)

class SpeechService(speech_pb2_grpc.SpeechServiceServicer):
        
    def TextToSpeech(self, request, context):
        try:
            response = client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=request.text,
                speed=1,
                response_format="wav"
            )

            # Direct passthrough
            return speech_pb2.SpeechResponse(audio_data=response.content)

        except Exception as e:
            context.set_details(f"Error processing audio: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            return speech_pb2.SpeechResponse(audio_data=b"")



    # def TextToSpeech(self, request, context):
    #     try:
    #         # Generate audio waveform as a NumPy array
    #         wav = tts_model.tts(request.text)
    #         sample_rate = 22050  # Use the correct sample rate for your model

    #         # Convert NumPy array to PyTorch tensor and add batch dimension
    #         wav_tensor = torch.tensor(wav).unsqueeze(0)

    #         # Save waveform to in-memory buffer
    #         audio_buffer = io.BytesIO()
    #         torchaudio.save(audio_buffer, wav_tensor, sample_rate=sample_rate, format="wav")
    #         audio_buffer.seek(0)

    #         # Load audio into pydub for further processing
    #         audio = AudioSegment.from_file(audio_buffer, format="wav")

    #         # Audio post-processing
    #         audio = low_pass_filter(audio, 3000)  # Soften high frequencies
    #         audio = compress_dynamic_range(audio, threshold=-20.0, ratio=4.0)  # Compression

    #         # Add subtle ambience
    #         ambience = audio - 10
    #         ambience = ambience.fade_in(100).fade_out(100)
    #         audio = audio.overlay(ambience, gain_during_overlay=-4)

    #         # Final polish
    #         audio = normalize(audio).fade_in(500).fade_out(2000)

    #         # Export as 16-bit PCM mono at 16kHz
    #         output_buffer = io.BytesIO()
    #         audio.set_frame_rate(16000).set_channels(1).set_sample_width(2).export(
    #             output_buffer, format="wav", codec="pcm_s16le"
    #         )

    #         return speech_pb2.SpeechResponse(audio_data=output_buffer.getvalue())

    #     except Exception as e:
    #         context.set_details(f"Error processing audio: {str(e)}")
    #         context.set_code(grpc.StatusCode.INTERNAL)
    #         return speech_pb2.SpeechResponse(audio_data=b"")


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
