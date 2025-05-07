using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Nano_Backend.Data;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Services;
using Nano_Backend.Hubs;
using System.Text;
using Microsoft.OpenApi.Models;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Nano_BackendContextConnection")
    ?? throw new InvalidOperationException("Connection string 'Nano_BackendContextConnection' not found.");

builder.Services.AddDbContext<Nano_BackendContext>(options =>
    options.UseSqlServer(connectionString));

// Identity setup (with roles)
builder.Services.AddIdentity<Nano_User, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = true;
})
.AddEntityFrameworkStores<Nano_BackendContext>()
.AddDefaultTokenProviders();

// JWT Authentication setup
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.FromMinutes(2),
        NameClaimType = ClaimTypes.NameIdentifier
    };
});

// Authorization
builder.Services.AddAuthorization();
builder.Services.AddScoped<JwtService>(); 
// Other services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Nano API", Version = "v1" });

    // Add JWT Bearer Definition
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by a space and your JWT token.\n\nExample: Bearer eyJhbGciOiJIUzI1NiIs..."
    });

    // Apply to all secured endpoints
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddHttpClient();
builder.Services.AddSingleton<MediaGRPCService>();
builder.Services.AddScoped<WebSocketHandler>();
builder.Services.AddSingleton<LLMGRPCService>();
builder.Services.AddSingleton<FerGRPCService>();
builder.Services.AddSingleton<SerGRPCService>();

// CORS
var corsPolicy = "_myCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, builder =>
    {
        builder.WithOrigins("http://localhost:5173")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

var app = builder.Build();

// Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(corsPolicy);

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// WebSocket
app.UseWebSockets();
app.UseMiddleware<WebSocketAuthMiddleware>();
app.Map("/ws/media", async (HttpContext context, WebSocketHandler webSocketHandler) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    var socket = await context.WebSockets.AcceptWebSocketAsync();
    await webSocketHandler.HandleWebSocketAsync(context, socket);
});

app.Run();
