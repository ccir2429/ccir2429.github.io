using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TimestampBlazor.Services;

/// <summary>
/// Ports the Firebase Authentication + Realtime Database REST calls from index.js
/// (signIn/refresh/dbw) to C#, using HttpClient instead of fetch.
/// </summary>
public sealed class FirebaseService(HttpClient http, ConfigService configService)
{
    private string _idToken = "";
    private string _refreshToken = "";
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;

    public bool IsSignedIn => !string.IsNullOrEmpty(_idToken);

    public async Task SignInAsync(string password)
    {
        var cfg = await configService.GetAsync();
        var resp = await http.PostAsJsonAsync(
            $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={Uri.EscapeDataString(cfg.ApiKey)}",
            new { email = cfg.AdminEmail, password, returnSecureToken = true });

        var json = await resp.Content.ReadFromJsonAsync<JsonObject>() ?? new JsonObject();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException(json["error"]?["message"]?.GetValue<string>() ?? resp.StatusCode.ToString());

        SetTokens(json["idToken"]!.GetValue<string>(), json["refreshToken"]!.GetValue<string>(), json["expiresIn"]!.GetValue<string>());
    }

    public void RestoreSession(string refreshToken) => _refreshToken = refreshToken;

    private async Task RefreshAsync()
    {
        var cfg = await configService.GetAsync();
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = _refreshToken
        });
        var resp = await http.PostAsync($"https://securetoken.googleapis.com/v1/token?key={Uri.EscapeDataString(cfg.ApiKey)}", form);
        var json = await resp.Content.ReadFromJsonAsync<JsonObject>() ?? new JsonObject();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException(json["error"]?["message"]?.GetValue<string>() ?? resp.StatusCode.ToString());

        SetTokens(json["id_token"]!.GetValue<string>(), json["refresh_token"]!.GetValue<string>(), json["expires_in"]!.GetValue<string>());
    }

    private void SetTokens(string idToken, string refreshToken, string expiresInSeconds)
    {
        _idToken = idToken;
        _refreshToken = refreshToken;
        _expiresAt = DateTimeOffset.UtcNow.AddSeconds(double.Parse(expiresInSeconds));
    }

    private async Task EnsureFreshTokenAsync()
    {
        if (string.IsNullOrEmpty(_idToken)) throw new InvalidOperationException("neautentificat");
        if (DateTimeOffset.UtcNow > _expiresAt.AddMinutes(-2)) await RefreshAsync();
    }

    public async Task<JsonNode?> GetAsync(string path)
    {
        await EnsureFreshTokenAsync();
        var cfg = await configService.GetAsync();
        var resp = await http.GetAsync($"{cfg.DbUrl.TrimEnd('/')}{path}.json?auth={Uri.EscapeDataString(_idToken)}");
        await EnsureSuccessAsync(resp);
        var text = await resp.Content.ReadAsStringAsync();
        return string.IsNullOrWhiteSpace(text) || text == "null" ? null : JsonNode.Parse(text);
    }

    public async Task PutAsync(string path, object? value)
    {
        await EnsureFreshTokenAsync();
        var cfg = await configService.GetAsync();
        var resp = await http.PutAsJsonAsync($"{cfg.DbUrl.TrimEnd('/')}{path}.json?auth={Uri.EscapeDataString(_idToken)}", value);
        await EnsureSuccessAsync(resp);
    }

    public async Task DeleteAsync(string path)
    {
        await EnsureFreshTokenAsync();
        var cfg = await configService.GetAsync();
        var resp = await http.DeleteAsync($"{cfg.DbUrl.TrimEnd('/')}{path}.json?auth={Uri.EscapeDataString(_idToken)}");
        await EnsureSuccessAsync(resp);
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage resp)
    {
        if (resp.IsSuccessStatusCode) return;
        var body = await resp.Content.ReadAsStringAsync();
        throw new InvalidOperationException($"{(int)resp.StatusCode} {body[..Math.Min(100, body.Length)]}");
    }
}
