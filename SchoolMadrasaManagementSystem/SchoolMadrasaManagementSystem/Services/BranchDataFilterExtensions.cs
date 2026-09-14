using System;
using System.Linq;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services
{
    public interface IBranchEntity
    {
        int BranchId { get; set; }
    }

    public static class BranchDataFilterExtensions
    {
        // Server-side Automatic Branch Isolation Method for Queries
        public static IQueryable<T> ApplyBranchFilter<T>(this IQueryable<T> query, int? userBranchId, bool isHeadOfficeAdmin) where T : class, IBranchEntity
        {
            if (isHeadOfficeAdmin)
            {
                return query;
            }

            if (userBranchId.HasValue)
            {
                return query.Where(e => e.BranchId == userBranchId.Value);
            }

            return query.Where(e => false);
        }

        // Security Guard: Ensures caller has permission to access a specific entity's branch (Prevents IDOR)
        public static void EnsureBranchAccess<T>(this T entity, int? userBranchId, bool isHeadOfficeAdmin) where T : class, IBranchEntity
        {
            if (isHeadOfficeAdmin) return;

            if (!userBranchId.HasValue || entity.BranchId != userBranchId.Value)
            {
                throw new UnauthorizedAccessException("Access denied. You do not have permission to access data outside your assigned branch.");
            }
        }
    }
}