using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Nano_Backend.Services;

namespace Nano_Backend.Services;

public class WebSocketHandler
{
    private readonly SpeechGRPCService _speechService;

    public WebSocketHandler(SpeechGRPCService speechService)
    {
        _speechService = speechService; 
    }


    public async Task HandleWebSocketAsync(HttpContext context, WebSocket webSocket)
    {
        Console.WriteLine("WebSocket connected for media transfer!");
        var buffer = new byte[1024 * 4]; // Smaller buffer, use stream for large content

        while (webSocket.State == WebSocketState.Open)
        {
            using var ms = new MemoryStream();
            WebSocketReceiveResult result;

            do
            {
                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                ms.Write(buffer, 0, result.Count);
            }
            while (!result.EndOfMessage);

            if (result.CloseStatus.HasValue)
            {
                await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
                break;
            }

            byte[] fullMessage = ms.ToArray();
            string mediaType = Encoding.UTF8.GetString(fullMessage[..4]);
            byte[] mediaData = fullMessage[4..];

            string filePath = "";
            string response = "";

            if (mediaType == "AUD_" && mediaData.Length > 100 * 1024)
            {
                filePath = $"Uploads/audio_{DateTime.Now.Ticks}.wav";
                await File.WriteAllBytesAsync(filePath, mediaData); // Optional: debug
                bool IsWavFormat =
        mediaData.Length > 12 && Encoding.ASCII.GetString(mediaData, 0, 4) == "RIFF" &&
        Encoding.ASCII.GetString(mediaData, 8, 4) == "WAVE";
                if (IsWavFormat)
                    response = await _speechService.SpeechToTextAsync(mediaData);

                if (!string.IsNullOrWhiteSpace(response))
                {
                    //var responseBytes = Encoding.UTF8.GetBytes(response);
                    //await webSocket.SendAsync(new ArraySegment<byte>(responseBytes), WebSocketMessageType.Text, true, CancellationToken.None);
                }
            }
            else if (mediaType == "IMG_")
            {
                filePath = $"Uploads/image_{DateTime.Now.Ticks}.jpg";
                await File.WriteAllBytesAsync(filePath, mediaData);
            }

            Console.WriteLine($"Media received and saved to {filePath}");
        }
    }
}
