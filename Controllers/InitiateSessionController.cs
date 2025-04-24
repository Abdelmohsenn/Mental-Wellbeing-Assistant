using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Data;
using Nano_Backend.Models;
using Nano_Backend.Services;
using System.Text.Json;

namespace Nano_Backend.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class InitiateSessionController : ControllerBase
{
    private readonly UserManager<Nano_User> _userManager;
    private readonly LLMGRPCService _LLMGRPCService;
    private readonly Nano_BackendContext _context;

    public InitiateSessionController(UserManager<Nano_User> userManager, 
        LLMGRPCService lLMGRPCService, Nano_BackendContext context)
    {
        _userManager = userManager;
        _LLMGRPCService = lLMGRPCService;
        _context = context;
    }

    [HttpPost("start")]
    public async Task<IActionResult> NewSession()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        var userBackground = await _context.UsersBackground
    .FirstOrDefaultAsync(bg => bg.UserId == user.Id);
        if (userBackground == null)
            return NotFound("User background not found.");

        var backgroundString = JsonSerializer.Serialize(new
        {
            userBackground.Occupation,
            userBackground.EducationLevel,
            userBackground.RelationshipStatus,
            userBackground.Interests,
            userBackground.MotherTongue,
            userBackground.Country
        });

        var newSession = new Sessions
        {
            UserId = user.Id,
            StartTime = DateTime.UtcNow
            // EndTime can be set later when the session ends and feedback as well
        };

        _context.Sessions.Add(newSession);
        await _context.SaveChangesAsync();

        var result = await _LLMGRPCService.InitiateNewSession(newSession.Id.ToString(), backgroundString);

        if (result)
            return Ok($"Session {newSession.Id} Initiated Successfully");

        return BadRequest("Error Initiating New Session");
    }

}
