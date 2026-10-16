namespace LyricsFormatting;

public class LyricsBlock
{
    public BlockKind Kind { get; set; } = BlockKind.Unknown;
    public List<string> Lines { get; set; } = new();
    public int Start { get; set; }
    public int End { get; set; }
    public bool Added { get; set; }
    public string? Key { get; set; }
}
