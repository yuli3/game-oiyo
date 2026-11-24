using UnityEngine;

// The game page loads this build as index.html?lang=<ko|en|ja|zh|fr|es>.
// Code() reads that parameter (falling back to the browser/system language);
// Pick() returns it when the game supports it, otherwise English.
public static class OiyoLang
{
    static readonly string[] Known = { "ko", "en", "ja", "zh", "fr", "es" };

    public static string Code() => UrlCode() ?? SystemCode();

    // The ?lang= value, or null when the page did not pass a known one.
    public static string UrlCode()
    {
        string url = Application.absoluteURL;
        if (!string.IsNullOrEmpty(url))
        {
            int q = url.IndexOf('?');
            if (q >= 0)
            {
                string query = url.Substring(q + 1);
                int hash = query.IndexOf('#');
                if (hash >= 0) query = query.Substring(0, hash);
                foreach (var part in query.Split('&'))
                {
                    int eq = part.IndexOf('=');
                    if (eq <= 0 || part.Substring(0, eq) != "lang") continue;
                    string v = System.Uri.UnescapeDataString(part.Substring(eq + 1)).Trim().ToLowerInvariant();
                    if (v.Length > 2) v = v.Substring(0, 2);
                    if (System.Array.IndexOf(Known, v) >= 0) return v;
                }
            }
        }
        return null;
    }

    static string SystemCode()
    {
        switch (Application.systemLanguage)
        {
            case SystemLanguage.Korean: return "ko";
            case SystemLanguage.Japanese: return "ja";
            case SystemLanguage.Chinese:
            case SystemLanguage.ChineseSimplified:
            case SystemLanguage.ChineseTraditional: return "zh";
            case SystemLanguage.French: return "fr";
            case SystemLanguage.Spanish: return "es";
            default: return "en";
        }
    }

    public static string Pick(params string[] supported)
    {
        string code = Code();
        if (System.Array.IndexOf(supported, code) >= 0) return code;
        return "en";
    }

    public static bool IsKorean(params string[] supported) => Pick(supported) == "ko";
}
