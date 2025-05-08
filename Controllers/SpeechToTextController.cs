using Azure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nano_Backend.Services;
using System.Security.Policy;
using System.Text;

namespace Nano_Backend.Controllers
{
    /*    [Authorize]*/
    [Route("api/speech")]
    [ApiController]
    public class SpeechToTextController : ControllerBase
    {
        private readonly MediaGRPCService _speechService;
        private readonly LLMGRPCService _LLMService;
        private readonly FerGRPCService _ferService;
        private readonly SerGRPCService _serService;
        private readonly TerGRPCService _terService;

        public SpeechToTextController(MediaGRPCService speechService, LLMGRPCService LLMService,
        FerGRPCService ferService, SerGRPCService serService, TerGRPCService terService)
        {
            _speechService = speechService;
            _LLMService = LLMService;
            _ferService = ferService;
            _serService = serService;
            _terService = terService;
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
        public async Task<IActionResult> DetectFER(List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest("No files uploaded.");

            var imageBytesList = new List<byte[]>();

            foreach (var file in files)
            {
                if (file.Length == 0 || !file.ContentType.StartsWith("image/"))
                    return BadRequest("All uploaded files must be non-empty images.");

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                imageBytesList.Add(memoryStream.ToArray());
            }

            var emotions = await _ferService.FERAsync(imageBytesList);
            return Ok(emotions);
        }

        [HttpPost("ser")]
        public async Task<IActionResult> DetectSER(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Invalid file upload");

            byte[] audioBytes;

            using (var memoryStream = new MemoryStream())
            {
                await file.CopyToAsync(memoryStream);
                audioBytes = memoryStream.ToArray();
            }

            var emotions = await _serService.SERAsync(audioBytes);
            return Ok(emotions);
        }


        [HttpPost("chat")]
        public async Task<IActionResult> ChatWithLLM([FromBody] TextRequestDTO Request)
        {
            if (string.IsNullOrEmpty(Request?.Text))
                return BadRequest();
            var response = await _LLMService.GetResponseAsync(Request.Text, Request.ID, Request.Session);
            return Ok(response);
        }

        [HttpPost("ter")]
        public async Task<IActionResult> DetectTER([FromBody] string input)
        {
            if (string.IsNullOrEmpty(input))
                return BadRequest("Input cannot be null or empty.");

            var result = await _terService.TERAsync(input);
            return Ok(result);
        }


        public class TextRequestDTO
        {
            public string ID { get; set; }
            public string Text { get; set; }
            public string Session { get; set; }
        }
    }
}
