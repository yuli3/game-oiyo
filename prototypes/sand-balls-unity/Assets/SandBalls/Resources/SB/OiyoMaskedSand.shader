// Painted sand whose alpha comes from a runtime dig mask (_MaskTex, white = sand, clear = dug).
// Lives in Resources so WebGL builds always include it (Shader.Find needs that).
Shader "OIYO/MaskedSand"
{
    Properties
    {
        _MainTex ("Painted sand", 2D) = "white" {}
        _MaskTex ("Dig mask", 2D) = "white" {}
        _Color ("Tint", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex;
            sampler2D _MaskTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; float2 raw : TEXCOORD1; };
            v2f vert (appdata_base v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.texcoord, _MainTex);
                o.raw = v.texcoord.xy;
                return o;
            }
            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 c = tex2D(_MainTex, i.uv) * _Color;
                fixed m = tex2D(_MaskTex, i.raw).a;
                c.a *= smoothstep(0.35, 0.65, m);
                return c;
            }
            ENDCG
        }
    }
}
