using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace Nano_Backend.Hubs
{
    public class WebSocketAuthMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _config;

        public WebSocketAuthMiddleware(RequestDelegate next, IConfiguration config)
        {
            _next = next;
            _config = config;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Apply only to WebSocket requests under /ws/*
            if (context.Request.Path.StartsWithSegments("/ws") &&
                context.WebSockets.IsWebSocketRequest)
            {
                var token = context.Request.Query["token"].ToString();
                if (string.IsNullOrEmpty(token))
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Token is missing.");
                    return;
                }

                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    var validationParams = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = _config["Jwt:Issuer"],
                        ValidAudience = _config["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]))
                    };

                    var principal = handler.ValidateToken(token, validationParams, out _);
                    context.Items["User"] = principal;
                }
                catch (Exception)
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Token is invalid.");
                    return;
                }
            }

            await _next(context);
        }
    }
}
