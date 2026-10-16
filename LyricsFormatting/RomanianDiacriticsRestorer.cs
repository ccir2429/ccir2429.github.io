using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace LyricsFormatting;

/// <summary>
/// Restores Romanian diacritics (ă, â, î, ș, ț) in lyrics typed without them,
/// using a built-in dictionary plus heuristic suffix rules.
/// </summary>
public static class RomanianDiacriticsRestorer
{
    const string Words = """
și în să că mă îmi îți își îl îi ție înainte înapoi între întru încă însă încât întâi întotdeauna întreg întreaga întregul încet început începe încep înțeles înțeleg înțelept înțelepciune înger îngeri îngerii îngerul îngerilor înviat înviere învie învățat învață învățător îndurare îndurat închinare închin închinăm închis închid încredere înălțime înălțat înălțăm înălțare înălț îngenuncheat îngenunchez împărat împărăție împărăția împărați împlinit împlinește împreună împotriva îmbrățișat îmbrăcat înconjurat întors întoarce întoarcere întorc întâlnit întâlnire întreabă întrebare întărit întărește întins întinde întristat întristare întuneric întunericul întunecat înflorit înflorește înfloresc înfrânt învins învinge învingător îndoială îndrăznesc îndreptat îngrijit îngădui înnoit înnoiește îndepărtat îngropat îmbie îndemn
când cât către căci care cărui cărei cărora căreia fără după până așa acasă țara țară țări țărână mână mâna mâini mâinile viață viața vieți vieții cuvânt cuvântul cuvinte pământ pământul pământului sfânt sfântă sfinți sfinții sfântul gând gânduri gândesc gândești gândit rând rânduri vânt vântul stâncă stânca câmp câmpul câmpii câine mâine pâine pâinea plâng plâns plânge plângi plângem râd râde râs sânge sângele sângelui
mântuire mântuit mântuiește mântuiesc mântuitor mântuitorul binecuvântat binecuvântare binecuvântez binecuvântează cânt cântăm cântați cântă cântare cântări cântec cântece cântând lăudat lăudăm lăudați slavă slăvit slăvesc slăvește mărire mărit măreț măreață măreție mărturie mărturisesc mărturisit mărturisire mulțumesc mulțumim mulțumit mulțumire mulțime puțin puține puțini puțină aștept aștepți așteaptă așteptăm așteptat
păcat păcate păcatele păcătos păcătoși nădejde nădejdea iertare iartă rugăciune rugăciuni rugă rugăm credință credința credincios credincioși credincioșie frumusețe frumusețea frumoasă tărie păstor păstorul turmă turma răstignit răscumpărat răscumpărare răsplată răsărit răsare răsar răbdare răutate rău răi răni rană rămâne rămân rămas rămâi rămânem umblat umblăm umbră umbra urcă urmă urme urmează ură ușa ușă uși ușor ușurare vrăjmaș vrăjmași vrednic vrednică zâmbet zâmbește zăpadă
lăcaș lăsat lasă las lași lângă lanț lanțuri legământ limbă limba limbi greșeală greșit greșesc grijă griji grăbit grădină grădina ființă ființa față fața fapte faptă faptele făcut făcător făptură făgăduință fântână frământat frânt frică frica frunză născut naște nașterea naștere născătoare neprihănit neprihănire nesfârșit nesfârșită nemărginit neînțeles odihnă odihna odihnit odihnește plăcut plăcere plătit poartă porți poruncă poruncit povară povățuiește
sărac săraci sărăcie sărbătoare sărbători sărut sărutat sătul săgeată sămânță sănătate sănătos săvârșit sfârșit sfârșește sfat sfătuit târziu tânăr tăcere tăcut tămăduit tărâm trăiesc trăiește trăiești trăit trăim trăi trup trezit trudă tristețe ținut țin ține ții ținem țineți țesut adânc adâncul adâncuri adâncime adăpost adevăr adevărul adevărat adevărată alături alinat arătat arată arăți atâta atâți atâtea atât așezat așază bătut bat băut băiat băieți bărbat bărbați bătrân bătrâni brațe brațul brațele curând cuprins cunoscut dușman dușmani dușmanii dăruit dăruiește dăruiești dărui dăruire dăinuie deșert deșertul deșarte
pași pașii păzit păzește păzesc păzi pătimit părăsit părăsesc păși pădure păduri păsări părinte părinți părintele părinții părți pătrunde patimă cădere căzut căutat căută căutăm căință călător călători călătorie căldură călăuză căi căile cărare cărări cărți mărgăritar mâhnit mâhnire mângâiere mângâi mângâiat mângâietor tău tăi toți toată veșmânt veșminte veșnic veșnică veșnicie șoapte șoaptă șoptesc șters șterge știință știu știi știe știm știți ești hotărât hotărâre hrănit hrană jertfă jertfa jertfit
""";

    static readonly Dictionary<string, string> Builtin = BuildDictionary();

    static readonly HashSet<string> AfterCa = new()
    {
        "eu", "tu", "el", "ea", "noi", "voi", "ei", "ele", "ai", "am", "au", "a", "ati", "esti", "este",
        "sunt", "suntem", "nu", "mi", "ti", "te", "m", "imi", "iti", "tot", "te-ai", "vei", "vom"
    };

    static readonly HashSet<string> NotEste = new()
    {
        "este", "peste", "veste", "aceste", "poveste", "oaste", "ceste", "teste", "maestre", "neste", "deste"
    };

    static readonly Regex WordSplit = new("([A-Za-z]+)", RegexOptions.Compiled);

    /// <summary>
    /// Adds Romanian diacritics to the given lyrics and returns the formatted text.
    /// </summary>
    /// <param name="lyrics">Lyrics written without diacritics.</param>
    /// <param name="customCorrections">Optional overrides (word without diacritics -> corrected word).</param>
    public static string Restore(string lyrics, IReadOnlyDictionary<string, string>? customCorrections = null)
    {
        if (string.IsNullOrEmpty(lyrics)) return lyrics ?? string.Empty;

        Dictionary<string, string>? custom = null;
        if (customCorrections != null)
        {
            custom = new();
            foreach (var kv in customCorrections)
            {
                var key = Strip(kv.Key.Trim());
                if (key.Length > 0 && !string.IsNullOrWhiteSpace(kv.Value)) custom[key] = kv.Value.Trim();
            }
        }

        var parts = WordSplit.Split(lyrics);
        var sb = new StringBuilder(lyrics.Length);
        for (int i = 0; i < parts.Length; i++)
        {
            var p = parts[i];
            if (i % 2 == 0) { sb.Append(p); continue; }

            var k = p.ToLowerInvariant();
            string? r = null;
            if (custom != null && custom.TryGetValue(k, out var c)) r = c;
            else if (Builtin.TryGetValue(k, out var b)) r = b;

            if (r == null && k == "ca")
            {
                var nx = i + 2 < parts.Length ? parts[i + 2].ToLowerInvariant() : "";
                if (AfterCa.Contains(nx)) r = "că";
            }
            r ??= Guess(k);

            sb.Append(r != null && r != k ? ApplyCase(p, r) : p);
        }
        return sb.ToString();
    }

    static Dictionary<string, string> BuildDictionary()
    {
        var map = new Dictionary<string, string>();
        foreach (var w in Words.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            map.TryAdd(Strip(w), w);
        return map;
    }

    static string Strip(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(ch switch { 'ț' or 'ţ' => 't', 'ș' or 'ş' => 's', _ => ch });
        }
        return sb.ToString().ToLowerInvariant();
    }

    static string? Guess(string w)
    {
        int n = w.Length;
        if (w.EndsWith("esti") && n > 4) return w[..^4] + "ești";
        if (w.EndsWith("este") && n >= 7 && !NotEste.Contains(w)) return w[..^4] + "ește";
        if (w.EndsWith("tiune")) return w[..^5] + "țiune";
        if (w.EndsWith("tiuni")) return w[..^5] + "țiuni";
        if (Regex.IsMatch(w, "[^s]tie$")) return w[..^3] + "ție";
        if (w.EndsWith("easca")) return w[..^5] + "ească";
        if (w.EndsWith("ti") && w != "anti" && w != "forti") return w[..^2] + "ți";
        if (w.EndsWith("and") && n >= 5) return w[..^3] + "ând";
        return null;
    }

    static string ApplyCase(string src, string result)
    {
        if (src.Length > 1 && src == src.ToUpperInvariant()) return result.ToUpperInvariant();
        if (char.IsUpper(src[0])) return char.ToUpperInvariant(result[0]) + result[1..];
        return result;
    }
}
