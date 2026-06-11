using HelvetiaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace HelvetiaApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<SubCategory> SubCategories => Set<SubCategory>();
    public DbSet<SubCategoryImage> SubCategoryImages => Set<SubCategoryImage>();
    public DbSet<Admin> Admins => Set<Admin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(c => c.Slug).IsUnique();
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Property(c => c.Slug).HasMaxLength(200).IsRequired();
            entity.Property(c => c.ImageUrl).HasMaxLength(1000);
        });

        modelBuilder.Entity<SubCategory>(entity =>
        {
            entity.HasIndex(s => new { s.CategoryId, s.Slug }).IsUnique();
            entity.Property(s => s.Name).HasMaxLength(200).IsRequired();
            entity.Property(s => s.Slug).HasMaxLength(200).IsRequired();
            entity.HasOne(s => s.Category)
                .WithMany(c => c.SubCategories)
                .HasForeignKey(s => s.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SubCategoryImage>(entity =>
        {
            entity.Property(i => i.Title).HasMaxLength(300).IsRequired();
            entity.Property(i => i.Description).IsRequired();
            entity.Property(i => i.ImageUrl).HasMaxLength(1000).IsRequired();
            entity.HasOne(i => i.SubCategory)
                .WithMany(s => s.Images)
                .HasForeignKey(i => i.SubCategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Admin>(entity =>
        {
            entity.HasIndex(a => a.Username).IsUnique();
            entity.Property(a => a.Username).HasMaxLength(100).IsRequired();
        });
    }
}
