using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Rating
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RideId { get; set; }

    [Required]
    public Guid DriverId { get; set; }

    [Required]
    public Guid PassengerId { get; set; }

    [Range(1,5)]
    public int Stars { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}