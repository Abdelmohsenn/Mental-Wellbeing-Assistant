using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nano_Backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdatedBackground : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreferredName",
                table: "UsersBackground",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Religion",
                table: "UsersBackground",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreferredName",
                table: "UsersBackground");

            migrationBuilder.DropColumn(
                name: "Religion",
                table: "UsersBackground");
        }
    }
}
