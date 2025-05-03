using Grpc.Net.Client;
using System.Threading.Tasks;

namespace Nano_Backend.Services;

public class MediaGRPCService
{
    private readonly SpeechService.SpeechServiceClient _client;

    public MediaGRPCService()
    {
        var channel = GrpcChannel.ForAddress("http://localhost:50051");
        _client = new SpeechService.SpeechServiceClient(channel);
    }

    public async Task<string> SpeechToTextAsync(byte[] audioData)
    {
        var request = new SpeechRequest { AudioData = Google.Protobuf.ByteString.CopyFrom(audioData) };
        var response = await _client.SpeechToTextAsync(request);
        return response.Text;
    }

    public async Task<byte[]> TextToSpeechAsync(string text)
    {
        var request = new TextRequest { Text = text };
        var response = await _client.TextToSpeechAsync(request);
        var audiobytes = response.AudioData.ToByteArray();
        await File.WriteAllBytesAsync("debug_audio.wav", audiobytes);
        return audiobytes;
    }

    // Apply audio effects to TTS
    public async Task<byte[]> FilteredTextToSpeechAsync(string text)
    {
        var request = new TextRequest { Text = text };
        var response = await _client.FilteredTextToSpeechAsync(request);
        var audiobytes = response.AudioData.ToByteArray();
        await File.WriteAllBytesAsync("debug_audio.wav", audiobytes);
        return audiobytes;
    }
}
