using System.Linq;

namespace SchoolMadrasaManagementSystem.Services
{
    public interface IBranchEntity
    {
        int BranchId { get; set; }
    }

    public static class BranchDataFilterExtensions
    {
        // Server-side Automatic Branch Isolation Method
        public static IQueryable<T> ApplyBranchFilter<T>(this IQueryable<T> query, int? userBranchId, bool isHeadOfficeAdmin) where T : class, IBranchEntity
        {
            // If user is HeadOfficeAdmin, they can see data across ALL branches
            if (isHeadOfficeAdmin)
            {
                return query;
            }

            // If user belongs to a specific branch, restrict query results strictly to their BranchId
            if (userBranchId.HasValue)
            {
                return query.Where(e => e.BranchId == userBranchId.Value);
            }

            // Fallback: If user has no branch assigned and is not HeadOfficeAdmin, deny access to data
            return query.Where(e => false);
        }
    }
}