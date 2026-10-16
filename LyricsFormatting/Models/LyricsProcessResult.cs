namespace LyricsFormatting;

public record LyricsProcessResult(string Text, List<LyricsBlock> Blocks, int Added, string Summary, bool Empty);
