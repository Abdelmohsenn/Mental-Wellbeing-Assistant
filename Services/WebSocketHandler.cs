using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
using Xabe.FFmpeg;

namespace Nano_Backend.Services;

public class WebSocketHandler
{
    private readonly MediaGRPCService _mediaService;
    private readonly LLMGRPCService _llService;
    private readonly FerGRPCService _ferService;
    private readonly SerGRPCService _serService;
    private readonly TerGRPCService _terService;
    private readonly Nano_BackendContext _context;
    private readonly UserManager<Nano_User> _userManager;
    private readonly ILogger<WebSocketHandler> _logger;

    private const string AudioPrefix = "AUD_";
    private const string EndAudioPrefix = "AUDEND_";
    private const string ImagePrefix = "IMG_";
    private const string MessagePrefix = "MSG_";

    public WebSocketHandler(MediaGRPCService mediaService, LLMGRPCService llService,
        Nano_BackendContext context, UserManager<Nano_User> userManager, ILogger<WebSocketHandler> logger,
        FerGRPCService ferService, SerGRPCService serService, TerGRPCService terService)
    {
        _mediaService = mediaService;
        _llService = llService;
        _context = context;
        _userManager = userManager;
        _logger = logger;
        _ferService = ferService;
        _serService = serService;
        _terService = terService;
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
        bool graceFullyClosed = false;

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
                    graceFullyClosed = true;
                    _sessions.Remove(userId);
                    if (user.ActiveLock)
                    {
                        await EndSession(user);
                    }
                    break;
                }

                var fullMessage = ms.ToArray();

                if (fullMessage.Length < 4)
                {
                    _logger.LogWarning("Invalid message received: too short.");
                    continue;
                }

                int sepIndex = Array.IndexOf(fullMessage, (byte)'_');
                if (sepIndex == -1)
                {
                    _logger.LogWarning("No prefix separator found");
                    return;
                }

                string prefix = Encoding.UTF8.GetString(fullMessage[..(sepIndex + 1)]);
                byte[] mediaData = fullMessage[(sepIndex + 1)..];

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
        finally
        {
            if (!graceFullyClosed)
            {
                _logger.LogWarning("WebSocket connection closed unexpectedly.");
                _sessions.Remove(userId);
                if (user.ActiveLock)
                {
                    await EndSession(user);
                }
            }
        }
    }

    private async Task EndSession(Nano_User user)
    {
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == user.ActiveSessionID);
        var result = await _llService.EndSession(user.Id);
        user.ActiveLock = false;
        user.ActiveSessionID = 0;
        if (session != null)
        {
            session.EndTime = DateTime.UtcNow;
            session.Active = false;
        }
        await _context.SaveChangesAsync();
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
        public EmotionStats SERStats = new();
        public EmotionStats FERStats = new();
        public EmotionStats TERStats = new();
        public List<byte[]> Images = [];
    }

    private readonly Dictionary<string, SessionState> _sessions = new();

    public async Task ConvertToWav(string base64Audio, string outputPath)
    {
        // Ensure output directory exists
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath));

        // Create temp input file
        var inputPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.webm");
        try
        {
            await File.WriteAllBytesAsync(inputPath, Convert.FromBase64String(base64Audio));

            // Use Xabe's built-in overwrite control instead of manual -y parameter
            var conversion = await FFmpeg.Conversions.FromSnippet.ExtractAudio(inputPath, outputPath);
            conversion.SetOverwriteOutput(true); // Explicitly set overwrite

            // Set audio format options
            conversion.AddParameter("-ac 1"); // Mono audio
            conversion.AddParameter("-ar 16000"); // 16kHz sample rate

            await conversion.Start();
        }
        finally
        {
            // Clean up temp file
            if (File.Exists(inputPath))
            {
                File.Delete(inputPath);
            }
        }
    }

    private string TopEmotion(Dictionary<string, float> emotionDict)
    {
        return emotionDict.OrderByDescending(kvp => kvp.Value).First().Key;
    }


    private async Task HandleAudioAsync(byte[] mediaData, WebSocket webSocket, HttpContext context, bool isFinalChunk)
    {
        var principal = context.User;
        if (principal == null || !principal.Identity?.IsAuthenticated == true)
        {
            _logger.LogWarning("WebSocket request missing validated user.");
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Unauthorized", CancellationToken.None);
            return;
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("Authenticated user missing NameIdentifier claim.");
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Unauthorized", CancellationToken.None);
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


        var tempWebmPath = Path.Combine("Temp", $"audio_{Guid.NewGuid()}.webm");
        var outputWavPath = Path.Combine("Uploads", $"audio_{DateTime.UtcNow.Ticks}.wav");

        Directory.CreateDirectory("Temp"); // Ensure dirs exist
        Directory.CreateDirectory("Uploads");

        await File.WriteAllBytesAsync(tempWebmPath, mediaData);
        // _logger.LogInformation($"Checking mediaData. Length: {mediaData.Length}, FinalChunk: {isFinalChunk}"); // Log length and if it's the final chunk
        // if (mediaData.Length >= 12)
        // {
        //     // Log first 12 bytes as hex and ASCII string for clarity
        //     string firstBytesHex = BitConverter.ToString(mediaData, 0, 12).Replace("-", "");
        //     string firstBytesAscii = Encoding.ASCII.GetString(mediaData, 0, 12); // Get ASCII representation
        //     _logger.LogInformation($"First 12 bytes (hex): {firstBytesHex}");
        //     _logger.LogInformation($"First 12 bytes (ascii): '{firstBytesAscii}'"); // Log what ASCII thinks it is

        //     string headerChunk1 = Encoding.ASCII.GetString(mediaData, 0, 4);
        //     string headerChunk2 = Encoding.ASCII.GetString(mediaData, 8, 4);
        //     _logger.LogInformation($"Header check parts: Chunk1='{headerChunk1}', Chunk2='{headerChunk2}'");
        // }
        // else
        // {
        //     _logger.LogWarning("mediaData is too short for WAV header check.");
        // }


        bool isWav = Encoding.ASCII.GetString(mediaData, 0, 4) == "RIFF" &&
                     Encoding.ASCII.GetString(mediaData, 8, 4) == "WAVE";

        if (!isWav)
        {
            await ConvertToWav(Convert.ToBase64String(mediaData), outputWavPath);
            File.Delete(tempWebmPath);

            mediaData = await File.ReadAllBytesAsync(outputWavPath);
            _logger.LogWarning("Audio file rejected: invalid WAV header.");
            //return;
        }
        string textResponse;
        if (mediaData == null || mediaData.Length < 1000) // ~1KB ≈ 0.1s
        {
            _logger.LogWarning("Audio chunk too short, skipping transcription.");
            textResponse = "";

        }
        else
        {
            textResponse = await _mediaService.SpeechToTextAsync(mediaData);
        }

        if (!string.IsNullOrWhiteSpace(textResponse))
        {
            session.TextBuffer.Append(textResponse).Append(" ");
            // await webSocket.SendAsync(
            // new ArraySegment<byte>(Encoding.UTF8.GetBytes(textResponse)),
            // WebSocketMessageType.Text, true, CancellationToken.None);
        }

        // Detect Emotion (SER) Per Audio Chunk 
        var serResponse = await _serService.SERAsync(mediaData);
        session.SERStats.AddEmotion(serResponse.Select(e => (e.Label, e.Confidence))); // assuming SERAsync returns IEnumerable<(string, float)>
        _logger.LogInformation("SER service response for audio: {Response}", string.Join(", ", serResponse.Select(r => $"{r.Label}: {r.Confidence:F2}")));

        // Final chunk handling
        if (isFinalChunk)
        {
            var finalText = session.TextBuffer.ToString().Trim();
            await HandleImagesArray(userId);
            // Here I should Handle TER on finalText
            var avgSer = session.SERStats.GetAverageEmotions();
            var avgFer = session.FERStats.GetAverageEmotions();
            var Ter = await _terService.TERAsync(finalText);
            session.TERStats.AddEmotion(Ter.Select(e => (e.Label, e.Confidence)));
            var avgTer = session.TERStats.GetAverageEmotions();
            var serDomEmo = TopEmotion(avgSer);
            var ferDomEmo = TopEmotion(avgFer);
            var terDomEmo = TopEmotion(avgTer);
            _logger.LogInformation("Final STT Text: {Text}", finalText);
            _logger.LogInformation("Dominant SER: {Ser}, FER: {Fer}, TER: {Ter}", serDomEmo, ferDomEmo, terDomEmo);
            string finalEmotion;
            if (serDomEmo == ferDomEmo && serDomEmo == terDomEmo)
            {
                _logger.LogInformation("All models agree on the emotion: {Emotion}", serDomEmo);
                finalEmotion = serDomEmo;
            }
            else if (serDomEmo == ferDomEmo && serDomEmo != terDomEmo)
            {
                _logger.LogInformation("SER and FER agree on the emotion: {Emotion}", serDomEmo);
                finalEmotion = serDomEmo;
            }
            else if (serDomEmo == terDomEmo && serDomEmo != ferDomEmo)
            {
                _logger.LogInformation("SER and TER agree on the emotion: {Emotion}", serDomEmo);
                finalEmotion = serDomEmo;
            }
            else if (ferDomEmo == terDomEmo && ferDomEmo != serDomEmo)
            {
                _logger.LogInformation("FER and TER agree on the emotion: {Emotion}", ferDomEmo);
                finalEmotion = ferDomEmo;
            }
            else
            {
                _logger.LogInformation("No agreement among models, using combined prediction.");

                // Concatenate probabilities by emotion key
                var allKeys = avgSer.Keys.Union(avgFer.Keys).Union(avgTer.Keys);
                var combinedScores = new Dictionary<string, float>();

                foreach (var key in allKeys)
                {
                    var serScore = avgSer.ContainsKey(key) ? avgSer[key] : 0;
                    var ferScore = avgFer.ContainsKey(key) ? avgFer[key] : 0;
                    var terScore = avgTer.ContainsKey(key) ? avgTer[key] : 0;
                    combinedScores[key] = serScore + ferScore + terScore;
                }

                finalEmotion = TopEmotion(combinedScores);
            }
            _logger.LogInformation("Dominant emotion: {Emotion}", finalEmotion);
            finalText = "EMOTION:" + finalEmotion + "\n" + finalText;
            // _logger.LogInformation("Average SER: {Ser}", string.Join(", ", avgSer.Select(kvp => $"{kvp.Key}: {kvp.Value:F2}")));
            // _logger.LogInformation("Average FER: {Fer}", string.Join(", ", avgFer.Select(kvp => $"{kvp.Key}: {kvp.Value:F2}")));
            // _logger.LogInformation("Average TER: {Ter}", string.Join(", ", avgTer.Select(kvp => $"{kvp.Key}: {kvp.Value:F2}")));
            var response = await _llService.GetResponseAsync(finalText, userId, userId);

            _logger.LogInformation("LLM response: {Response}", response);
            var replyAudio = await _mediaService.TextToSpeechAsync(response);
            _logger.LogInformation("TTS response received");
            await webSocket.SendAsync(new ArraySegment<byte>(replyAudio), WebSocketMessageType.Binary, true, CancellationToken.None);
            _logger.LogInformation("Audio sent to client");

            //var emotionSummary = $"Speech: {TopEmotion(avgSer)}, Face: {TopEmotion(avgFer)}";

            //var fullPrompt = $"{finalText}\n\nDetected Emotions → {emotionSummary}";
            //var llmResponse = await _llService.GetResponseAsync(fullPrompt, userId, user?.ActiveSessionID?.ToString());

            //var replyBytes = Encoding.UTF8.GetBytes(llmResponse);
            //await webSocket.SendAsync(new ArraySegment<byte>(replyBytes), WebSocketMessageType.Text, true, CancellationToken.None);

            _sessions.Remove(userId); // Clear session state
        }

    }

    private async Task HandleImageAsync(byte[] mediaData, WebSocket webSocket, HttpContext context)
    {
        var principal = context.User;
        if (principal?.Identity?.IsAuthenticated != true)
        {
            _logger.LogWarning("WebSocket request missing validated user.");
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Unauthorized", CancellationToken.None);
            return;
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogWarning("Authenticated user missing NameIdentifier claim.");
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Unauthorized", CancellationToken.None);
            return;
        }

        if (!_sessions.TryGetValue(userId, out var session))
        {
            session = new SessionState();
            _sessions[userId] = session;
        }

        if (mediaData.Length < 64 || mediaData.Length > 5 * 1024 * 1024)
        {
            _logger.LogWarning("Image rejected: invalid size.");
            return;
        }

        if (!(mediaData[0] == 0xFF && mediaData[1] == 0xD8)) // JPEG header check
        {
            _logger.LogWarning("Image rejected: invalid JPEG header.");
            return;
        }

        _sessions[userId].Images.Add(mediaData);

        // var fileName = $"image_{DateTime.UtcNow.Ticks}.jpeg";
        // var path = Path.Combine("Uploads", fileName);
        // try
        // {
        //     await File.WriteAllBytesAsync(path, imgData);
        //     _logger.LogInformation("Image {Index} saved to {Path}", i, path);
        // }
        // catch (Exception ex)
        // {
        //     _logger.LogError(ex, "Failed to save image {Index}.", i);
        // }

    }

    private async Task HandleImagesArray(string userID)
    {
        var ferResults = await _ferService.FERAsync(_sessions[userID].Images);
        if (ferResults != null)
        {
            _sessions[userID].FERStats.AddEmotion(ferResults.Select(e => (e.Label, e.Confidence)));
            _logger.LogInformation("FER service response: {Response}",
                string.Join(", ", ferResults.Select(r => $"{r.Label}: {r.Confidence:F2}")));
        }
        else
        {
            _logger.LogWarning("FER service returned null or empty response.");
        }
    }




    private async Task HandleTextMessageAsync(byte[] mediaData, Nano_User user, WebSocket webSocket)
    {
        string message = Encoding.UTF8.GetString(mediaData);
        _logger.LogInformation("Text message received: {Message}", message);

        var response = await _llService.GetResponseAsync(message, user.Id, user.Id);
        _logger.LogInformation("LLM response: {Response}", response);

        var replyBytes = Encoding.UTF8.GetBytes(response);
        await webSocket.SendAsync(new ArraySegment<byte>(replyBytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
