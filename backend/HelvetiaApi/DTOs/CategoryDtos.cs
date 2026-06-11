namespace HelvetiaApi.DTOs;

public record CategoryDto(int Id, string Name, string Slug, string? Description, string ImageUrl);

public record SubCategoryImageDto(int Id, string Title, string Description, string ImageUrl, int SortOrder);

public record SubCategoryImageInput(int Id, string Title, string Description, string ImageUrl);

public record SubCategoryDto(
    int Id,
    string Name,
    string Slug,
    string? Description,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    List<SubCategoryImageDto> Images);

public record CreateCategoryRequest(string Name, string? Description, string? ImageUrl);

public record UpdateCategoryRequest(string Name, string? Description, string? ImageUrl);

public record CreateSubCategoryRequest(string Name, string? Description, int CategoryId, List<SubCategoryImageInput>? Images);

public record UpdateSubCategoryRequest(string Name, string? Description, int CategoryId, List<SubCategoryImageInput>? Images);

public record UploadImageResponse(string Url);
