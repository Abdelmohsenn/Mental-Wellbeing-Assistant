using Grpc.Net.Client;

namespace Nano_Backend.Services
{
    public class TerGRPCService
    {
        private readonly TerService.TerServiceClient _client;

        public TerGRPCService()
        {
            var channel = GrpcChannel.ForAddress("http://localhost:50055");
            _client = new TerService.TerServiceClient(channel);
        }

        public async Task<List<TextEmotion>> TERAsync(string text)
        {
            var request = new TextEmotionRequest
            {
                TextData = text
            };
            var response = await _client.TERAsync(request);
            return [.. response.Emotions];
        }

    }
}