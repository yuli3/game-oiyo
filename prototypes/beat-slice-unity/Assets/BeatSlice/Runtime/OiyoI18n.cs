using System.Collections.Generic;

// Fills the languages a Unity build did not ship with (zh, fr) and translates its
// hardcoded English HUD text. The table is generated per build into OiyoI18nTable.cs
// from scripts/unity/oiyo-i18n/tables/<build>.json by scripts/unity/oiyo-i18n/install.py.
// Edit the shared source there, not the copies in each build.
public static partial class OiyoI18n
{
    static readonly string[] Order = { "ko", "ja", "es", "zh", "fr" };
    static string page;

    /// <summary>The page language from ?lang= (ko, en, ja, zh, fr, es).</summary>
    public static string Page => page ??= OiyoLang.Code();

    /// <summary>
    /// Language to show when the game itself is set to English: the page's zh or fr
    /// when the game has no such language of its own, otherwise English.
    /// </summary>
    public static string ForEnglish => Page == "zh" || Page == "fr" ? Page : "en";

    /// <summary>English text in the given language when the table has it, else the English text.</summary>
    public static string Ui(string en, string lang)
    {
        if (string.IsNullOrEmpty(en) || lang == "en" || lang == null) return en;
        int i = System.Array.IndexOf(Order, lang);
        if (i < 0 || !Table.TryGetValue(en, out var row) || row == null || i >= row.Length) return en;
        return string.IsNullOrEmpty(row[i]) ? en : row[i];
    }

    /// <summary>For a game's own English string: the zh/fr translation on zh/fr pages.</summary>
    public static string En(string en) => Ui(en, ForEnglish);
}
