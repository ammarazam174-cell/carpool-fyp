using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Saffar.Api.Data;

#nullable disable

namespace Saffar.Api.Migrations
{
    [DbContext(typeof(SaffarDbContext))]
    [Migration("20260418100000_AddRideLiveTracking")]
    public partial class AddRideLiveTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PickupLocation",
                table: "Rides",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DriverLat",
                table: "Rides",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DriverLng",
                table: "Rides",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DriverLocationUpdatedAt",
                table: "Rides",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PickupLocation",            table: "Rides");
            migrationBuilder.DropColumn(name: "DriverLat",                 table: "Rides");
            migrationBuilder.DropColumn(name: "DriverLng",                 table: "Rides");
            migrationBuilder.DropColumn(name: "DriverLocationUpdatedAt",   table: "Rides");
        }
    }
}
