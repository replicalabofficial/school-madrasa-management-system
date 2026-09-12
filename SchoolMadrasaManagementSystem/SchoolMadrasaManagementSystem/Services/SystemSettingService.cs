using Microsoft.EntityFrameworkCore;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.DTOs.Settings;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Services
{
    public class SystemSettingService : ISystemSettingService
    {
        private readonly AppDbContext _context;

        public SystemSettingService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SystemSettingDto?> GetAsync(
            CancellationToken cancellationToken = default)
        {
            var setting = await _context.SystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    cancellationToken);

            return setting == null
                ? null
                : MapToDto(setting);
        }

        public async Task<SystemSettingDto> InitializeAsync(
            CancellationToken cancellationToken = default)
        {
            var existingSetting = await _context.SystemSettings
                .FirstOrDefaultAsync(cancellationToken);

            if (existingSetting != null)
            {
                return MapToDto(existingSetting);
            }

            var setting = new SystemSetting
            {
                InstitutionName = "School & Madrasa",
                Address = null,
                Phone = null,
                Email = null,
                Currency = "PKR",
                DateFormat = "dd/MM/yyyy",
                AcademicSession = DateTime.UtcNow.Year.ToString(),
                LogoPath = null,
                IsActive = true
            };

            _context.SystemSettings.Add(setting);

            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(setting);
        }

        public async Task<SystemSettingDto> UpdateAsync(
            UpdateSystemSettingDto dto,
            CancellationToken cancellationToken = default)
        {
            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(cancellationToken);

            if (setting == null)
            {
                setting = new SystemSetting();

                _context.SystemSettings.Add(setting);
            }

            setting.InstitutionName = dto.InstitutionName.Trim();

            setting.Address = string.IsNullOrWhiteSpace(dto.Address)
                ? null
                : dto.Address.Trim();

            setting.Phone = string.IsNullOrWhiteSpace(dto.Phone)
                ? null
                : dto.Phone.Trim();

            setting.Email = string.IsNullOrWhiteSpace(dto.Email)
                ? null
                : dto.Email.Trim();

            setting.Currency = dto.Currency.Trim();

            setting.DateFormat = dto.DateFormat.Trim();

            setting.AcademicSession = dto.AcademicSession.Trim();

            setting.LogoPath = string.IsNullOrWhiteSpace(dto.LogoPath)
                ? null
                : dto.LogoPath.Trim();

            setting.IsActive = dto.IsActive;

            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(setting);
        }

        private static SystemSettingDto MapToDto(
            SystemSetting setting)
        {
            return new SystemSettingDto
            {
                Id = setting.Id,
                InstitutionName = setting.InstitutionName,
                Address = setting.Address,
                Phone = setting.Phone,
                Email = setting.Email,
                Currency = setting.Currency,
                DateFormat = setting.DateFormat,
                AcademicSession = setting.AcademicSession,
                LogoPath = setting.LogoPath,
                IsActive = setting.IsActive
            };
        }
    }
}