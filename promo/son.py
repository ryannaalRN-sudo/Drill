"""Bande-son de la pub Drill (37,3 s, 90 BPM, fa majeur) : piano feutré, marimba, groove doux.
Usage : python3 son3.py cues.json sortie.wav [gain]
Tout est synthétisé ; les bruitages, discrets, sont calés sur les indices de la timeline Motion."""
import json, sys
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.io import wavfile

SR = 48000
B = 60 / 90
BAR = 4 * B
DUREE = 14 * BAR
N = int(round(SR * DUREE))
rng = np.random.default_rng(5)


def T(bar, beat=1.0):
    return (bar - 1) * BAR + (beat - 1) * B


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ns(sec):
    return max(1, int(round(sec * SR)))


def tt(n):
    return np.arange(n) / SR


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, sig, t, pan=0.0, g=1.0):
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            st = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
        else:
            st = sig
        i = int(round(t * SR))
        if i < 0:
            st = st[:, -i:]
            i = 0
        e = min(N, i + st.shape[1])
        if e > i:
            self.x[:, i:e] += g * st[:, :e - i]


batterie, musique, sfx, rev_env = Bus(), Bus(), Bus(), Bus()


def _sos(kind, fc, order=2):
    if kind == 'band':
        lo, hi = fc
        return signal.butter(order, [max(20, lo), min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.butter(order, min(max(fc, 20), SR * 0.45), kind, fs=SR, output='sos')


def lp(x, fc, o=2):
    return signal.sosfilt(_sos('low', fc, o), x)


def hp(x, fc, o=2):
    return signal.sosfilt(_sos('high', fc, o), x)


def bp(x, lo, hi, o=2):
    return signal.sosfilt(_sos('band', (lo, hi), o), x)


def fvar(x, fc, kind='low', bloc=64):
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    y = np.empty_like(x)
    zi = None
    for i in range(0, len(x), bloc):
        sos = _sos(kind, float(fc[i]), 2)
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y[i:i + bloc], zi = signal.sosfilt(sos, x[i:i + bloc], zi=zi)
    return y


def saw(f, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    dt = f / SR
    ph = (np.cumsum(dt) + ph0) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= 2 * x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + 2 * x + 1
    return y


def sine(f, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    return np.sin(2 * np.pi * (np.cumsum(f) / SR + ph0))


def bruit(n):
    return rng.standard_normal(n)


def env(n, a=0.002, d=0.2):
    t = tt(n)
    return np.minimum(1, t / max(a, 1e-5)) * np.exp(-np.maximum(0, t - a) / d)


def adsr(n, a, d, s, r, tenue):
    t = tt(n)
    e = np.where(t < a, t / max(a, 1e-5), s + (1 - s) * np.exp(-(t - a) / d))
    rel = np.clip((t - tenue) / r, 0, 1)
    return e * (1 - rel) ** 2


def pan_lin(sig, p0, p1):
    a = (np.linspace(p0, p1, len(sig)) + 1) * np.pi / 4
    return np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)


# ================================================================ instruments
def piano(m, t0, vel=0.5, tenue=1.5, g=0.22):
    """Piano feutré : partiels légèrement inharmoniques, 3 cordes désaccordées, double déclin, étouffoir."""
    f = hz(m)
    long = tenue + 0.35
    n = ns(long)
    t = tt(n)
    Binh = 0.00012 * (f / 262) ** 0.5
    s = np.zeros(n)
    for k in range(1, 15):
        fk = k * f * np.sqrt(1 + Binh * k * k)
        if fk > 10000:
            break
        amp = (1 / k ** 1.25) * vel ** (0.4 + 0.12 * k)
        d1 = 0.25 / (1 + 0.3 * k)
        d2 = 3.2 / (1 + 0.15 * k) * (262 / f) ** 0.35
        ek = 0.55 * np.exp(-t / d1) + 0.45 * np.exp(-t / d2)
        for cent in (-0.7, 0.0, 0.8):
            s += amp * ek * np.sin(2 * np.pi * fk * (1 + cent / 1731) * t + rng.random() * 6.28) / 3
    s += lp(bruit(n), 1800) * env(n, 0.0005, 0.004) * 0.12 * vel
    s = lp(s, 2600 + 5000 * vel)
    etouffe = np.clip((t - tenue) / 0.3, 0, 1)
    s *= (1 - etouffe) ** 2 * np.minimum(1, t / 0.002)
    pan = np.clip((m - 64) / 30, -0.7, 0.7)
    musique.add(s, t0, pan=pan, g=g)
    rev_env.add(s, t0, pan=pan, g=g * 0.55)


def accord(notes, t0, vel=0.5, tenue=1.5, g=0.2, roule=0.012):
    for k, m in enumerate(notes):
        piano(m, t0 + k * roule, vel * (0.85 if k == 0 else 1), tenue, g)


def marimba(m, t0, vel=0.7, g=0.16, pan=0.0):
    f = hz(m)
    n = ns(1.4)
    t = tt(n)
    d = 0.5 * (440 / f) ** 0.5
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / d)
    s += 0.32 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / (d * 0.22))
    s += 0.1 * np.sin(2 * np.pi * f * 9.24 * t) * np.exp(-t / (d * 0.07))
    s += lp(bruit(n), 3000) * env(n, 0.0003, 0.003) * 0.25
    s *= vel * np.minimum(1, t / 0.001)
    musique.add(s, t0, pan=pan, g=g)
    rev_env.add(s, t0, pan=pan, g=g * 0.5)


def nappe(notes, t0, long, g=0.05, fc=1100):
    n = ns(long + 1.0)
    L = np.zeros(n)
    R = np.zeros(n)
    t = tt(n)
    for m in notes:
        for k, d in enumerate([-0.08, 0.07]):
            s = saw(hz(m) * 2 ** (d / 12) * (1 + 0.002 * np.sin(2 * np.pi * (0.3 + k * 0.2) * t)), n, rng.random())
            (L if k == 0 else R)[:] += s
    st = np.vstack([lp(L, fc), lp(R, fc)]) / np.sqrt(2 * len(notes))
    st *= adsr(n, 0.9, 1.0, 0.9, 1.0, long)
    musique.add(st, t0, g=g)
    rev_env.add(st, t0, g=g * 0.6)


def basse(m, t0, dur, g=0.3):
    g *= 0.55
    while m < 38:
        m += 12
    n = ns(dur + 0.08)
    s = sine(hz(m), n) + 0.35 * sine(hz(m) * 2, n) + 0.15 * sine(hz(m) * 3, n)
    s = np.tanh(1.3 * s) * adsr(n, 0.008, 0.35, 0.65, 0.06, dur)
    musique.add(lp(s, 900), t0, g=g)


def kick(g=0.6):
    n = ns(0.45)
    t = tt(n)
    f = 62 + 60 * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.16)
    s += lp(bruit(n), 1200) * env(n, 0.0008, 0.006) * 0.15
    return np.tanh(1.4 * s) * g


def snap():
    n = ns(0.3)
    s = bp(bruit(n), 1600, 5200) * env(n, 0.0008, 0.018)
    s += bp(bruit(n), 900, 2500) * env(n, 0.004, 0.05) * 0.25
    return s


def shaker():
    n = ns(0.09)
    return hp(bruit(n), 5500, 4) * env(n, 0.008, 0.025)


def souffle(t0, long, f0, f1, g=0.1, p0=-0.4, p1=0.4):
    n = ns(long)
    x = hp(bruit(n), 150)
    u = tt(n) / long
    fc = f0 * (f1 / f0) ** u
    y = fvar(x, fc * 1.5) - 0.6 * fvar(x, fc * 0.65)
    y *= np.sin(np.pi * np.clip(u, 0, 1)) ** 1.6
    st = pan_lin(y, p0, p1)
    sfx.add(st, t0, g=g)
    rev_env.add(st, t0, g=g * 0.3)


def montee_inverse(t_fin, long=1.2, g=0.12):
    n = ns(long)
    u = tt(n) / long
    x = hp(bruit(n), 3000) * u ** 2.5
    sfx.add(np.vstack([x, np.roll(x, 61)]), t_fin - long, g=g)


def clochette(m, t0, g=0.06, pan=0.0, long=1.4):
    n = ns(long)
    t = tt(n)
    f = hz(m)
    I = 1.4 * np.exp(-t / 0.15)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t)) * env(n, 0.001, long / 4)
    sfx.add(s, t0, pan=pan, g=g)
    rev_env.add(s, t0, pan=pan, g=g * 0.8)


def clic(f=3000, d=0.008):
    n = ns(0.04)
    return np.sin(2 * np.pi * f * tt(n)) * env(n, 0.0003, d) + bp(bruit(n), 2500, 8000) * env(n, 0.0002, 0.002) * 0.4


# ================================================================ bruitages (discrets)
indices = json.load(open(sys.argv[1]))
temps = {}
for c in indices:
    temps.setdefault(c['k'], []).append(c['t'])


def bfx(k, t, v):
    if k in ('fait', 'question'):
        souffle(t - 0.12, 0.45, 2200, 600, g=0.05 if k == 'fait' else 0.07, p0=0.3, p1=-0.2)
    elif k == 'efface':
        souffle(t, 0.5, 900, 3000, g=0.05, p0=-0.2, p1=0.3)
    elif k in ('aspire', 'implosion'):
        montee_inverse(t + 0.32, 0.9, g=0.1)
    elif k == 'brillance':
        n = ns(1.0)
        sh = hp(bruit(n), 7500) * np.sin(np.pi * tt(n) / 1.0) ** 2
        sfx.add(pan_lin(sh, -0.6, 0.6), t, g=0.025)
    elif k == 'range':
        souffle(t, 0.5, 900, 3500, g=0.06, p0=0.2, p1=-0.6)
    elif k == 'titre':
        souffle(t - 0.1, 0.5, 2600, 700, g=0.05, p0=-0.3, p1=0.3)
    elif k == 'carte':
        souffle(t - 0.05, 0.45, 2400, 700, g=0.05 * v, p0=0.4, p1=-0.1)
    elif k == 'coche':
        sfx.add(clic(2600, 0.01), t, g=0.16)
        clochette(96, t + 0.02, g=0.025)
    elif k == 'dent':
        gamme = [77, 79, 81, 84, 86, 89, 91, 93, 96, 98, 101, 103, 105, 108]
        n = ns(0.2)
        s = np.sin(2 * np.pi * hz(gamme[int(round(v * 13))]) * tt(n)) * env(n, 0.001, 0.05)
        sfx.add(s, t, g=0.035, pan=-0.5 + v)
    elif k == 'feuille':
        n = ns(0.7)
        u = tt(n) / 0.7
        fr = bp(bruit(n), 1500, 6500) * (0.5 + 0.5 * (rng.random(n) > 0.93)) * np.sin(np.pi * u) ** 1.2
        sfx.add(pan_lin(fr, -0.3, 0.3), t, g=0.04)
        souffle(t, 0.7, 300, 1800, g=0.06, p0=0, p1=0)
    elif k == 'ligne':
        n = ns(0.5)
        u = tt(n) / 0.5
        s = bp(bruit(n), 2200, 6000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 13 * tt(n)))) * np.sin(np.pi * u) ** 0.8
        sfx.add(s, t, g=0.03, pan=0.2)
    elif k == 'tampon':
        n = ns(0.4)
        thud = np.sin(2 * np.pi * np.cumsum(60 + 70 * np.exp(-tt(n) / 0.02)) / SR) * env(n, 0.001, 0.09)
        s = np.tanh(1.8 * (thud + 0.4 * bp(bruit(n), 600, 3000) * env(n, 0.0005, 0.02)))
        sfx.add(s, t, g=0.3)
    elif k == 'flip':
        souffle(t, 0.75, 400, 3200, g=0.09, p0=-0.6, p1=0.6)
    elif k == 'verrou':
        sfx.add(clic(1900, 0.01), t, g=0.18)
        sfx.add(clic(1300, 0.012), t + 0.07, g=0.15)
    elif k == 'laser':
        n = ns(1.5)
        u = tt(n) / 1.5
        s = np.sin(2 * np.pi * np.cumsum(500 * (1800 / 500) ** u) / SR) * 0.4 + bp(bruit(n), 2000, 6000) * 0.25
        s *= np.sin(np.pi * u) ** 0.8
        sfx.add(s, t, g=0.03)
    elif k == 'detect':
        for j, f in enumerate([1760, 2349]):
            n = ns(0.07)
            sfx.add(np.sin(2 * np.pi * f * v * tt(n)) * adsr(n, 0.004, 0.03, 0.6, 0.01, 0.05), t + j * 0.07, g=0.04)
    elif k == 'whoosh':
        souffle(t - 0.05, 0.55, 600, 3500, g=0.08 * v, p0=-0.4, p1=0.5)
    elif k == 'alerte':
        for j, m in enumerate([81, 77]):
            clochette(m, t + j * 0.14, g=0.035, long=0.6)
    elif k == 'ok':
        for j, m in enumerate([84, 89]):
            clochette(m, t + j * 0.08, g=0.03, long=0.7)
    elif k == 'replie':
        montee_inverse(t + 0.45, 0.45, g=0.08)
        sfx.add(clic(2200, 0.01), t + 0.45, g=0.12)
    elif k in ('ouvre', 'envoi'):
        souffle(t - 0.03, 0.45, 600, 4500, g=0.07, p0=-0.5, p1=0.5)
    elif k == 'touche':
        n = ns(0.03)
        s = bp(bruit(n), 2500, 7000) * env(n, 0.0003, 0.004) + np.sin(2 * np.pi * rng.uniform(1800, 2500) * tt(n)) * env(n, 0.0003, 0.003) * 0.4
        sfx.add(s, t, g=0.07 * v, pan=rng.uniform(-0.25, 0.25))
    elif k == 'reflexion':
        for j in range(6):
            clochette(int(rng.choice([89, 93, 96, 98, 101])), t + 0.08 + j * 0.13, g=0.015, pan=rng.uniform(-0.6, 0.6), long=0.6)
    elif k == 'reponse':
        souffle(t - 0.1, 0.5, 3000, 900, g=0.05, p0=0.3, p1=-0.3)
    elif k == 'roulette':
        tc = t
        while tc < t + 0.65:
            sfx.add(clic(rng.uniform(2200, 3400), 0.004), tc, g=0.05, pan=rng.uniform(-0.3, 0.3))
            tc += 0.04
    elif k == 'cran':
        sfx.add(clic(1400 + 800 * v, 0.01), t, g=0.1)
    elif k == 'odometre':
        tc, pas = t, 0.025
        while tc < t + 1.3:
            sfx.add(clic(rng.uniform(2600, 3300), 0.003), tc, g=0.045)
            pas *= 1.12
            tc += pas
    elif k == 'ding':
        clochette(89, t, g=0.04)
    elif k == 'valide':
        clochette(84, t, g=0.035)
        clochette(89, t + 0.1, g=0.04)
    elif k == 'pop':
        n = ns(0.14)
        f = np.minimum(500 * 2 ** (tt(n) / 0.05), 1200)
        sfx.add(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.04), t, g=0.12)


# ================================================================ COMPOSITION (fa majeur)
CH = {
    'Dm9': (38, [50, 57, 64, 65, 72]), 'Bbmaj7': (34, [46, 53, 57, 62, 65]), 'C': (36, [48, 55, 64, 67, 72]),
    'F': (41, [41, 48, 57, 60, 64]), 'C/E': (40, [40, 55, 60, 64, 67]), 'Dm7': (38, [50, 57, 60, 65]),
    'Gm7': (43, [43, 50, 53, 58, 62]),
}
plan = {1: ['Dm9'], 2: ['Bbmaj7', 'C'], 3: ['F'], 4: ['F'], 5: ['C/E'], 6: ['Dm7'], 7: ['Bbmaj7'], 8: ['F'],
        9: ['C/E'], 10: ['Dm7'], 11: ['Bbmaj7'], 12: ['Gm7', 'C'], 13: ['F'], 14: ['F']}

# accroche : accords arpégés, très doux
for bar in (1, 2):
    for h, nom in enumerate(plan[bar]):
        racine, voix = CH[nom]
        moitie = len(plan[bar]) == 2
        t0 = T(bar) + h * 2 * B
        piano(voix[0], t0, 0.35, (2 if moitie else 4) * B, g=0.2)
        haut = voix[1:]
        motif = [0, 1, 2, 3, 2, 1, 2, 3][:4 if moitie else 8]
        for i, idx in enumerate(motif):
            piano(haut[idx] + 12 if idx == 3 else haut[idx], t0 + i * B / 2, 0.3 + 0.05 * (i % 2 == 0), 1.6, g=0.16)
        nappe([racine + 12, haut[1], haut[2]], t0, (2 if moitie else 4) * B, g=0.035)
        basse(racine + 12, t0, (2 if moitie else 4) * B * 0.95, g=0.12)
montee_inverse(T(3), 1.4, g=0.09)

# logo : épanouissement en fa majeur
batterie.add(kick(0.55), T(3))
accord([41, 53, 57, 60, 65, 69], T(3), vel=0.65, tenue=3.2, g=0.2, roule=0.02)
nappe([53, 57, 60, 64], T(3), BAR, g=0.05, fc=1600)
basse(29 + 12, T(3), BAR * 0.95, g=0.22)
t_lettres = temps.get('lettres', [T(3, 2), T(13, 2)])
for t_l, notes in zip(t_lettres, ([77, 81, 84, 89, 93], [77, 81, 84, 89, 96])):
    for j, m in enumerate(notes):
        marimba(m, t_l + 0.04 + j * 0.07, vel=0.6 + 0.08 * j, g=0.14, pan=-0.5 + j * 0.25)

# le groove (mesures 4 à 12)
melodie = {
    6: [(0, 81), (1, 77), (2, 74), (3, 76), (4, 77), (6, 81)],
    7: [(0, 86), (1, 82), (2, 77), (3, 79), (4, 81), (6, 77)],
    8: [(0, 84), (1, 81), (2, 77), (3, 79), (4, 81), (6, 84), (7, 86)],
    9: [(0, 88), (1, 84), (2, 79), (3, 81), (4, 79), (6, 76)],
    10: [(0, 81), (1, 77), (2, 74), (3, 76), (4, 77), (6, 84)],
    11: [(0, 86), (1, 82), (2, 77), (3, 79), (4, 81), (5, 82), (6, 84)],
    12: [(0, 86), (1, 82), (2, 79), (3, 77), (4, 76), (5, 79), (6, 84), (7, 88)],
}
kicks = [T(3)]
for bar in range(4, 13):
    energie = (bar - 4) / 8
    for h, nom in enumerate(plan[bar]):
        racine, voix = CH[nom]
        moitie = len(plan[bar]) == 2
        t0 = T(bar) + h * 2 * B
        long = (2 if moitie else 4) * B
        accord(voix[1:], t0, vel=0.42 + 0.1 * energie, tenue=1.4 * B, g=0.16)
        accord(voix[2:], t0 + 1.5 * B, vel=0.32, tenue=0.45 * B, g=0.13)
        if not moitie:
            accord(voix[2:], t0 + 3 * B, vel=0.28, tenue=0.8 * B, g=0.11)
        nappe([racine + 12] + voix[2:4], t0, long, g=0.04)
        basse(racine, t0, 0.9 * B, g=0.3)
        basse(racine, t0 + 1.5 * B, 0.4 * B, g=0.24)
        if not moitie:
            basse(racine + 7, t0 + 2 * B, 0.9 * B, g=0.26)
            basse(racine + 12, t0 + 3.5 * B, 0.4 * B, g=0.2)
    for beat in (1, 3):
        batterie.add(kick(0.36 + 0.08 * energie), T(bar, beat))
        kicks.append(T(bar, beat))
    if bar >= 8:
        batterie.add(kick(0.24), T(bar, 3.5))
        kicks.append(T(bar, 3.5))
    for beat in (2, 4):
        s = snap()
        batterie.add(s, T(bar, beat), g=0.4)
        rev_env.add(np.vstack([s, s]), T(bar, beat), g=0.12)
    if bar >= 6:
        for i in range(16):
            swing = 0.045 * B if i % 2 else 0
            batterie.add(shaker(), T(bar) + i * B / 4 + swing, g=(0.08 if i % 4 == 2 else 0.05) * (0.7 + 0.6 * energie), pan=0.35)
    if bar in melodie:
        for (pos, m) in melodie[bar]:
            marimba(m, T(bar) + pos * B / 2, vel=0.65 + 0.15 * (pos % 2 == 0), g=0.16, pan=-0.25 + 0.07 * pos)
montee_inverse(T(13), 1.3, g=0.1)

# final : fa majeur, puis tout respire
batterie.add(kick(0.6), T(13))
kicks.append(T(13))
accord([41, 53, 57, 60, 65, 69, 72], T(13), vel=0.7, tenue=4.0, g=0.19, roule=0.02)
nappe([53, 57, 60, 64, 69], T(13), 2 * BAR - 1.0, g=0.055, fc=1800)
basse(41, T(13), BAR * 0.9, g=0.24)
for beat in (2, 4):
    s = snap()
    batterie.add(s, T(13, beat), g=0.22)
    rev_env.add(np.vstack([s, s]), T(13, beat), g=0.1)
for i, m in enumerate([65, 69, 72, 77, 81, 84]):
    piano(m, T(14) + i * B / 2, 0.38, 2.4, g=0.13)
basse(41, T(14), BAR * 0.9, g=0.16)
for t_b in temps.get('brillance', [])[-1:]:
    marimba(89, t_b + 0.3, vel=0.7, g=0.1)

for c in indices:
    if c['k'] in ('lettres', 'logo', 'final'):
        continue
    bfx(c['k'], c['t'], c['v'])

# ================================================================ MIXAGE
duck = np.ones(N)
for tk in kicks:
    i = int(tk * SR)
    m = min(N - i, ns(0.35))
    d = 1 - 0.25 * np.exp(-np.arange(m) / (0.09 * SR))
    duck[i:i + m] = np.minimum(duck[i:i + m], d)


def ir(rt=2.4, pre=0.025):
    n = ns(rt)
    t = tt(n)
    out = []
    for c in range(2):
        w = bruit(n) * np.exp(-6.91 * t / rt)
        k = np.minimum(1, t / rt * 1.6)
        w = lp(w, 6500) * (1 - k) + lp(w, 1600) * k
        w = np.concatenate([np.zeros(ns(pre)), w])
        out.append(w / np.sqrt(np.sum(w ** 2)))
    return out


R = ir()
rev = np.vstack([signal.fftconvolve(rev_env.x[c], R[c])[:N] for c in range(2)])
rev = hp(rev, 180)
mix = batterie.x + musique.x * duck + sfx.x + rev * 0.5
mix = hp(mix, 35)
mix = mix + 0.35 * hp(mix, 5000, 2) + 0.3 * bp(mix, 1800, 5500, 2)


def compresseur(x, seuil=0.25, ratio=2.0, att=0.008, rel=0.2):
    niveau = np.sqrt(uniform_filter1d((x ** 2).mean(0), ns(0.015)))
    cible = np.where(niveau > seuil, (seuil * (niveau / seuil) ** (1 / ratio)) / np.maximum(niveau, 1e-9), 1.0)
    g = np.empty(N)
    aa = np.exp(-1 / (att * SR))
    ar = np.exp(-1 / (rel * SR))
    gc = 1.0
    for i in range(N):
        c = cible[i]
        gc = aa * gc + (1 - aa) * c if c < gc else ar * gc + (1 - ar) * c
        g[i] = gc
    return x * g


def limiteur(x, plafond=0.89, avance=0.004):
    pic = np.abs(x).max(0) + 1e-9
    g = np.minimum(1.0, plafond / pic)
    L = ns(avance)
    g = minimum_filter1d(g, size=2 * L + 1)
    g = uniform_filter1d(g, size=L)
    return np.clip(x * g, -plafond, plafond)


gain = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
mix = compresseur(mix * gain)
mix = limiteur(np.tanh(mix * 1.05) / 1.05)
f = ns(1.6)
mix[:, -f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
mix[:, :ns(0.004)] *= np.linspace(0, 1, ns(0.004))
wavfile.write(sys.argv[2], SR, (mix.T * 32767).astype(np.int16))
print('pic', np.abs(mix).max().round(3), 'rms', np.sqrt((mix ** 2).mean()).round(4), 'durée', round(N / SR, 3))
