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
        if (user.ActiveLock)
            return BadRequest("There is already an ongoing session");

        var userBackground = await _context.UsersBackground
    .FirstOrDefaultAsync(bg => bg.UserId == user.Id);
        if (userBackground == null)
        {
            return BadRequest("Background Not Found!");
        }

        var backgroundString = $"Occupation:{userBackground.Occupation}\n" +
            $"Education Level: {userBackground.EducationLevel}\n" +
            $"Relationship Status: {userBackground.RelationshipStatus}\n" +
            $"Interests: {userBackground.Interests}\n" +
            $"Mother Tongue: {userBackground.MotherTongue}\n" +
            $"Country: {userBackground.Country}\n";

        var newSession = new Sessions
        {
            UserId = user.Id,
            StartTime = DateTime.UtcNow,
            Active = true
            // EndTime can be set later when the session ends and feedback as well
        };

        _context.Sessions.Add(newSession);
        await _context.SaveChangesAsync();

        user.ActiveLock = true;
        user.ActiveSessionID = newSession.Id;
        await _context.SaveChangesAsync();

        var result = await _LLMGRPCService.InitiateNewSession(user.Id, backgroundString, user.Id);

        if (result)
            return Ok(newSession.Id);

        return BadRequest("Error Initiating New Session");
    }

    [HttpPost("end")]
    public async Task<IActionResult> EndSession()//[FromBody] FeedbackDTO feedback)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();
        if (!user.ActiveLock)
            return BadRequest("No Active Sessions");
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == user.ActiveSessionID);
        // var Feedback = new Feedbacks
        // {
        //     Rating = feedback.Rating,
        //     Feedback = feedback.Comment,
        //     CreatedAt = DateTime.UtcNow,
        //     SessionId = session.Id
        // };
        // _context.Feedbacks.Add(Feedback);
        // await _context.SaveChangesAsync();

        // session.Feedback = Feedback;
        if (session == null)
            return BadRequest("Session Not Found");
        var result = await _LLMGRPCService.EndSession(user.Id);
        if (!result)
            return BadRequest("Error Ending Session");
        session.EndTime = DateTime.UtcNow;
        user.ActiveLock = false;
        user.ActiveSessionID = 0;
        await _context.SaveChangesAsync();
        return Ok(session.Id);

    }

    public class FeedbackDTO
    {
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }

}
