using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTotalSeatsToRide : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TotalSeats",
                table: "Rides",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TotalSeats",
                table: "Rides");
        }
    }
}
