public class CreateRideDto
{
    public string PickupLocation { get; set; }
    public string DropoffLocation { get; set; }

    public double PickupLat { get; set; }
    public double PickupLng { get; set; }

    public double DropLat { get; set; }
    public double DropLng { get; set; }

    public int AvailableSeats { get; set; }
    public decimal Price { get; set; }

    public DateTime DepartureTime { get; set; }
}