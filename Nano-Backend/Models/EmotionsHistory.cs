using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nano_Backend.Areas.Identity.Data;

namespace Nano_Backend.Models;

public class EmotionsHistory
{
    public int Id { get; set; }
    [Required]
    public int SessionId { get; set; }
    public TimeOnly TimeStamp { get; set; }
    [Required]
    public string Emotion {  get; set; }
    public float Confidence { get; set; }
    [ForeignKey("SessionId")]
    public virtual Sessions Session {  get; set; }
}
