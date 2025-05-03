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
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Nano_Backend.Services;

public class WebSocketHandler
{
    private readonly MediaGRPCService _mediaService;
    private readonly LLMGRPCService _llService;
    private readonly FerGRPCService _ferService;
    private readonly Nano_BackendContext _context;
    private readonly UserManager<Nano_User> _userManager;
    private readonly ILogger<WebSocketHandler> _logger;

    private const string AudioPrefix = "AUD_";
    private const string EndAudioPrefix = "AUD_END_";
    private const string ImagePrefix = "IMG_";
    private const string MessagePrefix = "MSG_";

    public WebSocketHandler(MediaGRPCService mediaService, LLMGRPCService llService,
        Nano_BackendContext context, UserManager<Nano_User> userManager, ILogger<WebSocketHandler> logger,
        FerGRPCService ferService)
    {
        _mediaService = mediaService;
        _llService = llService;
        _context = context;
        _userManager = userManager;
        _logger = logger;
        _ferService = ferService;
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
                        await HandleAudioAsync(mediaData, webSocket, context, false);
                        break;

                    case EndAudioPrefix:
                        await HandleAudioAsync(mediaData, webSocket, context, true);
                        break;

                    case ImagePrefix:
                        await HandleImageAsync(mediaData, webSocket, context);
                        break;

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

    public class EmotionStats
    {
        private readonly Dictionary<string, List<float>> _emotionValues = new();

        public void AddEmotion(IEnumerable<(string label, float confidence)> emotions)
        {
            foreach (var (label, confidence) in emotions)
            {
                if (!_emotionValues.ContainsKey(label))
                    _emotionValues[label] = new List<float>();

                _emotionValues[label].Add(confidence);
            }
        }

        public Dictionary<string, float> GetAverageEmotions()
        {
            return _emotionValues.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.Average());
        }
    }

    private class SessionState
    {
        public StringBuilder TextBuffer = new();
        //public EmotionStats SERStats = new();
        public EmotionStats FERStats = new();
    }

    private readonly Dictionary<string, SessionState> _sessions = new();

    private async Task HandleAudioAsync(byte[] mediaData, WebSocket webSocket, HttpContext context, bool isFinalChunk)
    {
        if (!context.Items.TryGetValue("User", out var userObj) || userObj is not ClaimsPrincipal principal)
        {
            _logger.LogWarning("WebSocket request missing validated user.");
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Unauthorized", CancellationToken.None);
            return;
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (userId == null)
        {
            _logger.LogWarning("Audio received without valid user ID.");
            return;
        }

        if (!_sessions.TryGetValue(userId, out var session))
        {
            session = new SessionState();
            _sessions[userId] = session;
        }

        if (userId == null)
        {
            _logger.LogWarning("Audio received without valid user ID.");
            return;
        }

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

        var textResponse = await _mediaService.SpeechToTextAsync(mediaData);

        if (!string.IsNullOrWhiteSpace(textResponse))
        {
            session.TextBuffer.Append(textResponse).Append(" ");
            await webSocket.SendAsync(
            new ArraySegment<byte>(Encoding.UTF8.GetBytes(textResponse)),
            WebSocketMessageType.Text, true, CancellationToken.None);
        }

        // Detect Emotion (SER) Per Audio Chunk (to be added later)

        // Final chunk handling
        if (isFinalChunk)
        {
            var finalText = session.TextBuffer.ToString().Trim();
            // Here I should Handle TER on finalText
            //var avgSer = session.SERStats.GetAverageEmotions();
            var avgFer = session.FERStats.GetAverageEmotions();

            _logger.LogInformation("Final STT Text: {Text}", finalText);
            //_logger.LogInformation("Average SER: {Ser}", string.Join(", ", avgSer.Select(kvp => $"{kvp.Key}: {kvp.Value:F2}")));
            _logger.LogInformation("Average FER: {Fer}", string.Join(", ", avgFer.Select(kvp => $"{kvp.Key}: {kvp.Value:F2}")));

            //var emotionSummary = $"Speech: {TopEmotion(avgSer)}, Face: {TopEmotion(avgFer)}";

            //var fullPrompt = $"{finalText}\n\nDetected Emotions → {emotionSummary}";
            var user = await _userManager.FindByIdAsync(userId);
            //var llmResponse = await _llService.GetResponseAsync(fullPrompt, userId, user?.ActiveSessionID?.ToString());

            //var replyBytes = Encoding.UTF8.GetBytes(llmResponse);
            //await webSocket.SendAsync(new ArraySegment<byte>(replyBytes), WebSocketMessageType.Text, true, CancellationToken.None);

            _sessions.Remove(userId); // Clear session state
        }

    }

    private async Task HandleImageAsync(byte[] mediaData, WebSocket webSocket, HttpContext context)
    {
        if (!context.Items.TryGetValue("User", out var userObj) || userObj is not ClaimsPrincipal principal)
        {
            _logger.LogWarning("WebSocket request missing validated user.");
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Unauthorized", CancellationToken.None);
            return;
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("Image received without valid user ID.");
            return;
        }

        if (!_sessions.TryGetValue(userId, out var session))
        {
            session = new SessionState();
            _sessions[userId] = session;
        }

        List<byte[]> mediaDataList;
        try
        {
            var base64Strings = JsonSerializer.Deserialize<List<string>>(Encoding.UTF8.GetString(mediaData));
            if (base64Strings == null)
            {
                _logger.LogWarning("No images found in deserialized JSON.");
                return;
            }

            mediaDataList = base64Strings
                .Select(b64 => Convert.FromBase64String(b64))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deserialize image data.");
            return;
        }

        for (int i = 0; i < mediaDataList.Count; i++)
        {
            var imgData = mediaDataList[i];

            if (imgData.Length < 64 || imgData.Length > 5 * 1024 * 1024)
            {
                _logger.LogWarning("Image {Index} rejected: invalid size.", i);
                continue;
            }

            if (!(imgData[0] == 0xFF && imgData[1] == 0xD8))
            {
                _logger.LogWarning("Image {Index} rejected: invalid JPEG header.", i);
                continue;
            }

            string path = $"Uploads/image_{DateTime.UtcNow.Ticks}_{i}.jpg";
            await File.WriteAllBytesAsync(path, imgData);
            _logger.LogInformation("Image {Index} saved to {Path}", i, path);
        }

        var response = await _ferService.FERAsync(mediaDataList);
        session.FERStats.AddEmotion(response.Select(e => (e.Label, e.Confidence))); // assuming FERAsync returns IEnumerable<(string, float)>
        _logger.LogInformation("FER service response for images: {Response}", string.Join(", ", response.Select(r => $"{r.Label}: {r.Confidence:F2}")));
    }



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
