namespace SchoolMadrasaManagementSystem.Entities;

public static class BranchModules
{
    public const string Students = "Students";
    public const string Staff = "Staff";
    public const string Fees = "Fees";
    public const string Income = "Income";
    public const string Expenses = "Expenses";
    public const string Reports = "Reports";
    public const string ActivityLog = "ActivityLog";
    public const string BankReconciliation = "BankReconciliation";
    public const string TrialBalance = "TrialBalance";

    public static readonly string[] All =
    {
        Students, Staff, Fees, Income, Expenses, Reports, ActivityLog, BankReconciliation, TrialBalance
    };
}