using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;
using SchoolMadrasaManagementSystem.Data;

namespace SchoolMadrasaManagementSystem.Services
{
    public class BranchContextService : IBranchContextService
    {
        private readonly AuthenticationStateProvider _authStateProvider;

        public BranchContextService(AuthenticationStateProvider authStateProvider)
        {
            _authStateProvider = authStateProvider;
        }

        public async Task<int?> GetCurrentBranchIdAsync()
        {
            var authState = await _authStateProvider.GetAuthenticationStateAsync();
            var user = authState.User;

            if (!user.Identity?.IsAuthenticated ?? false)
                return null;

            var branchClaim = user.FindFirst("BranchId")?.Value;
            return int.TryParse(branchClaim, out var branchId) ? branchId : null;
        }

        public async Task<bool> IsHeadOfficeAdminAsync()
        {
            var authState = await _authStateProvider.GetAuthenticationStateAsync();
            return authState.User.IsInRole(Roles.HeadOfficeAdmin);
        }
    }
}