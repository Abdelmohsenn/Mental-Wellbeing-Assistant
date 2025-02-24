using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Nano_Backend.Areas.Identity.Data;
using Nano_Backend.Models;
using System.Reflection.Emit;

namespace Nano_Backend.Data;

public class Nano_BackendContext : IdentityDbContext<Nano_User>
{
    public Nano_BackendContext(DbContextOptions<Nano_BackendContext> options)
        : base(options)
    {
    }
    public DbSet<UsersConsent> UsersConsent { get; set; }
    public DbSet<Sessions> Sessions { get; set; }
    public DbSet<EmotionsHistory> EmotionsHistory { get; set; }
    public DbSet<UsersBackground> UsersBackground { get; set; }
    public DbSet<InteractionsHistory> InteractionsHistory { get; set; }
    public DbSet<Feedbacks> Feedbacks { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Customize the ASP.NET Identity model and override the defaults if needed.
        // For example, you can rename the ASP.NET Identity table names and more.
        // Add your customizations after calling base.OnModelCreating(builder);
        builder.Entity<EmotionsHistory>()
            .HasOne(eh => eh.Session)
            .WithMany()  // A session can have multiple emotions detected
            .HasForeignKey(uc => uc.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UsersBackground>()
            .HasOne(ub => ub.User)
            .WithOne(u => u.Background)
            .HasForeignKey<UsersBackground>(ub => ub.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InteractionsHistory>()
            .HasOne(ih => ih.Session)
            .WithMany()
            .HasForeignKey(ih => ih.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Feedbacks>()
            .HasOne(ub => ub.Sessions)
            .WithOne(u => u.Feedback)
            .HasForeignKey<Feedbacks>(ub => ub.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
