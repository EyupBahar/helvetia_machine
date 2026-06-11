using HelvetiaApi.DTOs;
using HelvetiaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelvetiaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImagesController(IFileStorageService fileStorage) : ControllerBase
{
    [Authorize(Roles = "Admin")]
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<UploadImageResponse>> Upload(IFormFile file)
    {
        try
        {
            var result = await fileStorage.SaveAsync(file, Request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete]
    public IActionResult Delete([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(new { message = "Dosya adresi gerekli." });

        if (!fileStorage.IsLocalUpload(url))
            return BadRequest(new { message = "Sadece yüklenen dosyalar silinebilir." });

        fileStorage.DeleteByUrl(url);
        return NoContent();
    }
}
