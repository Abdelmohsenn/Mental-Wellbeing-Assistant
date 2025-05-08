from concurrent import futures
import grpc
import fer_pb2
import fer_pb2_grpc
import numpy as np
from keras.models import load_model
from scipy.special import softmax
import cv2
from deepface import DeepFace

AffectNET = load_model("/home/group02-f24/Documents/Abdelmohsen/Thesis/Fusion/Weights/AffectNet_NoSC_S224.keras")
def AFFECTnet(img):
    try:    
        img = img.astype('float32') / 255.0  # Normalize if needed
        img = cv2.resize(img, (224, 224))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = np.expand_dims(img, axis=-1)
        img = np.expand_dims(img, axis=0)

        predictions = AffectNET.predict(img, verbose=False)
        probs = predictions[0] # Assuming model output is raw logits
        return probs

    except Exception as e:
        print(f"AffectNet error: {e}")
        array = np.zeros(6)
        return array
        

class FerService(fer_pb2_grpc.FerServiceServicer):
    affectNetAccuracy = 0.68
    deepFaceAccuracy = 0.92

    def FER(self, request, context):
        emotion_keys = ["angry", "fear", "happy", "sad", "disgust", "neutral"]
        emotion_totals = np.zeros(len(emotion_keys))
        valid_images = 0

        for image_request in request.images:
            np_arr = np.frombuffer(image_request.image_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                continue  # Skip invalid images instead of failing the whole request

            try:
                result = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)[0]
                result2 = AFFECTnet(img)
                #print("da affect net", result2)
                emotions = result['emotion']
                #print("da deep face", emotions)
                mapped = np.array([emotions.get(emotion, 0.0) for emotion in emotion_keys])
                emotion_totals += self.deepFaceAccuracy*(mapped/100) + self.affectNetAccuracy*result2
                #print("da emotion total", emotion_totals)
                valid_images += 1

            except Exception as e:
                print(f"Failed to analyze image: {e}")
                continue

        if valid_images == 0:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("No valid images provided")
            return fer_pb2.EmotionsArray()

        average_emotions = emotion_totals / valid_images
        average_emotions = softmax(average_emotions)

        # Build response
        response = fer_pb2.EmotionsArray()
        for label, confidence in zip(emotion_keys, average_emotions):
            response.emotions.add(label=label, confidence=float(confidence))

        return response


def serve():

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    fer_pb2_grpc.add_FerServiceServicer_to_server(FerService(), server)
    server.add_insecure_port("[::]:50053")
    server.start()
    print("gRPC Server running on port 50053")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()

