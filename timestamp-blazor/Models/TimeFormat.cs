namespace TimestampBlazor.Models;

public static class TimeFormat
{
    public static string Format(double t)
    {
        t = Math.Max(0, Math.Floor(t));
        var total = (int)t;
        var h = total / 3600;
        var m = total % 3600 / 60;
        var s = total % 60;
        return h > 0 ? $"{h}:{m:D2}:{s:D2}" : $"{m}:{s:D2}";
    }

    public static int? Parse(string s)
    {
        var parts = s.Trim().Split(':');
        if (parts.Length == 0) return null;
        var nums = new int[parts.Length];
        for (var i = 0; i < parts.Length; i++)
        {
            if (!int.TryParse(parts[i], out var n) || n < 0) return null;
            nums[i] = n;
        }
        var total = 0;
        foreach (var n in nums) total = total * 60 + n;
        return total;
    }
}
