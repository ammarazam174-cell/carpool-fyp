using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CNICImageUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDriverApproved",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LicenseImageUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleModel",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleName",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleNumber",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CNICImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsDriverApproved",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LicenseImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VehicleModel",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VehicleName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VehicleNumber",
                table: "Users");
        }
    }
}
