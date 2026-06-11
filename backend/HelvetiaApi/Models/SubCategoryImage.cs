namespace HelvetiaApi.Models;

public class SubCategoryImage
{
    public int Id { get; set; }
    public int SubCategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public SubCategory SubCategory { get; set; } = null!;
}
