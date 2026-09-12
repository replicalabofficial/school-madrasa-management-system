using SchoolMadrasaManagementSystem.DTOs.Settings;

namespace SchoolMadrasaManagementSystem.Services
{
    public interface ISystemSettingService
    {
        Task<SystemSettingDto?> GetAsync(
            CancellationToken cancellationToken = default);

        Task<SystemSettingDto> UpdateAsync(
            UpdateSystemSettingDto dto,
            CancellationToken cancellationToken = default);

        Task<SystemSettingDto> InitializeAsync(
            CancellationToken cancellationToken = default);
    }
}