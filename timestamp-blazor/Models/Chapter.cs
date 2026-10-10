namespace TimestampBlazor.Models;

public sealed class Chapter
{
    public int T { get; set; }
    public bool Approx { get; set; }
    public string Act { get; set; } = "";
    public string Person { get; set; } = "";
    public string Details { get; set; } = "";

    public string TimeText
    {
        get => TimeFormat.Format(T);
        set { var v = TimeFormat.Parse(value); if (v is not null) T = v.Value; }
    }

    public string Line() =>
        $"{TimeFormat.Format(T)}{(Approx ? " (aprox)" : "")}" +
        $"{(string.IsNullOrEmpty(Act) ? "" : " - " + Act)}" +
        $"{(string.IsNullOrEmpty(Person) ? "" : " - " + Person)}" +
        $"{(string.IsNullOrEmpty(Details) ? "" : " - " + Details)}";
}

