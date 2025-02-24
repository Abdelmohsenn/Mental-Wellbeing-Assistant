using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Nano_Backend.Areas.Identity.Data;

namespace Nano_Backend.Models;

public class InteractionsHistory
{
    public int Id { get; set; }
    [Required]
    public int SessionId { get; set; }
    public TimeOnly TimeStamp { get; set; }
    public string UserPrompt { get; set; }
    public string BotResponse { get; set; }
    [ForeignKey("SessionId")]
    public virtual Sessions Session {  get; set; }
}
