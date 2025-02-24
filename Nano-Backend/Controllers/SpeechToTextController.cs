using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nano_Backend.Services;

namespace Nano_Backend.Controllers
{
    [Route("api/speech")]
    [ApiController]
    public class SpeechToTextController : ControllerBase
    {
        private readonly SpeechService _speechService;

        public SpeechToTextController(SpeechService speechService)
        {
            _speechService = speechService;
        }

        [HttpPost("convert")]
        public async Task<IActionResult> ConvertSpeechToText(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Invalid file upload");

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            byte[] audioBytes = memoryStream.ToArray();

            string transcript = await _speechService.ConvertSpeechToTextAsync(audioBytes);
            return Ok(new { transcript });
        }
    }
}
