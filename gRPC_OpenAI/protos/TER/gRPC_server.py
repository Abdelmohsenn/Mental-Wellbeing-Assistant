import grpc
from concurrent import futures
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoConfig
import ter_pb2
import ter_pb2_grpc

# Load model
model_name = "michellejieli/emotion_text_classifier"
config = AutoConfig.from_pretrained(model_name)
config.num_labels = 6
tokenizer = AutoTokenizer.from_pretrained(model_name)
textModel = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    config=config,
    ignore_mismatched_sizes=True
)

textModel.load_state_dict(torch.load("/home/group02-f24/Documents/Abdelmohsen/Thesis/Fusion/Weights/Classifier_withNoSurprise_FineTuned.pth"))

# Mappings
emotionMapping = {'0': 'Anger', '1': 'Fear', '2': 'Happiness', '3': 'Sadness', '4': 'Disgust', '5': 'Neutral'}
Text_Emotion_labels = {0: 'Anger', 1: 'Disgust', 2: 'Fear', 3: 'Happiness', 4: 'Neutral', 5: 'Sadness'}
reverse_mapping = {v: int(k) for k, v in emotionMapping.items()}
TextClasifiedLabels = {i: reverse_mapping[label] for i, label in Text_Emotion_labels.items() if label in reverse_mapping}

def predict_emotion_distribution(model, text):
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=1)[0]

    # Reorder probabilities to match new mapping
    reordered_probs = [0.0] * len(emotionMapping)
    for old_idx, new_idx in TextClasifiedLabels.items():
        reordered_probs[new_idx] = probs[old_idx].item()

    return reordered_probs

# gRPC Service
class TerServiceServicer(ter_pb2_grpc.TerServiceServicer):
    def TER(self, request, context):
        probs = predict_emotion_distribution(textModel, request.text_data)
        emotions = []

        for idx, confidence in enumerate(probs):
            emotions.append(
                ter_pb2.TextEmotion(label=emotionMapping[str(idx)], confidence=confidence)
            )
        # print("Emotions:", emotions)
        # print("Probabilities:", probs)
        return ter_pb2.TextEmotionsArray(emotions=emotions)

# Run gRPC server
def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    ter_pb2_grpc.add_TerServiceServicer_to_server(TerServiceServicer(), server)
    server.add_insecure_port('[::]:50055')
    print("gRPC server running on port 50055...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
