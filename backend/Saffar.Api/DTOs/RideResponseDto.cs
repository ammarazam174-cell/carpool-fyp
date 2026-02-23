public class RideResponseDto
{
    public Guid Id { get; set; }
    public string FromAddress { get; set; }
    public string ToAddress { get; set; }
    public DateTime DepartureTime { get; set; }
    public int AvailableSeats { get; set; }
    public decimal Price { get; set; }
    public string Status { get; set; }

    public string DriverName { get; set; }
    public string DriverPhone { get; set; }

    public string VehicleMake { get; set; }
    public string VehicleModel { get; set; }

    public List<RideStopDto> Stops { get; set; }
    
public List<string> PickupStops { get; set; } = new();
public List<string> DropoffStops { get; set; } = new();
}

public class RideStopDto
{
    public string StopName { get; set; }
    public string StopType { get; set; }
}