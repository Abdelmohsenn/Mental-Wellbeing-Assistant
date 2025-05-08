using Grpc.Net.Client;
using System.Threading.Tasks;

namespace Nano_Backend.Services
{
    public class LLMGRPCService
    {
        private readonly LLMService.LLMServiceClient _client;

        public LLMGRPCService()
        {
            var channel = GrpcChannel.ForAddress("http://localhost:50056");
            _client = new LLMService.LLMServiceClient(channel);
        }

        public async Task<string> GetResponseAsync(string message, string ID, string sessionId)
        {
            var request = new UserInput { UserId = ID, Message = message, SessionId = sessionId };
            var response = await _client.ChatAsync(request);
            return response.Message;
        }

        public async Task<bool> InitiateNewSession(string sessionID, string background, string userId)
        {
            var request = new UserData { SessionId = sessionID, UserBackg = background, UserId = userId };
            var response = await _client.InitiateSessionAsync(request);
            return response.Status;
        }

        public async Task<bool> EndSession(string sessionID)
        {
            var request = new UserData { SessionId = sessionID, UserBackg = "", UserId = "" };
            var response = await _client.EndSessionAsync(request);
            return response.Status;
        }
    }
}