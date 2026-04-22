using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverStatusToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DriverStatus",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Pending");

            // Back-fill: mark already-approved drivers correctly
            migrationBuilder.Sql("UPDATE Users SET DriverStatus = 'Approved' WHERE Role = 'Driver' AND IsDriverApproved = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DriverStatus",
                table: "Users");
        }
    }
}
