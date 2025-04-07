using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nano_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddedConsentsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UsersConsent",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ConsentType = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    GivenAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsersConsent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsersConsent_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UsersConsent_UserId",
                table: "UsersConsent",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UsersConsent");
        }
    }
}
