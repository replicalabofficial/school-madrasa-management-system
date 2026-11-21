using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SchoolMadrasaManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeSetupAndMonthlyPosting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AdmissionDate",
                table: "Students",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscountStatus",
                table: "Students",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherCnic",
                table: "Students",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherName",
                table: "Students",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyDiscount",
                table: "Students",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyFee",
                table: "Students",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ParentPhone",
                table: "Students",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FeePostingId",
                table: "Fees",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FeePostings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Class = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FeeDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    StudentCount = table.Column<int>(type: "integer", nullable: false),
                    GrossTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PostedBy = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PostedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeePostings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeePostings_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FeeStructures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Session = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Class = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MonthlyFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NewAdmissionMonthlyFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AdmissionFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FormFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    StationeryFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeStructures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeStructures_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Students_FatherCnic",
                table: "Students",
                column: "FatherCnic");

            migrationBuilder.CreateIndex(
                name: "IX_Students_ParentPhone",
                table: "Students",
                column: "ParentPhone");

            migrationBuilder.CreateIndex(
                name: "IX_Fees_FeePostingId",
                table: "Fees",
                column: "FeePostingId");

            migrationBuilder.CreateIndex(
                name: "IX_FeePostings_BranchId_Year_Month",
                table: "FeePostings",
                columns: new[] { "BranchId", "Year", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_BranchId_Session_Class",
                table: "FeeStructures",
                columns: new[] { "BranchId", "Session", "Class" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Fees_FeePostings_FeePostingId",
                table: "Fees",
                column: "FeePostingId",
                principalTable: "FeePostings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Fees_FeePostings_FeePostingId",
                table: "Fees");

            migrationBuilder.DropTable(
                name: "FeePostings");

            migrationBuilder.DropTable(
                name: "FeeStructures");

            migrationBuilder.DropIndex(
                name: "IX_Students_FatherCnic",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Students_ParentPhone",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Fees_FeePostingId",
                table: "Fees");

            migrationBuilder.DropColumn(
                name: "AdmissionDate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "DiscountStatus",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherCnic",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherName",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MonthlyDiscount",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MonthlyFee",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "ParentPhone",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FeePostingId",
                table: "Fees");
        }
    }
}
