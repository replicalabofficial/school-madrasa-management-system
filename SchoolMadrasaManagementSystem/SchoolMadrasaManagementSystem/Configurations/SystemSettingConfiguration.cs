using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolMadrasaManagementSystem.Entities;

namespace SchoolMadrasaManagementSystem.Configurations
{
    public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
    {
        public void Configure(EntityTypeBuilder<SystemSetting> builder)
        {
            builder.ToTable("SystemSettings");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.InstitutionName)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.Address)
                .HasMaxLength(300);

            builder.Property(x => x.Phone)
                .HasMaxLength(50);

            builder.Property(x => x.Email)
                .HasMaxLength(150);

            builder.Property(x => x.Currency)
                .IsRequired()
                .HasMaxLength(10)
                .HasDefaultValue("PKR");

            builder.Property(x => x.DateFormat)
                .IsRequired()
                .HasMaxLength(30)
                .HasDefaultValue("dd/MM/yyyy");

            builder.Property(x => x.AcademicSession)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.LogoPath)
                .HasMaxLength(500);

            builder.Property(x => x.IsActive)
                .HasDefaultValue(true);
        }
    }
}