using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountsReceivableAndReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsReconciled",
                table: "SalaryPayments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReconciledAt",
                table: "SalaryPayments",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReconciled",
                table: "Income",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReconciledAt",
                table: "Income",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReconciled",
                table: "Fees",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaidDate",
                table: "Fees",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReconciledAt",
                table: "Fees",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReconciled",
                table: "Expenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReconciledAt",
                table: "Expenses",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsReconciled",
                table: "SalaryPayments");

            migrationBuilder.DropColumn(
                name: "ReconciledAt",
                table: "SalaryPayments");

            migrationBuilder.DropColumn(
                name: "IsReconciled",
                table: "Income");

            migrationBuilder.DropColumn(
                name: "ReconciledAt",
                table: "Income");

            migrationBuilder.DropColumn(
                name: "IsReconciled",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "PaidDate",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "ReconciledAt",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "IsReconciled",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "ReconciledAt",
                table: "Expenses");
        }
    }
}
