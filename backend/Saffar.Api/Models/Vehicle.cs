using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Saffar.Api.Models
{
    public class Vehicle
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }

    public string Make { get; set; } = null!;
    public string Model { get; set; } = null!;
    public string PlateNumber { get; set; } = null!;
    public int Seats { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Owner { get; set; } = null!;
}
}
