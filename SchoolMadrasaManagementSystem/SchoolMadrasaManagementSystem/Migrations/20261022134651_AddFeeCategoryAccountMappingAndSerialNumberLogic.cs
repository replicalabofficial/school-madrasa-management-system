using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeCategoryAccountMappingAndSerialNumberLogic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FeeCategoryAccountMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: true),
                    ChartOfAccountId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeCategoryAccountMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeCategoryAccountMappings_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FeeCategoryAccountMappings_ChartOfAccounts_ChartOfAccountId",
                        column: x => x.ChartOfAccountId,
                        principalTable: "ChartOfAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeeCategoryAccountMappings_BranchId",
                table: "FeeCategoryAccountMappings",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeCategoryAccountMappings_ChartOfAccountId",
                table: "FeeCategoryAccountMappings",
                column: "ChartOfAccountId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeeCategoryAccountMappings");
        }
    }
}
