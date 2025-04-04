using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Nano_Backend.Data;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Services;
using Nano_Backend.Hubs;


var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Nano_BackendContextConnection") ?? throw new InvalidOperationException("Connection string 'Nano_BackendContextConnection' not found.");

builder.Services.AddDbContext<Nano_BackendContext>(options => options.UseSqlServer(connectionString));

builder.Services.AddDefaultIdentity<Nano_User>(options => options.SignIn.RequireConfirmedAccount = true).AddEntityFrameworkStores<Nano_BackendContext>();


// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<SpeechGRPCService>();
builder.Services.AddSingleton<WebSocketHandler>();
//builder.Services.AddSignalR();

var corsPolicy = "_myCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, builder =>
    {
        builder.WithOrigins("http://localhost:5173") //  Allow frontend
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials(); //  Required for SignalR
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.UseRouting();

app.UseCors(corsPolicy);

/*app.UseEndpoints(endpoints =>
{
    endpoints.MapHub<SignalingHub>("/signal").RequireCors(corsPolicy);
});*/

app.UseWebSockets();
app.Map("/ws/media", async (HttpContext context, WebSocketHandler webSocketHandler) =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        await webSocketHandler.HandleWebSocketAsync(context, webSocket);
    }
    else
    {
        context.Response.StatusCode = 400;
    }
});

app.Run();
