using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Saffar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRideCompletedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Rides",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Rides");
        }
    }
}
