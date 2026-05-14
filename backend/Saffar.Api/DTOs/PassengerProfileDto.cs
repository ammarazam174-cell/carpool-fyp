public class PassengerProfileDto
{
    public int Age { get; set; }
    public string Gender { get; set; }

    public IFormFile ProfileImage { get; set; }
    public IFormFile CNICImage { get; set; }
}