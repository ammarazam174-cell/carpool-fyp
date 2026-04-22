using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixRideBookingRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the phantom shadow relationship EF Core created when WithMany() had no parameter.
            // These objects exist in the DB from the original migration.
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_Rides_RideId1",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_RideId1",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RideId1",
                table: "Bookings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DriverLat",
                table: "Rides");

            migrationBuilder.DropColumn(
                name: "DriverLng",
                table: "Rides");

            migrationBuilder.DropColumn(
                name: "DriverLocationUpdatedAt",
                table: "Rides");

            migrationBuilder.DropColumn(
                name: "PickupLocation",
                table: "Rides");

            migrationBuilder.AlterColumn<string>(
                name: "DriverStatus",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<Guid>(
                name: "RideId1",
                table: "Bookings",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_RideId1",
                table: "Bookings",
                column: "RideId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_Rides_RideId1",
                table: "Bookings",
                column: "RideId1",
                principalTable: "Rides",
                principalColumn: "Id");
        }
    }
}
