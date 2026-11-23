using UnityEngine;

// WebGL has no system fonts, so IMGUI's built-in font drew Hangul, kana and kanji as blanks.
// Resources/OiyoFont/OiyoUI.ttf is a Noto Sans KR+JP subset of this game's strings
// (see scripts/build-fonts.py). Call Apply() at the top of OnGUI.
public static class OiyoUiFont
{
    static Font font;
    static bool loaded;

    public static void Apply()
    {
        if (!loaded) { font = Resources.Load<Font>("OiyoFont/OiyoUI"); loaded = true; }
        if (font != null) GUI.skin.font = font;
    }
}
