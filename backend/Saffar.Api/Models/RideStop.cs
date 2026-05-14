namespace Saffar.Api.Models
{
    public class RideStop
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid RideId { get; set; }
        public Ride Ride { get; set; } = null!;

        public string StopName { get; set; } = string.Empty;

        // 🔥 Pickup (start city) OR Dropoff (end city)
        public string StopType { get; set; } = "Pickup"; 
        // values: "Pickup", "Dropoff"

        public int StopOrder { get; set; }
    }
}