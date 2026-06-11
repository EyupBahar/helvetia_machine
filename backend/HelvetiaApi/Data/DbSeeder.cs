using System.Text.RegularExpressions;
using HelvetiaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace HelvetiaApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await context.Database.EnsureCreatedAsync();
        await EnsureSchemaUpdatesAsync(context);

        if (!await context.Admins.AnyAsync())
        {
            context.Admins.Add(new Admin
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123")
            });
        }

        if (!await context.Categories.AnyAsync())
        {
            var makine = new Category
            {
                Name = "Makine Ekipmanları",
                Slug = "makine-ekipmanlari",
                Description = "Endüstriyel makine ve ekipmanlar"
            };

            var yedek = new Category
            {
                Name = "Yedek Parçalar",
                Slug = "yedek-parcalar",
                Description = "Orijinal yedek parçalar"
            };

            var servis = new Category
            {
                Name = "Servis Hizmetleri",
                Slug = "servis-hizmetleri",
                Description = "Bakım ve servis çözümleri"
            };

            context.Categories.AddRange(makine, yedek, servis);

            var cnc = new SubCategory
            {
                Name = "CNC Tezgahlar",
                Slug = "cnc-tezgahlar",
                Description = "Yüksek hassasiyetli CNC tezgahlar",
                Category = makine,
                Images =
                [
                    new SubCategoryImage
                    {
                        Title = "Helvetia CNC 500",
                        Description = "5 eksenli yüksek hassasiyetli CNC tezgah. Otomotiv ve havacılık sektörü için ideal.",
                        ImageUrl = "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop",
                        SortOrder = 0
                    },
                    new SubCategoryImage
                    {
                        Title = "Helvetia CNC 300",
                        Description = "Kompakt 3 eksenli CNC tezgah. Küçük ve orta ölçekli üretim tesisleri için.",
                        ImageUrl = "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop",
                        SortOrder = 1
                    }
                ]
            };

            var pres = new SubCategory
            {
                Name = "Pres Makineleri",
                Slug = "pres-makineleri",
                Description = "Hidrolik ve mekanik presler",
                Category = makine,
                Images =
                [
                    new SubCategoryImage
                    {
                        Title = "Hidrolik Pres HP-200",
                        Description = "200 ton kapasiteli hidrolik pres. Yüksek dayanıklılık ve verimlilik.",
                        ImageUrl = "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop",
                        SortOrder = 0
                    }
                ]
            };

            var motor = new SubCategory
            {
                Name = "Motor Parçaları",
                Slug = "motor-parcalari",
                Description = "Motor ve aktarma organları",
                Category = yedek,
                Images =
                [
                    new SubCategoryImage
                    {
                        Title = "Servo Motor SM-45",
                        Description = "Yüksek torklu servo motor. CNC tezgahlar için uyumlu.",
                        ImageUrl = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
                        SortOrder = 0
                    }
                ]
            };

            var filtre = new SubCategory
            {
                Name = "Filtreler",
                Slug = "filtreler",
                Description = "Hava, yağ ve su filtreleri",
                Category = yedek,
                Images =
                [
                    new SubCategoryImage
                    {
                        Title = "Hava Filtresi HF-100",
                        Description = "Endüstriyel hava filtresi. Toz ve partikül filtrasyonu.",
                        ImageUrl = "https://images.unsplash.com/photo-1585771724684-38269b6633fd?w=600&h=400&fit=crop",
                        SortOrder = 0
                    }
                ]
            };

            context.SubCategories.AddRange(cnc, pres, motor, filtre);
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureSchemaUpdatesAsync(AppDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "Categories" ADD COLUMN IF NOT EXISTS "ImageUrl" character varying(1000) NOT NULL DEFAULT '';

            CREATE TABLE IF NOT EXISTS "SubCategoryImages" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "SubCategoryId" integer NOT NULL,
                "Title" character varying(300) NOT NULL,
                "Description" text NOT NULL,
                "ImageUrl" character varying(1000) NOT NULL,
                "SortOrder" integer NOT NULL,
                CONSTRAINT "PK_SubCategoryImages" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_SubCategoryImages_SubCategories_SubCategoryId" FOREIGN KEY ("SubCategoryId") REFERENCES "SubCategories" ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS "IX_SubCategoryImages_SubCategoryId" ON "SubCategoryImages" ("SubCategoryId");
            """);

        // Mevcut Products verisini SubCategoryImages'a taşı (bir kerelik, tablo varsa)
        try
        {
            await context.Database.ExecuteSqlRawAsync("""
                INSERT INTO "SubCategoryImages" ("SubCategoryId", "Title", "Description", "ImageUrl", "SortOrder")
                SELECT p."SubCategoryId", p."Title", p."Description", p."ImageUrl", 0
                FROM "Products" p
                WHERE NOT EXISTS (
                    SELECT 1 FROM "SubCategoryImages" si WHERE si."SubCategoryId" = p."SubCategoryId" AND si."Title" = p."Title"
                );
                """);
        }
        catch
        {
            // Products tablosu yoksa atla
        }

        await context.Database.ExecuteSqlRawAsync("""DROP TABLE IF EXISTS "Products";""");

        await context.Database.ExecuteSqlRawAsync("""
            UPDATE "Categories"
            SET "ImageUrl" = regexp_replace("ImageUrl", '^https?://[^/]+(/uploads/.+)$', '\1')
            WHERE "ImageUrl" LIKE '%/uploads/%' AND "ImageUrl" NOT LIKE '/uploads/%';

            UPDATE "SubCategoryImages"
            SET "ImageUrl" = regexp_replace("ImageUrl", '^https?://[^/]+(/uploads/.+)$', '\1')
            WHERE "ImageUrl" LIKE '%/uploads/%' AND "ImageUrl" NOT LIKE '/uploads/%';
            """);
    }

    public static string GenerateSlug(string text)
    {
        var normalized = text.ToLowerInvariant()
            .Replace("ı", "i")
            .Replace("ğ", "g")
            .Replace("ü", "u")
            .Replace("ş", "s")
            .Replace("ö", "o")
            .Replace("ç", "c");

        normalized = Regex.Replace(normalized, @"[^a-z0-9\s-]", "");
        normalized = Regex.Replace(normalized, @"\s+", " ").Trim();
        normalized = normalized.Replace(" ", "-");
        normalized = Regex.Replace(normalized, @"-+", "-");

        return normalized;
    }
}
