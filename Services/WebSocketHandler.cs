using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Data;
using System;
using System.IO;
using System.Net.WebSockets;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Nano_Backend.Services;

public class WebSocketHandler
{
    private readonly MediaGRPCService _mediaService;
    private readonly LLMGRPCService _llService;
    private readonly Nano_BackendContext _context;
    private readonly UserManager<Nano_User> _userManager;
    private readonly ILogger<WebSocketHandler> _logger;

    private const string AudioPrefix = "AUD_";
    private const string ImagePrefix = "IMG_";
    private const string MessagePrefix = "MSG_";

    public WebSocketHandler(MediaGRPCService mediaService, LLMGRPCService llService,
        Nano_BackendContext context, UserManager<Nano_User> userManager, ILogger<WebSocketHandler> logger)
    {
        _mediaService = mediaService;
        _llService = llService;
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task HandleWebSocketAsync(HttpContext context, WebSocket webSocket)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            _logger.LogWarning("WebSocket connection attempt without user ID.");
            return;
        }

        var user = await _userManager.FindByIdAsync(userId);
        _logger.LogInformation($"WebSocket connected by user {user.PreferredName} (ID: {user.Id}).");

        var buffer = new byte[8192];

        try
        {
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
                    _logger.LogInformation("WebSocket closed gracefully.");
                    break;
                }

                var fullMessage = ms.ToArray();

                if (fullMessage.Length < 4)
                {
                    _logger.LogWarning("Invalid message received: too short.");
                    continue;
                }

                string prefix = Encoding.UTF8.GetString(fullMessage[..4]);
                byte[] mediaData = fullMessage[4..];

                switch (prefix)
                {
                    case AudioPrefix:
                        await HandleAudioAsync(mediaData, webSocket);
                        break;

/*                    case ImagePrefix:
                        await HandleImageAsync(mediaData);
                        break;*/

                    case MessagePrefix:
                        await HandleTextMessageAsync(mediaData, user, webSocket);
                        break;

                    default:
                        _logger.LogWarning("Unknown message prefix: {Prefix}", prefix);
                        break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during WebSocket communication.");
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "An error occurred", CancellationToken.None);
            }
        }
    }

    private async Task HandleAudioAsync(byte[] mediaData, WebSocket webSocket)
    {
        if (mediaData.Length < 44 || mediaData.Length > 5 * 1024 * 1024)
        {
            _logger.LogWarning("Audio file rejected: invalid size.");
            return;
        }

        bool isWav = Encoding.ASCII.GetString(mediaData, 0, 4) == "RIFF" &&
                     Encoding.ASCII.GetString(mediaData, 8, 4) == "WAVE";

        if (!isWav)
        {
            _logger.LogWarning("Audio file rejected: invalid WAV header.");
            return;
        }

        string path = $"Uploads/audio_{DateTime.UtcNow.Ticks}.wav";
        await File.WriteAllBytesAsync(path, mediaData);
        _logger.LogInformation("Audio file saved to {Path}", path);

        var response = await _mediaService.SpeechToTextAsync(mediaData);

        if (!string.IsNullOrWhiteSpace(response))
        {
            var responseBytes = Encoding.UTF8.GetBytes(response);
            await webSocket.SendAsync(new ArraySegment<byte>(responseBytes), WebSocketMessageType.Text, true, CancellationToken.None);
            _logger.LogInformation("Speech-to-text response sent.");
        }
    }

    /*private async Task HandleImageAsync(byte[] mediaData)
    {
        if (mediaData.Length < 64 || mediaData.Length > 5 * 1024 * 1024)
        {
            _logger.LogWarning("Image rejected: invalid size.");
            return;
        }

        // JPEG header (FF D8) check
        if (!(mediaData[0] == 0xFF && mediaData[1] == 0xD8))
        {
            _logger.LogWarning("Image rejected: invalid JPEG header.");
            return;
        }

        string path = $"Uploads/image_{DateTime.UtcNow.Ticks}.jpg";
        await File.WriteAllBytesAsync(path, mediaData);
        _logger.LogInformation("Image saved to {Path}", path);

        var response = await _mediaService.FERAsync(mediaData);
        _logger.LogInformation("FER service response: {Response}", response);
    }*/

    private async Task HandleTextMessageAsync(byte[] mediaData, Nano_User user, WebSocket webSocket)
    {
        string message = Encoding.UTF8.GetString(mediaData);
        _logger.LogInformation("Text message received: {Message}", message);

        var response = await _llService.GetResponseAsync(message, user.Id, user.ActiveSessionID.ToString());
        _logger.LogInformation("LLM response: {Response}", response);

        var replyBytes = Encoding.UTF8.GetBytes(response);
        await webSocket.SendAsync(new ArraySegment<byte>(replyBytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
