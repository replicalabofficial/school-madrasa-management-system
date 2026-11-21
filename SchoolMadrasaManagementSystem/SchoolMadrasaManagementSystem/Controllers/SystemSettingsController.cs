using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using SchoolMadrasaManagementSystem.Data;
using SchoolMadrasaManagementSystem.DTOs.Settings;
using SchoolMadrasaManagementSystem.Services;

namespace SchoolMadrasaManagementSystem.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize(Roles = Roles.HeadOfficeAdmin)]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingService _systemSettingService;
    private readonly IWebHostEnvironment _environment;

    public SystemSettingsController(
        ISystemSettingService systemSettingService,
        IWebHostEnvironment environment)
    {
        _systemSettingService = systemSettingService;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<SystemSettingDto>> Get(CancellationToken cancellationToken)
    {
        var setting = await _systemSettingService.GetAsync(cancellationToken);
        if (setting is null) return NotFound();
        return Ok(setting);
    }

    [HttpPut]
    public async Task<ActionResult<SystemSettingDto>> Update(
        [FromBody] UpdateSystemSettingDto dto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.InstitutionName))
            return BadRequest(new { message = "Institution name is required." });

        if (string.IsNullOrWhiteSpace(dto.Currency))
            return BadRequest(new { message = "Currency is required." });

        if (string.IsNullOrWhiteSpace(dto.DateFormat))
            return BadRequest(new { message = "Date format is required." });

        if (string.IsNullOrWhiteSpace(dto.AcademicSession))
            return BadRequest(new { message = "Academic session is required." });

        try
        {
            var setting = await _systemSettingService.UpdateAsync(dto, cancellationToken);
            return Ok(setting);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("initialize")]
    public async Task<ActionResult<SystemSettingDto>> Initialize(CancellationToken cancellationToken)
    {
        var setting = await _systemSettingService.InitializeAsync(cancellationToken);
        return Ok(setting);
    }

    [HttpPost("logo")]
    public async Task<ActionResult<SystemSettingDto>> UploadLogo(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }

        var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".svg" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only PNG, JPG and SVG files are allowed." });
        }

        if (file.Length > 2 * 1024 * 1024)
        {
            return BadRequest(new { message = "Logo must be smaller than 2 MB." });
        }

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "logo");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var logoUrl = $"/uploads/logo/{fileName}";

        try
        {
            var setting = await _systemSettingService.UpdateLogoAsync(logoUrl, cancellationToken);
            return Ok(setting);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    [HttpGet("branding")]
    [AllowAnonymous]
    public async Task<ActionResult<BrandingDto>> GetBranding(CancellationToken cancellationToken)
    {
        var setting = await _systemSettingService.GetAsync(cancellationToken);

        if (setting is null)
        {
            return Ok(new BrandingDto());
        }

        return Ok(new BrandingDto
        {
            InstitutionName = setting.InstitutionName,
            LogoPath = setting.LogoPath,
        });
    }
}