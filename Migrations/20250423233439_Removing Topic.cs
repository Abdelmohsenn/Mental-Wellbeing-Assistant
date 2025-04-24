using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nano_Backend.Migrations
{
    /// <inheritdoc />
    public partial class RemovingTopic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Topic",
                table: "Sessions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Topic",
                table: "Sessions",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
