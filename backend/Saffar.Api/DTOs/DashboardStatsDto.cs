namespace Saffar.Api.DTOs
{
    public class DashboardStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalDrivers { get; set; }
        public int TotalPassengers { get; set; }
        public int TotalRides { get; set; }
        public int TotalBookings { get; set; }
        public decimal TotalEarnings { get; set; }
    }
}
