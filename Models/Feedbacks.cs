using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nano_Backend.Areas.Identity.Data;

namespace Nano_Backend.Models;

public class Feedbacks
{
    public int Id { get; set; }
    [Required]
    public int SessionId { get; set; }
    public int Rating { get; set; }
    public string? Feedback {  get; set; }
    public DateTime CreatedAt { get; set; }
    [ForeignKey("SessionId")]
    public virtual Sessions Session { get; set; }
}
