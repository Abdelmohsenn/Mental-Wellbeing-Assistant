from concurrent import futures
import grpc
import fer_pb2
import fer_pb2_grpc
import numpy as np
import cv2
from deepface import DeepFace

class FerService(fer_pb2_grpc.FerServiceServicer):

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
                emotions = result['emotion']

                mapped = np.array([emotions.get(emotion, 0.0) for emotion in emotion_keys])
                emotion_totals += mapped
                valid_images += 1

            except Exception as e:
                print(f"Failed to analyze image: {e}")
                continue

        if valid_images == 0:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("No valid images provided")
            return fer_pb2.EmotionsArray()

        average_emotions = emotion_totals / valid_images

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

