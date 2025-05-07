using Grpc.Net.Client;

namespace Nano_Backend.Services
{
    public class SerGRPCService
    {
        private readonly SerService.SerServiceClient _client;

        public SerGRPCService()
        {
            var channel = GrpcChannel.ForAddress("http://localhost:50054");
            _client = new SerService.SerServiceClient(channel);
        }

        public async Task<List<AudioEmotion>> SERAsync(byte[] audio)
        {
            var request = new AudioRequest()
            {
                AudioData = Google.Protobuf.ByteString.CopyFrom(audio)
            };
            var response = await _client.SERAsync(request);
            return response.Emotions.ToList();
        }

    }
}