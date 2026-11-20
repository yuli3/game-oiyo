using UnityEngine;

namespace FireflyKeeper
{
    /// <summary>Procedural sounds: no audio files are shipped.</summary>
    public static class FkSynth
    {
        const int Rate = 44100;

        public static AudioClip Chime(string name, float[] freqs, float noteLen, float decay, float vol)
        {
            int n = Mathf.CeilToInt(Rate * (noteLen * freqs.Length + decay));
            var data = new float[n];
            for (int k = 0; k < freqs.Length; k++)
            {
                int start = Mathf.RoundToInt(k * noteLen * Rate);
                int len = Mathf.RoundToInt((noteLen + decay) * Rate);
                for (int i = 0; i < len && start + i < n; i++)
                {
                    float t = i / (float)Rate;
                    float env = Mathf.Exp(-t * 5f / (noteLen + decay)) * Mathf.Min(1f, t * 400f);
                    float s = Mathf.Sin(2f * Mathf.PI * freqs[k] * t) + 0.35f * Mathf.Sin(4f * Mathf.PI * freqs[k] * t) + 0.12f * Mathf.Sin(6.01f * Mathf.PI * freqs[k] * t);
                    data[start + i] += s * env * vol * 0.6f;
                }
            }
            return Make(name, data);
        }

        public static AudioClip Thud(string name, float freq, float len, float vol)
        {
            int n = Mathf.CeilToInt(Rate * len);
            var data = new float[n];
            var rng = new System.Random(7);
            float phase = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)Rate;
                float f = freq * (1f - 0.6f * t / len);
                phase += 2f * Mathf.PI * f / Rate;
                float env = Mathf.Exp(-t * 7f / len);
                float noise = (float)(rng.NextDouble() * 2.0 - 1.0) * Mathf.Exp(-t * 30f);
                data[i] = (Mathf.Sin(phase) * 0.8f + noise * 0.4f) * env * vol;
            }
            return Make(name, data);
        }

        /// <summary>Soft night pad in a pentatonic mode, seamless loop.</summary>
        public static AudioClip Pad(string name, float seconds)
        {
            int n = Mathf.CeilToInt(Rate * seconds);
            var data = new float[n];
            float[] chord = { 130.81f, 196f, 261.63f, 293.66f, 392f };
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)Rate;
                float s = 0f;
                for (int c = 0; c < chord.Length; c++)
                {
                    // integer cycles per loop keep the loop seamless
                    float f = Mathf.Round(chord[c] * seconds) / seconds;
                    float lfo = 0.5f + 0.5f * Mathf.Sin(2f * Mathf.PI * (c + 1) * t / seconds);
                    s += Mathf.Sin(2f * Mathf.PI * f * t) * lfo / chord.Length;
                }
                data[i] = s * 0.18f;
            }
            return Make(name, data);
        }

        static AudioClip Make(string name, float[] data)
        {
            float peak = 0.0001f;
            foreach (var v in data) peak = Mathf.Max(peak, Mathf.Abs(v));
            if (peak > 0.95f) for (int i = 0; i < data.Length; i++) data[i] *= 0.95f / peak;
            var clip = AudioClip.Create(name, data.Length, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
