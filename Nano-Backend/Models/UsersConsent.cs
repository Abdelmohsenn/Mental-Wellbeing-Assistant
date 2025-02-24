using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nano_Backend.Areas.Identity.Data;

namespace Nano_Backend.Models;

public class UsersConsent
{
    public int Id { get; set; }
    [Required]
    public string UserId { get; set; }
    [Required]
    [MaxLength(255)]
    public string ConsentType { get; set; }
    public DateTime GivenAt { get; set; } = DateTime.UtcNow;
    [ForeignKey("UserId")]
    public virtual Nano_User User { get; set; }
}
