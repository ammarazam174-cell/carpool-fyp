using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Saffar.Api.Data;        // ✅ THIS WAS MISSING
using Saffar.Api.DTOs;
using Saffar.Api.Models;

namespace Saffar.Api.Data
{
    public class SaffarDbContext : DbContext
    {
        public SaffarDbContext(DbContextOptions<SaffarDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<Ride> Rides { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<RideStop> RideStops { get; set; }
        public DbSet<UserNotification> UserNotifications { get; set; }
        public DbSet<Rating> Ratings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // -------------------------------
            // USER CONFIG
            // -------------------------------
            modelBuilder.Entity<User>()
                .HasIndex(u => u.PhoneNumber)
                .IsUnique();


            // -------------------------------
            // VEHICLE CONFIG
            // -------------------------------
            modelBuilder.Entity<Vehicle>()
                .HasOne(v => v.Owner)
                .WithMany()
                .HasForeignKey(v => v.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);


            // -------------------------------
            // RIDE CONFIG
            // -------------------------------
            var rideEntity = modelBuilder.Entity<Ride>();

            // Ride -> Vehicle
            rideEntity
                .HasOne(r => r.Vehicle)
                .WithMany()
                .HasForeignKey(r => r.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ride -> Driver (User)
            rideEntity
                .HasOne(r => r.Driver)
                .WithMany()
                .HasForeignKey(r => r.DriverId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ride -> Price Precision
            rideEntity
                .Property(r => r.Price)
                .HasPrecision(18, 2);


            // -------------------------------
            // BOOKING CONFIG
            // -------------------------------
            // Booking -> Ride
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Ride)
                .WithMany(r => r.Bookings)
                .HasForeignKey(b => b.RideId)
                .OnDelete(DeleteBehavior.Restrict);

            // Booking -> Passenger (User)
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Passenger)
                .WithMany()
                .HasForeignKey(b => b.PassengerId)
                .OnDelete(DeleteBehavior.Restrict);
                // -------------------------------
            
            modelBuilder.Entity<Ride>()
            .HasMany(r => r.RideStops)
            .WithOne(s => s.Ride)
            .HasForeignKey(s => s.RideId);

        }
    }
}