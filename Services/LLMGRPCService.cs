using Grpc.Net.Client;
using System.Threading.Tasks;

namespace Nano_Backend.Services
{
    public class LLMGRPCService
    {
        private readonly LLMService.LLMServiceClient _client;

        public LLMGRPCService()
        {
            var channel = GrpcChannel.ForAddress("http://localhost:50052");
            _client = new LLMService.LLMServiceClient(channel);
        }

        public async Task<string> GetResponseAsync(string message)
        {
            var request = new UserInput { Message = message };
            var response = await _client.ChatAsync(request);
            return response.Message;
        }
    }
}