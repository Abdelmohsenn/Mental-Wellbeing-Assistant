using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nano_Backend.Areas.Identity.Data;

namespace Nano_Backend.Models;

public class UsersBackground
{
    [Key]
    [Required]
    public string UserId { get; set; }
    public string? Occupation { get; set; }
    public string? EducationLevel { get; set; }
    public string? RelationshipStatus { get; set; }
    public string? Interests { get; set; }
    public string? MotherTongue { get; set; }
    public string? Country { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [ForeignKey("UserId")]
    public virtual Nano_User User { get; set; }

}
