public class CreateRideDto
{
    public string FromAddress { get; set; }
    public string ToAddress { get; set; }
    public DateTime DepartureTime { get; set; }
    public int AvailableSeats { get; set; }
    public decimal Price { get; set; }

    // IMPORTANT
    public List<string> PickupStops { get; set; } = new();
    public List<string> DropoffStops { get; set; } = new();
}