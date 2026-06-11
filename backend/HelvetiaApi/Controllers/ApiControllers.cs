using HelvetiaApi.Data;
using HelvetiaApi.DTOs;
using HelvetiaApi.Models;
using HelvetiaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelvetiaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await authService.LoginAsync(request);
            if (result is null)
                return Unauthorized(new { message = "Geçersiz kullanıcı adı veya şifre." });

            return Ok(result);
        }
        catch (Exception)
        {
            return StatusCode(503, new { message = "Veritabanı bağlantı hatası. DATABASE_URL ayarını kontrol edin." });
        }
    }
}

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(
    AppDbContext context,
    IFileStorageService imageStorage,
    IMediaUrlService mediaUrls) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll()
    {
        var categories = await context.Categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Description, c.ImageUrl))
            .ToListAsync();

        return Ok(categories.Select(c => MapCategory(c)));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<CategoryDto>> GetBySlug(string slug)
    {
        var category = await context.Categories
            .FirstOrDefaultAsync(c => c.Slug == slug);

        if (category is null)
            return NotFound();

        return Ok(MapCategory(category));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryRequest request)
    {
        var slug = DbSeeder.GenerateSlug(request.Name);
        var exists = await context.Categories.AnyAsync(c => c.Slug == slug);
        if (exists)
            slug = $"{slug}-{DateTime.UtcNow.Ticks}";

        var category = new Category
        {
            Name = request.Name,
            Slug = slug,
            Description = request.Description,
            ImageUrl = mediaUrls.ToStoredPath(request.ImageUrl)
        };

        context.Categories.Add(category);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBySlug), new { slug = category.Slug }, MapCategory(category));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoryDto>> Update(int id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await context.Categories.FindAsync(id);
        if (category is null)
            return NotFound();

        var nextImageUrl = mediaUrls.ToStoredPath(request.ImageUrl);
        if (category.ImageUrl != nextImageUrl)
            imageStorage.DeleteByUrl(category.ImageUrl);

        category.Name = request.Name;
        category.Slug = DbSeeder.GenerateSlug(request.Name);
        category.Description = request.Description;
        category.ImageUrl = nextImageUrl;

        await context.SaveChangesAsync();

        return Ok(MapCategory(category));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await context.Categories.FindAsync(id);
        if (category is null)
            return NotFound();

        imageStorage.DeleteByUrl(category.ImageUrl);
        context.Categories.Remove(category);
        await context.SaveChangesAsync();

        return NoContent();
    }

    private CategoryDto MapCategory(Category category) => new(
        category.Id,
        category.Name,
        category.Slug,
        category.Description,
        mediaUrls.ToPublicUrl(category.ImageUrl));

    private CategoryDto MapCategory(CategoryDto category) => new(
        category.Id,
        category.Name,
        category.Slug,
        category.Description,
        mediaUrls.ToPublicUrl(category.ImageUrl));
}

[ApiController]
[Route("api/[controller]")]
public class SubCategoriesController(
    AppDbContext context,
    IFileStorageService imageStorage,
    IMediaUrlService mediaUrls) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SubCategoryDto>>> GetAll([FromQuery] string? categorySlug)
    {
        var query = context.SubCategories
            .Include(s => s.Category)
            .Include(s => s.Images)
            .AsQueryable();

        if (!string.IsNullOrEmpty(categorySlug))
            query = query.Where(s => s.Category.Slug == categorySlug);

        var subCategories = await query.OrderBy(s => s.Name).ToListAsync();
        return Ok(subCategories.Select(MapToDto));
    }

    [HttpGet("{categorySlug}/{slug}")]
    public async Task<ActionResult<SubCategoryDto>> GetBySlug(string categorySlug, string slug)
    {
        var subCategory = await context.SubCategories
            .Include(s => s.Category)
            .Include(s => s.Images)
            .FirstOrDefaultAsync(s => s.Slug == slug && s.Category.Slug == categorySlug);

        if (subCategory is null)
            return NotFound();

        return Ok(MapToDto(subCategory));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<SubCategoryDto>> Create([FromBody] CreateSubCategoryRequest request)
    {
        var category = await context.Categories.FindAsync(request.CategoryId);
        if (category is null)
            return BadRequest(new { message = "Kategori bulunamadı." });

        var slug = DbSeeder.GenerateSlug(request.Name);
        var exists = await context.SubCategories
            .AnyAsync(s => s.CategoryId == request.CategoryId && s.Slug == slug);
        if (exists)
            slug = $"{slug}-{DateTime.UtcNow.Ticks}";

        var subCategory = new SubCategory
        {
            Name = request.Name,
            Slug = slug,
            Description = request.Description,
            CategoryId = request.CategoryId,
            Images = MapInputImages(request.Images)
        };

        context.SubCategories.Add(subCategory);
        await context.SaveChangesAsync();

        await context.Entry(subCategory).Reference(s => s.Category).LoadAsync();
        return Ok(MapToDto(subCategory));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<SubCategoryDto>> Update(int id, [FromBody] UpdateSubCategoryRequest request)
    {
        var subCategory = await context.SubCategories
            .Include(s => s.Category)
            .Include(s => s.Images)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subCategory is null)
            return NotFound();

        var category = await context.Categories.FindAsync(request.CategoryId);
        if (category is null)
            return BadRequest(new { message = "Kategori bulunamadı." });

        SyncImages(subCategory, request.Images ?? []);

        subCategory.Name = request.Name;
        subCategory.Slug = DbSeeder.GenerateSlug(request.Name);
        subCategory.Description = request.Description;
        subCategory.CategoryId = request.CategoryId;

        await context.SaveChangesAsync();

        return Ok(MapToDto(subCategory));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var subCategory = await context.SubCategories
            .Include(s => s.Images)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subCategory is null)
            return NotFound(new { message = "Alt kategori bulunamadı." });

        try
        {
            foreach (var image in subCategory.Images)
                imageStorage.DeleteByUrl(image.ImageUrl);

            context.SubCategories.Remove(subCategory);
            await context.SaveChangesAsync();

            return NoContent();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { message = "Alt kategori silinemedi. Bağlı kayıtlar olabilir." });
        }
    }

    private SubCategoryDto MapToDto(SubCategory s) => new(
        s.Id, s.Name, s.Slug, s.Description,
        s.CategoryId, s.Category.Name, s.Category.Slug,
        s.Images.OrderBy(i => i.SortOrder).Select(i => new SubCategoryImageDto(
            i.Id, i.Title, i.Description, mediaUrls.ToPublicUrl(i.ImageUrl), i.SortOrder)).ToList());

    private List<SubCategoryImage> MapInputImages(List<SubCategoryImageInput>? images) =>
        (images ?? []).Select((img, index) => new SubCategoryImage
        {
            Title = img.Title,
            Description = img.Description,
            ImageUrl = mediaUrls.ToStoredPath(img.ImageUrl),
            SortOrder = index
        }).ToList();

    private void SyncImages(SubCategory subCategory, List<SubCategoryImageInput> inputs)
    {
        var inputIds = inputs.Where(i => i.Id > 0).Select(i => i.Id).ToHashSet();
        var toRemove = subCategory.Images.Where(i => !inputIds.Contains(i.Id)).ToList();

        foreach (var image in toRemove)
        {
            imageStorage.DeleteByUrl(image.ImageUrl);
            subCategory.Images.Remove(image);
        }

        for (var index = 0; index < inputs.Count; index++)
        {
            var input = inputs[index];
            if (input.Id > 0)
            {
                var existing = subCategory.Images.FirstOrDefault(i => i.Id == input.Id);
                if (existing is null) continue;

                var nextImageUrl = mediaUrls.ToStoredPath(input.ImageUrl);
                if (existing.ImageUrl != nextImageUrl)
                    imageStorage.DeleteByUrl(existing.ImageUrl);

                existing.Title = input.Title;
                existing.Description = input.Description;
                existing.ImageUrl = nextImageUrl;
                existing.SortOrder = index;
            }
            else
            {
                subCategory.Images.Add(new SubCategoryImage
                {
                    Title = input.Title,
                    Description = input.Description,
                    ImageUrl = mediaUrls.ToStoredPath(input.ImageUrl),
                    SortOrder = index
                });
            }
        }
    }
}
