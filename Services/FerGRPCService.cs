using Grpc.Net.Client;

namespace Nano_Backend.Services
{
    public class FerGRPCService
    {
        private readonly FerService.FerServiceClient _client;

        public FerGRPCService()
        {
            var channel = GrpcChannel.ForAddress("http://localhost:50053");
            _client = new FerService.FerServiceClient(channel);
        }

        public async Task<List<Emotion>> FERAsync(List<byte[]> images)
        {
            var request = new ImagesArray();

            foreach (var image in images)
            {
                request.Images.Add(new ImageRequest
                {
                    ImageData = Google.Protobuf.ByteString.CopyFrom(image)
                });
            }

            var response = await _client.FERAsync(request); 
            return response.Emotions.ToList();
        }

    }
}
