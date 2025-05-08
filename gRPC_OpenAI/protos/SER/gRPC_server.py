import grpc
from concurrent import futures
import tempfile
import os
import ser_pb2
import ser_pb2_grpc
import numpy as np
from keras.models import load_model
from pydub import AudioSegment, effects
import librosa
import noisereduce as nr

# === Your existing SER functions ===
def preprocess_audio_file(file_path, total_length=173056, target_sr=22050, top_db=30):
    # Load using pydub (for normalization)
    rawsound = AudioSegment.from_file(file_path)
    normalized = effects.normalize(rawsound, headroom=5.0)
    samples = np.array(normalized.get_array_of_samples(), dtype='float32')
    max_val = float(2 ** (8 * rawsound.sample_width - 1))
    samples = samples / max_val
    
    trimmed, _ = librosa.effects.trim(samples, top_db=top_db)
    
    if len(trimmed) < total_length:
        padded = np.pad(trimmed, (0, total_length - len(trimmed)), mode='constant')
    else:
        padded = trimmed[:total_length]
    
    sr_orig = rawsound.frame_rate
    if sr_orig != target_sr:
        padded = librosa.resample(padded, orig_sr=sr_orig, target_sr=target_sr)
        sr = target_sr
    else:
        sr = sr_orig
    reduced = nr.reduce_noise(y=padded, sr=sr)
    
    return reduced, sr

total_length = 173056
frame_length = 2048
hop_length = 512
expected_frames = 1 + int((total_length - frame_length) / hop_length)

def extract_features_fixed(signal, sr, frame_length=2048, hop_length=512, n_mfcc=13, expected_frames=expected_frames):
    rms = librosa.feature.rms(y=signal, frame_length=frame_length, hop_length=hop_length)
    zcr = librosa.feature.zero_crossing_rate(y=signal, frame_length=frame_length, hop_length=hop_length, center=True)
    mfcc = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=n_mfcc, hop_length=hop_length)
    mfcc_delta = librosa.feature.delta(mfcc)
    mfcc_delta2 = librosa.feature.delta(mfcc, order=2)
    
    centroid = librosa.feature.spectral_centroid(y=signal, sr=sr, hop_length=hop_length)
    contrast = librosa.feature.spectral_contrast(y=signal, sr=sr, hop_length=hop_length)
    rolloff = librosa.feature.spectral_rolloff(y=signal, sr=sr, hop_length=hop_length)
    
    features = np.vstack((zcr, rms, mfcc, mfcc_delta, mfcc_delta2, centroid, contrast, rolloff)).T
    current_frames = features.shape[0]
    
    if current_frames < expected_frames:
        pad_width = expected_frames - current_frames
        features = np.pad(features, ((0, pad_width), (0, 0)), mode='constant')
    elif current_frames > expected_frames:
        features = features[:expected_frames, :] 
    return features

def PredictSER(model, file_path, total_length=173056, target_sr=22050, top_db=30, frame_length=2048, hop_length=512, n_mfcc=13, expected_frames=335):  
    global bad_files  # to append bad files
    
    # Preprocess the audio file
    signal, sr = preprocess_audio_file(file_path, total_length=total_length, target_sr=target_sr, top_db=top_db)
    
    # Check if signal is valid
    if signal is None or signal.size == 0 or not np.isfinite(signal).all():
        #print(f"⚠️ Skipping file {file_path} due to invalid audio signal.")
        bad_files.append(file_path)
        # Return dummy outputs
        dummy_predictions = np.zeros((1, 8))  # Assuming 8 emotion classes
        return dummy_predictions, "Unknown"
    
    # Extract features with fixed number of frames
    features = extract_features_fixed(signal, sr, frame_length=frame_length, hop_length=hop_length, n_mfcc=n_mfcc, expected_frames=expected_frames)

    X_input = np.expand_dims(features, axis=0)
    predictions = model.predict(X_input, verbose=False)
    
    # Map predicted index to emotion
    predicted_class = np.argmax(predictions, axis=1)[0]
    emotion_map = {0: 'Neutral', 1: 'Calm', 2: 'Happiness', 3: 'Sadness', 4: 'Angry', 5: 'Fear', 6: 'Disgust', 7: 'Surprise'}
    predicted_emotion = emotion_map.get(predicted_class, "Unknown")
    
    return predictions, predicted_emotion

# Load the pre-trained model
SER = load_model("/home/group02-f24/Documents/Zoghby/ColabNotebooks5/best_weights_noSC.keras")

# Emotion label remapping
emotionMapping = {'0': 'Anger', '1': 'Fear', '2': 'Happiness', '3': 'Sadness', '4': 'Disgust', '5': 'Neutral'}
SER_labels = {0:'Neutral', 1:'Neutral', 2:'Happiness', 3:'Sadness', 4:'Anger', 5:'Fear', 6:'Disgust', 7:'Surprise'}
reverse_mapping = {v: int(k) for k, v in emotionMapping.items()}
SERClasifiedLabels = {i: reverse_mapping[label] for i, label in SER_labels.items() if label in reverse_mapping}

class SerService(ser_pb2_grpc.SerServiceServicer):
    def SER(self, request, context):
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(request.audio_data)
                voice_path = temp_audio.name

            #print(f"[INFO] Saved received audio to: {voice_path}")

            # Run prediction
            predictions, predicted_emotion = PredictSER(SER, voice_path)
            predictions = predictions.flatten()

            # Reorder prediction indices to match new emotion mapping
            reordered_preds = np.zeros(6)
            for old_idx, new_idx in SERClasifiedLabels.items():
                reordered_preds[new_idx] = predictions[old_idx]
            #print(reordered_preds)
            response = ser_pb2.AudioEmotionsArray()
            for i, (label, confidence) in enumerate(zip(emotionMapping.values(), reordered_preds)):
                emotion = ser_pb2.AudioEmotion(label=label, confidence=float(confidence))
                response.emotions.append(emotion)
            return response
        except Exception as e:
            print(f"Error processing request: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Internal server error")
            return ser_pb2.SERResponse()
        finally:
            # Clean up the temporary file
            if os.path.exists(voice_path):
                os.remove(voice_path)
                #print(f"Temporary file {voice_path} deleted.")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    ser_pb2_grpc.add_SerServiceServicer_to_server(SerService(), server)
    server.add_insecure_port('[::]:50054')
    print("gRPC server started on port 50054...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
