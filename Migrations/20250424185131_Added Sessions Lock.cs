using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nano_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddedSessionsLock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Active",
                table: "Sessions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ActiveLock",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ActiveSessionID",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Active",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "ActiveLock",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ActiveSessionID",
                table: "AspNetUsers");
        }
    }
}
