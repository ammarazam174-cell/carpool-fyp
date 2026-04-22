using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPassengerLocationToBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PassengerAddress",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PassengerLatitude",
                table: "Bookings",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PassengerLongitude",
                table: "Bookings",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PassengerAddress",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PassengerLatitude",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PassengerLongitude",
                table: "Bookings");
        }
    }
}
