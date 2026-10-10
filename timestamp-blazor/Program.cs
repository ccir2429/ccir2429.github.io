using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using TimestampBlazor;
using TimestampBlazor.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<ConfigService>();
builder.Services.AddScoped<LocalStore>();
builder.Services.AddScoped<BrowserUtilService>();
builder.Services.AddScoped<FirebaseService>();
builder.Services.AddTransient<SseClient>();
builder.Services.AddTransient<YouTubePlayer>();

await builder.Build().RunAsync();
