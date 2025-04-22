using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Services;

namespace Nano_Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly JwtService _jwtService;
    private readonly UserManager<Nano_User> _userManager;
    public UserController(UserManager<Nano_User> userManager, JwtService jwtService)
    {
        _userManager = userManager; 
        _jwtService = jwtService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDTO model)
    {
        var user = new Nano_User
        {
            DOB = model.DOB,
            Gender = model.Gender,
            FullName = model.FullName,
            PreferredName = model.PreferredName,
            Email = model.Email,
            UserName = model.Username
        };

        var result = await _userManager.CreateAsync(user, model.Password);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }
        var token = await _jwtService.GenerateToken(user);
        return Ok(new {token});
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDTO model)
    {
        Nano_User? user;
        if (model.Username.IndexOf("@") != -1)
        {
            user = await _userManager.FindByEmailAsync(model.Username);
        }
        else
        {
            user = await _userManager.FindByNameAsync(model.Username);
        }
        if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
        {
            return Unauthorized();
        }
        
        var token = await _jwtService.GenerateToken(user);
        return Ok(new {token});
    }

    public class RegisterDTO
    {
        public DateOnly DOB { get; set; }
        public char Gender { get; set; }
        public string FullName { get; set; }
        public string? PreferredName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string Username { get; set; }
    }

    public class LoginDTO
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

}
