using Grpc.Net.Client;
using System.Threading.Tasks;

namespace Nano_Backend.Services;

public class SpeechService
{
    private readonly SpeechToTextService.SpeechToTextServiceClient _client;

    public SpeechService()
    {
        var channel = GrpcChannel.ForAddress("http://localhost:50052");
        _client = new SpeechToTextService.SpeechToTextServiceClient(channel);
    }

    public async Task<string> ConvertSpeechToTextAsync(byte[] audioData)
    {
        var request = new AudioRequest { AudioData = Google.Protobuf.ByteString.CopyFrom(audioData) };
        var response = await _client.ConvertSpeechToTextAsync(request);
        return response.Transcript;
    }
}
