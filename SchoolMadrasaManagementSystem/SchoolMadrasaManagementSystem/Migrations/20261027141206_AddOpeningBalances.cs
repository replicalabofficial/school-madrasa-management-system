using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddOpeningBalances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OpeningBalances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ChartOfAccountId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    EntryType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpeningBalances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OpeningBalances_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OpeningBalances_ChartOfAccounts_ChartOfAccountId",
                        column: x => x.ChartOfAccountId,
                        principalTable: "ChartOfAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OpeningBalances_BranchId",
                table: "OpeningBalances",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_OpeningBalances_ChartOfAccountId_BranchId",
                table: "OpeningBalances",
                columns: new[] { "ChartOfAccountId", "BranchId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OpeningBalances");
        }
    }
}
