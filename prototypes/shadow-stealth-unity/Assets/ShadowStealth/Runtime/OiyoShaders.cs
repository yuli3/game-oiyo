using UnityEngine;

// WebGL builds only contain shaders that an asset references or that are in
// Always Included Shaders. Shader.Find for URP/Standard returned null here and
// new Material(null) threw, leaving a blank scene. Never hand a null shader on.
public static class OiyoShaders
{
    static readonly string[] Fallbacks = { "Standard", "Legacy Shaders/Diffuse", "Unlit/Color", "Sprites/Default" };

    public static Shader Safe(Shader preferred)
    {
        // Mobile/Diffuse has no _Color, so material.color tints were dropped (everything white).
        if (preferred != null && preferred.name != "Mobile/Diffuse") return preferred;
        foreach (var name in Fallbacks)
        {
            var s = Shader.Find(name);
            if (s != null) return s;
        }
        return Shader.Find("Hidden/Internal-Colored");
    }
}
