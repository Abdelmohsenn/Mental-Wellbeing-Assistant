using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nano_Backend.Areas.Identity.Data;

namespace Nano_Backend.Models;

public class Sessions
{
    public int Id { get; set; }
    [Required]
    public string UserId { get; set; }
    public bool Active { get; set; } = false;
    public DateTime StartTime { get; set; } = DateTime.UtcNow;
    public DateTime EndTime { get; set; }
    public virtual Feedbacks Feedback {  get; set; }
    [ForeignKey("UserId")]
    public virtual Nano_User User { get; set; }
}
