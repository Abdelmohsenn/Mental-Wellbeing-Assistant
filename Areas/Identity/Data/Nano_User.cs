using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Nano_Backend.Models;

namespace Nano_Backend.Areas.Identity.Data;

// Add profile data for application users by adding properties to the Nano_User class
public class Nano_User : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateOnly DOB { get; set; }
    public char Gender { get; set; }
    public string FullName { get; set; }
    public string? PreferredName { get; set; }
    public virtual UsersBackground Background { get; set; }
}

