using SchoolMadrasaManagementSystem.Users;

namespace SchoolMadrasaManagementSystem.Services;

public interface IUserManagementService
{
    Task<List<UserDto>> GetAllAsync();

    Task<UserDto?> GetByIdAsync(string userId);

    Task<UserDto> CreateAsync(CreateUserDto request);

    Task<bool> UpdateAsync(UpdateUserDto request);

    Task<bool> SetActiveStatusAsync(
        string userId,
        bool isActive);
}