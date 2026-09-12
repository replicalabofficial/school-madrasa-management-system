using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceAccountIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChartOfAccountId",
                table: "Income",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ChartOfAccountId",
                table: "Expenses",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Income_ChartOfAccountId",
                table: "Income",
                column: "ChartOfAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ChartOfAccountId",
                table: "Expenses",
                column: "ChartOfAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_ChartOfAccounts_ChartOfAccountId",
                table: "Expenses",
                column: "ChartOfAccountId",
                principalTable: "ChartOfAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Income_ChartOfAccounts_ChartOfAccountId",
                table: "Income",
                column: "ChartOfAccountId",
                principalTable: "ChartOfAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_ChartOfAccounts_ChartOfAccountId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Income_ChartOfAccounts_ChartOfAccountId",
                table: "Income");

            migrationBuilder.DropIndex(
                name: "IX_Income_ChartOfAccountId",
                table: "Income");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_ChartOfAccountId",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "ChartOfAccountId",
                table: "Income");

            migrationBuilder.DropColumn(
                name: "ChartOfAccountId",
                table: "Expenses");
        }
    }
}
