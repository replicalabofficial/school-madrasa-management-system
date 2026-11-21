using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddDoubleEntryAccounting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SourceAccountId",
                table: "Income",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ChartOfAccountId",
                table: "Fees",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceAccountId",
                table: "Fees",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceAccountId",
                table: "Expenses",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SalaryPayments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SalaryId = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ChartOfAccountId = table.Column<int>(type: "integer", nullable: false),
                    SourceAccountId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalaryPayments_ChartOfAccounts_ChartOfAccountId",
                        column: x => x.ChartOfAccountId,
                        principalTable: "ChartOfAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalaryPayments_ChartOfAccounts_SourceAccountId",
                        column: x => x.SourceAccountId,
                        principalTable: "ChartOfAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalaryPayments_Salaries_SalaryId",
                        column: x => x.SalaryId,
                        principalTable: "Salaries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Income_SourceAccountId",
                table: "Income",
                column: "SourceAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Fees_ChartOfAccountId",
                table: "Fees",
                column: "ChartOfAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Fees_SourceAccountId",
                table: "Fees",
                column: "SourceAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_SourceAccountId",
                table: "Expenses",
                column: "SourceAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryPayments_ChartOfAccountId",
                table: "SalaryPayments",
                column: "ChartOfAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryPayments_SalaryId",
                table: "SalaryPayments",
                column: "SalaryId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryPayments_SourceAccountId",
                table: "SalaryPayments",
                column: "SourceAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_ChartOfAccounts_SourceAccountId",
                table: "Expenses",
                column: "SourceAccountId",
                principalTable: "ChartOfAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Fees_ChartOfAccounts_ChartOfAccountId",
                table: "Fees",
                column: "ChartOfAccountId",
                principalTable: "ChartOfAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Fees_ChartOfAccounts_SourceAccountId",
                table: "Fees",
                column: "SourceAccountId",
                principalTable: "ChartOfAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Income_ChartOfAccounts_SourceAccountId",
                table: "Income",
                column: "SourceAccountId",
                principalTable: "ChartOfAccounts",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_ChartOfAccounts_SourceAccountId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Fees_ChartOfAccounts_ChartOfAccountId",
                table: "Fees");

            migrationBuilder.DropForeignKey(
                name: "FK_Fees_ChartOfAccounts_SourceAccountId",
                table: "Fees");

            migrationBuilder.DropForeignKey(
                name: "FK_Income_ChartOfAccounts_SourceAccountId",
                table: "Income");

            migrationBuilder.DropTable(
                name: "SalaryPayments");

            migrationBuilder.DropIndex(
                name: "IX_Income_SourceAccountId",
                table: "Income");

            migrationBuilder.DropIndex(
                name: "IX_Fees_ChartOfAccountId",
                table: "Fees");

            migrationBuilder.DropIndex(
                name: "IX_Fees_SourceAccountId",
                table: "Fees");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_SourceAccountId",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "SourceAccountId",
                table: "Income");

            migrationBuilder.DropColumn(
                name: "ChartOfAccountId",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "SourceAccountId",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "SourceAccountId",
                table: "Expenses");
        }
    }
}
