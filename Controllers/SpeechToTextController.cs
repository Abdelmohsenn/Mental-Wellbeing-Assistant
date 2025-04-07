using Azure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nano_Backend.Services;
using System.Security.Policy;
using System.Text;

namespace Nano_Backend.Controllers
{
    [Route("api/speech")]
    [ApiController]
    public class SpeechToTextController : ControllerBase
    {
        private readonly MediaGRPCService _speechService;
        private readonly LLMGRPCService _LLMService;

        public SpeechToTextController(MediaGRPCService speechService, LLMGRPCService LLMService)
        {
            _speechService = speechService;
            _LLMService = LLMService;
        }


        [HttpPost("stt")]
        public async Task<IActionResult> ConvertSpeechToText(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Invalid file upload");

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            byte[] audioBytes = memoryStream.ToArray();
            bool IsWavFormat =
        audioBytes.Length > 12 && Encoding.ASCII.GetString(audioBytes, 0, 4) == "RIFF" &&
        Encoding.ASCII.GetString(audioBytes, 8, 4) == "WAVE";
            if (IsWavFormat)
            {
                string transcript = await _speechService.SpeechToTextAsync(audioBytes);
                return Ok(new { transcript });
            }
            return BadRequest("Invalid file upload");
        }

        [HttpPost("tts")]
        public async Task<IActionResult> ConvertTextToSpeech([FromBody] TextRequestDTO Request)
        {
            if (string.IsNullOrEmpty(Request?.Text))
                return BadRequest();
            var audioData = await _speechService.TextToSpeechAsync(Request.Text);
            return File(audioData, "audio/wav");
        }

        [HttpPost("fer")]
        public async Task<IActionResult> DetectFER(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded or file is empty.");

            if (!file.ContentType.StartsWith("image/"))
                return BadRequest("Uploaded file is not an image.");

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            byte[] image = memoryStream.ToArray();
            var emotions = await _speechService.FERAsync(image);
            return Ok(emotions);
        }

        [HttpPost("chat")]
        public async Task<IActionResult> ChatWithLLM([FromBody] TextRequestDTO Request)
        {
            if (string.IsNullOrEmpty(Request?.Text))
                return BadRequest();
            var response = await _LLMService.GetResponseAsync(Request.Text);
            return Ok(response);
        }

        public class TextRequestDTO
        {
            public string Text { get; set; }
        }
    }
}
