using System.Text;
using System.Text.RegularExpressions;

namespace LyricsFormatting;

public enum BlockKind { Unknown, Verse, Chorus, Other }

public class LyricsBlock
{
    public BlockKind Kind { get; set; } = BlockKind.Unknown;
    public List<string> Lines { get; set; } = new();
    public int Start { get; set; }
    public int End { get; set; }
    public bool Added { get; set; }
    public string? Key { get; set; }
}

public record LyricsProcessResult(string Text, List<LyricsBlock> Blocks, int Added, string Summary, bool Empty);

/// <summary>
/// Pure, reusable lyrics formatting logic (parsing, classifying verses/choruses, and
/// auto-inserting choruses after each verse) extracted so it can be shared across apps.
/// </summary>
public static class LyricsFormatter
{
    public static LyricsProcessResult Process(string lyrics, string encoding = "unicode")
    {
        var (blocks, _) = ParseLyrics(lyrics);
        ClassifyBlocks(blocks);
        var nVerses = blocks.Count(b => b.Kind == BlockKind.Verse);
        var nChorus = blocks.Count(b => b.Kind == BlockKind.Chorus);
        var (placedBlocks, added) = PlaceChorus(blocks);

        var sb = new StringBuilder();
        int offset = 0;
        foreach (var b in placedBlocks)
        {
            if (sb.Length > 0) { sb.Append("\n\n"); offset += 2; }
            b.Start = offset;
            var text = string.Join('\n', b.Lines);
            if (encoding == "romanian") text = RomanianDiacriticsForDualDisplay(text);
            sb.Append(text);
            offset += text.Length;
            b.End = offset;
        }

        string summary;
        if (nVerses == 0 && nChorus == 0)
        {
            summary = "No verses or chorus detected.";
        }
        else
        {
            summary = $"Found {nVerses} {(nVerses == 1 ? "verse" : "verses")}{(nChorus > 0 ? " and " + nChorus + " chorus(es)" : "")}.";
            if (nChorus == 0) summary += " No chorus was detected. Label it Refren or Chorus, or repeat it, so it can follow each verse.";
            else if (added > 0) summary += $" Added the chorus after {added} {(added == 1 ? "verse" : "verses")}.";
            else summary += " The chorus already follows every verse, so none was added.";
        }

        var textOut = sb.ToString();
        return new LyricsProcessResult(textOut, placedBlocks, added, summary, placedBlocks.Count == 0);
    }

    static (List<LyricsBlock> Blocks, int Added) PlaceChorus(List<LyricsBlock> blocks)
    {
        var first = blocks.FirstOrDefault(b => b.Kind == BlockKind.Chorus);
        var outBlocks = new List<LyricsBlock>();
        LyricsBlock? current = null; int added = 0;
        for (int i = 0; i < blocks.Count; i++)
        {
            var b = blocks[i];
            outBlocks.Add(b);
            if (b.Kind == BlockKind.Chorus) current = b;
            if (b.Kind == BlockKind.Verse)
            {
                var next = i + 1 < blocks.Count ? blocks[i + 1] : null;
                if (next != null && next.Kind == BlockKind.Chorus) continue;
                var ch = current ?? first;
                if (ch != null)
                {
                    var copy = new LyricsBlock { Kind = BlockKind.Chorus, Lines = new List<string>(ch.Lines), Added = true };
                    outBlocks.Add(copy);
                    added++;
                }
            }
        }
        return (outBlocks, added);
    }

    static void ClassifyBlocks(List<LyricsBlock> blocks)
    {
        var V = blocks.Count(b => b.Kind == BlockKind.Verse);
        var C = blocks.Count(b => b.Kind == BlockKind.Chorus);
        var un = blocks.Where(b => b.Kind == BlockKind.Unknown).ToList();
        if (!un.Any()) return;
        if (V > 0 && C == 0) { foreach (var b in un) b.Kind = BlockKind.Chorus; }
        else if (V > 0 || C > 0) { foreach (var b in un) b.Kind = BlockKind.Verse; }
        else
        {
            var count = new Dictionary<string, int>();
            foreach (var b in blocks)
            {
                b.Key = string.Join(' ', b.Lines).ToLowerInvariant();
                count[b.Key] = count.GetValueOrDefault(b.Key) + 1;
            }
            foreach (var b in un) b.Kind = (!string.IsNullOrEmpty(b.Key) && count[b.Key] > 1) ? BlockKind.Chorus : BlockKind.Verse;
        }
    }

    static (List<LyricsBlock> Blocks, int LabelsRemoved) ParseLyrics(string raw)
    {
        var lines = raw.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n');
        var groups = new List<List<string>>();
        var cur = new List<string>();
        foreach (var l in lines)
        {
            if (string.IsNullOrWhiteSpace(l) || Regex.IsMatch(l, @"^\s*[-\u2013\u2014_=*]{3,}\s*$"))
            {
                if (cur.Count > 0) { groups.Add(cur); cur = new List<string>(); }
            }
            else
            {
                cur.Add(l.Trim().Replace("\t", " ").Replace("  ", " "));
            }
        }
        if (cur.Count > 0) groups.Add(cur);

        var blocks = new List<LyricsBlock>();
        int labelsRemoved = 0;
        foreach (var g in groups)
        {
            var gg = new List<string>(g);
            BlockKind? kind = null;
            if (gg.Count >= 2 && gg.All(l => Regex.IsMatch(l, @"^\d{1,2}\s*[.):\-\u2013]\s*(?!\d)")))
            {
                gg = gg.Select(l => Regex.Replace(l, @"^\d{1,2}\s*[.):\-\u2013]\s*", "")).Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
                labelsRemoved += gg.Count;
                kind = BlockKind.Verse;
            }
            else
            {
                var lab = DetectLabel(gg[0]);
                if (lab != null)
                {
                    kind = lab.Value.kind;
                    labelsRemoved++;
                    if (!string.IsNullOrEmpty(lab.Value.rest)) gg[0] = lab.Value.rest; else gg.RemoveAt(0);
                }
            }
            if (!gg.Any()) continue;
            blocks.Add(new LyricsBlock { Kind = kind ?? BlockKind.Unknown, Lines = gg });
        }

        return (blocks, labelsRemoved);
    }

    static (BlockKind kind, string rest)? DetectLabel(string line)
    {
        line = line.Trim();
        var RE_BRACKET = new Regex(@"^[\[(]\s*([^\])]{1,24}?)\s*[\])]\s*(.*)$", RegexOptions.Compiled);
        var m = RE_BRACKET.Match(line);
        if (m.Success)
        {
            var inner = m.Groups[1].Value;
            var k = ClassifyInner(inner);
            if (k != null) return (k.Value, m.Groups[2].Value.Trim());
        }
        if (Regex.IsMatch(line, @"^(?:refren(?:ul)?|chorus)\b\s*\d{0,2}", RegexOptions.IgnoreCase)) return (BlockKind.Chorus, RemovePrefix(line));
        if (Regex.IsMatch(line, @"^(?:bridge|pod|punte|interludiu|interlude|intro|outro)\s*\d{0,2}", RegexOptions.IgnoreCase)) return (BlockKind.Other, RemovePrefix(line));
        if (Regex.IsMatch(line, @"^(?:strofa|strof\u0103|verse|vers)\s*\d{1,2}", RegexOptions.IgnoreCase)) return (BlockKind.Verse, RemovePrefix(line));
        if (Regex.IsMatch(line, @"^v\s*\d{1,2}", RegexOptions.IgnoreCase)) return (BlockKind.Verse, RemovePrefix(line));
        if (Regex.IsMatch(line, @"^\d{1,2}\s*[.):\-\u2013]\s*(?!\d)")) return (BlockKind.Verse, RemovePrefix(line));
        if (Regex.IsMatch(line, @"^\d{1,2}$")) return (BlockKind.Verse, RemovePrefix(line));
        return null;
    }

    static BlockKind? ClassifyInner(string inner)
    {
        if (Regex.IsMatch(inner, @"^(?:refren(?:ul)?|chorus|cor|ref|r)\s*\d{0,2}(?:\s*x\s*\d+)?$", RegexOptions.IgnoreCase)) return BlockKind.Chorus;
        if (Regex.IsMatch(inner, @"^(?:(?:strofa|strof\u0103|verse|vers|v)\s*)?\d{1,2}$", RegexOptions.IgnoreCase)) return BlockKind.Verse;
        if (Regex.IsMatch(inner, @"^(?:bridge|pod|punte|interludiu|interlude|intro|outro)\s*\d{0,2}$", RegexOptions.IgnoreCase)) return BlockKind.Other;
        return null;
    }

    static string RemovePrefix(string line)
    {
        // remove leading label like "Chorus:" or "1." keeping rest
        var idx = line.IndexOfAny(new char[] { ':', '.', ')', '-', '\u2013' });
        if (idx >= 0 && idx < 6) return line.Substring(idx + 1).Trim();
        // fallback: remove known words
        line = Regex.Replace(line, @"^(?:refren(?:ul)?|chorus|cor|ref|r|strofa|strof\u0103|verse|vers|v|intro|outro|bridge)\b\s*\d{0,2}[:.)\-\u2013]?\s*", "", RegexOptions.IgnoreCase);
        return line.Trim();
    }

    public static string RomanianDiacriticsForDualDisplay(string s)
    {
        var map = new Dictionary<char, char>()
        {
            {'ă','ă'},{'Ă','Ă'},{'â','â'},{'Â','Â'},{'ș','ş'},{'Ș','Ş'},{'ş','ş'},{'Ş','Ş'},{'ț','ţ'},{'Ț','Ţ'},{'ţ','ţ'},{'Ţ','Ţ'}
        };
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s)
        {
            if (map.TryGetValue(ch, out var r)) sb.Append(r); else sb.Append(ch);
        }
        return sb.ToString();
    }
}
