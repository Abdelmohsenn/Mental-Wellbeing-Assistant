using Azure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nano_Backend.Services;
using System.Text;

namespace Nano_Backend.Controllers
{
    [Route("api/speech")]
    [ApiController]
    public class SpeechToTextController : ControllerBase
    {
        private readonly SpeechGRPCService _speechService;

        public SpeechToTextController(SpeechGRPCService speechService)
        {
            _speechService = speechService;
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

        public class TextRequestDTO
        {
            public string Text { get; set; }
        }
    }
}
