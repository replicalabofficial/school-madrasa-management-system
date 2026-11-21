using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddGrNumberDesignationDiscountBranchAccountsSalaryAdjustments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Students",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "GrNumber",
                table: "Students",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Students",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LeftDate",
                table: "Students",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Designation",
                table: "Staff",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Fees",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "Fees",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "DiscountApprovalStatus",
                table: "Fees",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "ChartOfAccounts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SalaryAdjustments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StaffId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    ChartOfAccountId = table.Column<int>(type: "integer", nullable: false),
                    SourceAccountId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalaryAdjustments_ChartOfAccounts_ChartOfAccountId",
                        column: x => x.ChartOfAccountId,
                        principalTable: "ChartOfAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalaryAdjustments_ChartOfAccounts_SourceAccountId",
                        column: x => x.SourceAccountId,
                        principalTable: "ChartOfAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalaryAdjustments_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChartOfAccounts_BranchId",
                table: "ChartOfAccounts",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryAdjustments_ChartOfAccountId",
                table: "SalaryAdjustments",
                column: "ChartOfAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryAdjustments_SourceAccountId",
                table: "SalaryAdjustments",
                column: "SourceAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryAdjustments_StaffId",
                table: "SalaryAdjustments",
                column: "StaffId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChartOfAccounts_Branches_BranchId",
                table: "ChartOfAccounts",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChartOfAccounts_Branches_BranchId",
                table: "ChartOfAccounts");

            migrationBuilder.DropTable(
                name: "SalaryAdjustments");

            migrationBuilder.DropIndex(
                name: "IX_ChartOfAccounts_BranchId",
                table: "ChartOfAccounts");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "GrNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "LeftDate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Designation",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "DiscountApprovalStatus",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "ChartOfAccounts");
        }
    }
}
