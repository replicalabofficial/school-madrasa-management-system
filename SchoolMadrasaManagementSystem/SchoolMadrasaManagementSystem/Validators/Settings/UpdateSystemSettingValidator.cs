using FluentValidation;
using SchoolMadrasaManagementSystem.DTOs.Settings;

namespace SchoolMadrasaManagementSystem.Validators.Settings
{
    public class UpdateSystemSettingValidator
        : AbstractValidator<UpdateSystemSettingDto>
    {
        public UpdateSystemSettingValidator()
        {
            RuleFor(x => x.InstitutionName)
                .NotEmpty()
                .WithMessage("Institution name is required.")
                .MaximumLength(200);

            RuleFor(x => x.Address)
                .MaximumLength(300)
                .When(x => !string.IsNullOrWhiteSpace(x.Address));

            RuleFor(x => x.Phone)
                .MaximumLength(50)
                .When(x => !string.IsNullOrWhiteSpace(x.Phone));

            RuleFor(x => x.Email)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.Email));

            RuleFor(x => x.Email)
                .MaximumLength(150)
                .When(x => !string.IsNullOrWhiteSpace(x.Email));

            RuleFor(x => x.Currency)
                .NotEmpty()
                .MaximumLength(10);

            RuleFor(x => x.DateFormat)
                .NotEmpty()
                .MaximumLength(30);

            RuleFor(x => x.AcademicSession)
                .NotEmpty()
                .MaximumLength(50);

            RuleFor(x => x.LogoPath)
                .MaximumLength(500)
                .When(x => !string.IsNullOrWhiteSpace(x.LogoPath));
        }
    }
}