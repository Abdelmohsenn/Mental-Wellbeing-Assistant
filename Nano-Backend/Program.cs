using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Nano_Backend.Data;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Services;

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
builder.Services.AddSingleton<SpeechService>();
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

app.Run();
