public class DriverProfileDto
{
    public string FullName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public IFormFile? ProfileImage { get; set; }
}