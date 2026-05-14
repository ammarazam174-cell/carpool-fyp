using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

public class CompleteProfileDto
{
    [Required(ErrorMessage = "Full name is required")]
    [MaxLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Age is required")]
    [Range(18, 65, ErrorMessage = "Age must be between 18 and 65")]
    public int Age { get; set; }

    public IFormFile? ProfileImage { get; set; }
    public IFormFile? CNICImage { get; set; }
    public IFormFile? LicenseImage { get; set; }

    public string? VehicleName { get; set; }
    public string? VehicleNumber { get; set; }
    public string? VehicleModel { get; set; }
}
