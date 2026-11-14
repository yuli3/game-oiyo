// Deep module for procedural audio synthesis (12 event SFX cues + 3-layer harmonic BGM).
// Separated from SlicePlayer (2026-11-14) per codebase-design deep-module architecture.
using UnityEngine;

namespace Oiyo.Neon
{
    public sealed class NeonAudioBank
    {
        public AudioClip UiClick;
        public AudioClip Shot;
        public AudioClip ArmorHit;
        public AudioClip Pickup;
        public AudioClip Dash;
        public AudioClip Kill;
        public AudioClip Hit;
        public AudioClip Upgrade;
        public AudioClip BossWarn;
        public AudioClip BossVolley;
        public AudioClip BossDown;
        public AudioClip Win;
        public AudioClip Lose;
        public AudioClip Music;
    }

    public static class NeonAudioSynth
    {
        public static NeonAudioBank CreateBank()
        {
            return new NeonAudioBank
            {
                UiClick = LayeredCue("ui-click", 880, 1320, .04f, 38f, .02f, .14f),
                Shot = LayeredCue("shot-pulse", 680, 420, .055f, 32f, .04f, .15f),
                ArmorHit = LayeredCue("armor-clang", 240, 720, .07f, 24f, .08f, .18f),
                Pickup = LayeredCue("shard-pickup", 920, 1380, .08f, 22f, .01f, .14f),
                Dash = LayeredCue("ion-dash", 310, 620, .14f, 14f, .12f, .2f),
                Kill = LayeredCue("enemy-break", 290, 870, .14f, 16f, .15f, .18f),
                Hit = LayeredCue("hull-hit", 135, 92, .16f, 12f, .22f, .24f),
                Upgrade = Arpeggio("level-choice", new float[] { 523.25f, 659.25f, 783.99f }, .28f, .16f),
                BossWarn = LayeredCue("warden-warning", 220, 330, .48f, 4.5f, .06f, .22f),
                BossVolley = LayeredCue("warden-volley", 195, 585, .22f, 10f, .14f, .2f),
                BossDown = Arpeggio("warden-defeated", new float[] { 392f, 523.25f, 659.25f, 783.99f }, .52f, .2f),
                Win = Arpeggio("extraction-win", new float[] { 440f, 554.37f, 659.25f, 880f }, .62f, .2f),
                Lose = Arpeggio("signal-lost", new float[] { 311.13f, 277.18f, 220f, 164.81f }, .58f, .2f),
                Music = Drone("orbit-bgm", 73.42f, 12f)
            };
        }

        static AudioClip LayeredCue(string label, float f0, float f1, float seconds, float decay, float noiseMix, float gain)
        {
            const int rate = 22050;
            int count = Mathf.RoundToInt(rate * seconds);
            var data = new float[count];
            uint seed = (uint)label.GetHashCode() ^ 0x9E3779B9u;
            float phaseA = 0, phaseB = 0;
            for (int i = 0; i < count; i++)
            {
                float t = i / (float)rate, u = i / (float)count;
                float hz = Mathf.Lerp(f0, f1, u);
                phaseA += 2 * Mathf.PI * hz / rate;
                phaseB += 2 * Mathf.PI * (hz * 1.498f) / rate;
                seed = seed * 1664525 + 1013904223;
                float noise = ((seed >> 8) / 8388608f - 1f) * noiseMix * Mathf.Exp(-t * decay * 1.8f);
                float attack = Mathf.Clamp01(t * 240f);
                float env = attack * Mathf.Exp(-t * decay);
                data[i] = Mathf.Clamp((.68f * Mathf.Sin(phaseA) + .32f * Mathf.Sin(phaseB) + noise) * env * gain, -.9f, .9f);
            }
            var clip = AudioClip.Create(label, count, 1, rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip Arpeggio(string label, float[] notes, float seconds, float gain)
        {
            const int rate = 22050;
            int count = Mathf.RoundToInt(rate * seconds);
            var data = new float[count];
            for (int i = 0; i < count; i++)
            {
                float t = i / (float)rate, u = Mathf.Clamp01(i / (float)count);
                int idx = Mathf.Min(notes.Length - 1, Mathf.FloorToInt(u * notes.Length));
                float localT = (u * notes.Length - idx) * (seconds / notes.Length);
                float hz = notes[idx];
                float env = Mathf.Clamp01(localT * 180f) * Mathf.Exp(-localT * 7.5f);
                data[i] = (Mathf.Sin(2 * Mathf.PI * hz * t) + .42f * Mathf.Sin(2 * Mathf.PI * hz * 1.5f * t)) * env * gain;
            }
            var clip = AudioClip.Create(label, count, 1, rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip Drone(string label, float hz, float seconds)
        {
            const int rate = 22050;
            int count = Mathf.RoundToInt(rate * seconds);
            var data = new float[count];
            for (int i = 0; i < count; i++)
            {
                float t = i / (float)rate, swell = .65f + .35f * Mathf.Sin(t * Mathf.PI * 2 / seconds);
                float sub = .55f * Mathf.Sin(2 * Mathf.PI * hz * t);
                float fifth = .25f * Mathf.Sin(2 * Mathf.PI * hz * 1.5f * t);
                float shimmer = .12f * Mathf.Sin(2 * Mathf.PI * hz * 2f * t + Mathf.Sin(t * 1.5f));
                data[i] = swell * (sub + fifth + shimmer) * .09f;
            }
            var clip = AudioClip.Create(label, count, 1, rate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
