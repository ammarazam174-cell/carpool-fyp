using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RegistrationDocUrl",
                table: "Vehicles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "Vehicles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerifiedAt",
                table: "Vehicles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Vehicles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "RejectionReason", table: "Vehicles");
            migrationBuilder.DropColumn(name: "VerifiedAt", table: "Vehicles");
            migrationBuilder.DropColumn(name: "IsVerified", table: "Vehicles");
            migrationBuilder.DropColumn(name: "RegistrationDocUrl", table: "Vehicles");
        }
    }
}
