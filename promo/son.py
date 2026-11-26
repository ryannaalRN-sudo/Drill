"""Bande-son cinématique de la pub Drill (30 s, 104 BPM, ré mineur -> ré majeur).
Usage : python3 son2.py cues.json sortie.wav [gain]
Tout est synthétisé : pulsation, cuivres graves, cordes, piano feutré, percussions de bande-annonce
et bruitages calés sur les indices exportés par la timeline Motion."""
import json, sys
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.io import wavfile

SR = 48000
DUREE = 30.0
N = int(SR * DUREE)
rng = np.random.default_rng(11)
B = 60 / 104
BAR = 4 * B
S16 = B / 4


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


perc, musique, sfx, rev_env, del_env = Bus(), Bus(), Bus(), Bus(), Bus()


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


def phase(f, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    dt = f / SR
    return (np.cumsum(dt) + ph0) % 1.0, dt


def saw(f, n, ph0=0.0):
    ph, dt = phase(f, n, ph0)
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= 2 * x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + 2 * x + 1
    return y


def sq(f, n, ph0=0.0):
    return 0.5 * (saw(f, n, ph0) - saw(f, n, ph0 + 0.5))


def sine(f, n, ph0=0.0):
    ph, _ = phase(f, n, ph0)
    return np.sin(2 * np.pi * ph)


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


def stereo_pan(sig, p0, p1):
    n = len(sig)
    a = (np.linspace(p0, p1, n) + 1) * np.pi / 4
    return np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)


# ================================================================ instruments
def battement():
    n = ns(0.4)
    s = np.sin(2 * np.pi * np.cumsum(66 + 54 * np.exp(-tt(n) / 0.035)) / SR) * env(n, 0.004, 0.085)
    s += lp(bruit(n), 300) * env(n, 0.002, 0.04) * 0.35
    return np.tanh(2.6 * s)


def tic(f=4300, d=0.007):
    n = ns(0.05)
    return sine(f, n) * env(n, 0.0003, d) + bp(bruit(n), 3000, 9000) * env(n, 0.0002, 0.0025) * 0.6


def grosse_caisse(long=0.7):
    n = ns(long)
    t = tt(n)
    f = 52 + 120 * np.exp(-t / 0.045)
    corps = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, long / 3)
    clic = bp(bruit(n), 1200, 5000) * env(n, 0.0005, 0.005)
    return np.tanh(1.8 * (corps + 0.4 * clic))


def taiko(f0=120, long=0.9):
    n = ns(long)
    t = tt(n)
    f = f0 * 0.55 + f0 * 0.45 * np.exp(-t / 0.06)
    corps = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.22)
    peau = lp(bruit(n), 1400) * env(n, 0.001, 0.03)
    return np.tanh(1.5 * (corps + 0.5 * peau))


def caisse_claire():
    n = ns(0.9)
    x = bp(bruit(n), 900, 8000) * env(n, 0.001, 0.16)
    corps = sine(np.linspace(230, 170, n), n) * env(n, 0.001, 0.07)
    return np.tanh(1.4 * (x + 0.7 * corps))


def shaker():
    n = ns(0.08)
    return hp(bruit(n), 6000, 4) * env(n, 0.006, 0.025)


def boom(f0=74, f1=30, long=2.2):
    n = ns(long)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.3)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, long / 3.2)
    return np.tanh(2.0 * s) + lp(bruit(n), 700) * env(n, 0.002, 0.15) * 0.5


def cymbale(long=2.6):
    n = ns(long)
    out = []
    for c in range(2):
        x = hp(bruit(n), 5000, 2)
        metal = sum(sq(f * (1 + 0.012 * c), n) for f in [331, 441, 563, 689, 797, 937]) / 6
        out.append((x + 0.45 * hp(metal, 3200)) * env(n, 0.003, long / 3.5))
    return np.vstack(out)


def braam(notes, long=2.6, majeur=False):
    """Gros cuivre grave : scies désaccordées, saturées, filtre qui s'ouvre puis se referme."""
    n = ns(long)
    t = tt(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        for k, d in enumerate([-0.09, 0.0, 0.08]):
            s = saw(hz(m) * 2 ** (d / 12), n, rng.random())
            p = (k - 1) * 0.5
            a = (p + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
    fc = 180 + 2600 * (np.minimum(1, t / 0.09)) * np.exp(-t / 0.7) + 300 * np.exp(-t / 2.0)
    e = adsr(n, 0.02, 0.9, 0.45, 0.8, long - 0.8)
    st = np.vstack([np.tanh(1.6 * fvar(L, fc)), np.tanh(1.6 * fvar(R, fc))]) * e
    return st / np.sqrt(len(notes))


def cordes(notes, t0, long, g, fc=1800, a=0.5):
    n = ns(long + 0.8)
    t = tt(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        for k in range(5):
            d = (k - 2) * 0.07
            vib = 1 + 0.0025 * np.sin(2 * np.pi * (5.2 + k * 0.3) * t + k)
            s = saw(hz(m) * 2 ** (d / 12) * vib, n, rng.random())
            p = (k - 2) * 0.35
            aa = (p + 1) * np.pi / 4
            L += s * np.cos(aa)
            R += s * np.sin(aa)
    st = np.vstack([lp(L, fc), lp(R, fc)]) / np.sqrt(5 * len(notes))
    st *= adsr(n, a, 1.0, 0.85, 0.8, long)
    musique.add(st, t0, g=g)
    rev_env.add(st, t0, g=g * 0.5)


def piano(m, t0, g=0.2, pan=0.0, long=2.4):
    n = ns(long)
    t = tt(n)
    f = hz(m)
    s = np.zeros(n)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        s += np.sin(2 * np.pi * fk * t + rng.random()) * np.exp(-t * (1.2 + k * 0.9)) / k ** 1.1
    s += lp(bruit(n), 2500) * env(n, 0.0005, 0.006) * 0.15
    s = lp(s, 4200) * env(n, 0.002, long / 2.5)
    musique.add(s, t0, pan=pan, g=g)
    rev_env.add(s, t0, pan=pan, g=g * 0.7)
    del_env.add(s, t0, pan=pan, g=g * 0.35)


def cloche(m, t0, long=1.6, g=0.12, pan=0.0, rev=0.6):
    n = ns(long)
    t = tt(n)
    f = hz(m)
    I = 2.0 * np.exp(-t / 0.2)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t))
    s += 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.3)
    s *= env(n, 0.001, long / 4)
    sfx.add(s, t0, pan=pan, g=g)
    rev_env.add(s, t0, pan=pan, g=g * rev)


def souffle(t0, long, f0, f1, g=0.3, p0=-0.5, p1=0.5, q=0.5, bas=0.0):
    n = ns(long)
    x = hp(bruit(n), 120)
    u = tt(n) / long
    fc = f0 * (f1 / f0) ** u
    y = fvar(x, fc * (1 + q)) - 0.6 * fvar(x, fc * (1 - 0.7 * q))
    y *= np.sin(np.pi * np.clip(u, 0, 1)) ** 1.5
    if bas:
        y += lp(bruit(n), 220) * np.sin(np.pi * np.clip(u, 0, 1)) ** 2 * bas
    st = stereo_pan(y, p0, p1)
    sfx.add(st, t0, g=g)
    rev_env.add(st, t0, g=g * 0.25)


def montee(t0, t1, g=0.2, haut=9000):
    n = ns(t1 - t0)
    u = tt(n) / (t1 - t0)
    x = fvar(hp(bruit(n), 200), 300 * (haut / 300) ** u) * u ** 2.2
    s = sum(sine(110 * 2 ** (o + 3 * u), n) * np.sin(np.pi * ((u + o / 3) % 1)) for o in range(3)) / 3
    st = np.vstack([x + 0.25 * s * u, np.roll(x, 53) + 0.25 * s * u])
    sfx.add(st, t0, g=g)


def cymbale_inverse(t_fin, long=0.8, g=0.3):
    c = cymbale(long)[:, ::-1]
    sfx.add(c, t_fin - long, g=g)


# ================================================================ bruitages
def bfx(k, t, v):
    if k == 'phrase':
        souffle(t - 0.16, 0.34, 3200, 500, g=0.16 * v, p0=0.4, p1=-0.2)
        n = ns(0.25)
        sfx.add(sine(np.linspace(150, 70, n), n) * env(n, 0.002, 0.07), t, g=0.28 * v)
    elif k == 'recul':
        souffle(t, 0.5, 1800, 250, g=0.13 * v, p0=0, p1=0, bas=0.5)
    elif k == 'tic':
        sfx.add(tic(3600), t, g=0.25 * v)
    elif k == 'trace':
        n = ns(0.75)
        u = tt(n) / 0.75
        s = sum(np.sin(2 * np.pi * np.cumsum(hz(74 + j * 7) * (1 + 0.5 * u)) / SR) for j in range(3)) / 3
        s *= np.sin(np.pi * u) ** 0.7 * 0.6
        sfx.add(s, t, g=0.1)
        rev_env.add(s, t, g=0.12)
    elif k == 'lettres':
        notes = [74, 77, 81, 86, 89] if t < T(12) - 1 else [74, 78, 81, 86, 90]
        for j, m in enumerate(notes):
            cloche(m, t + 0.05 + j * 0.05, 1.8, g=0.075, pan=-0.5 + j * 0.25, rev=0.8)
    elif k == 'brillance':
        n = ns(0.8)
        sh = hp(bruit(n), 7000) * np.sin(np.pi * tt(n) / 0.8) ** 2
        sfx.add(stereo_pan(sh, -0.6, 0.6), t, g=0.06 * v)
        for j, m in enumerate([93, 98, 100]):
            cloche(m, t + 0.2 + j * 0.09, 1.0, g=0.035, pan=-0.3 + j * 0.3, rev=0.9)
    elif k == 'range':
        souffle(t - 0.05, 0.42, 900, 4200, g=0.18 * v, p0=0.2, p1=-0.6)
    elif k == 'titre':
        souffle(t - 0.1, 0.36, 3800, 700, g=0.13 * v, p0=-0.4, p1=0.4)
        n = ns(0.3)
        sfx.add(sine(np.linspace(120, 55, n), n) * env(n, 0.002, 0.09), t + 0.08, g=0.22)
    elif k == 'cartes':
        souffle(t, 0.6, 300, 2800, g=0.2, p0=0, p1=0, bas=0.4)
    elif k == 'coche':
        n = ns(0.06)
        sfx.add(tic(2600, 0.012), t, g=0.32)
        cloche(93, t + 0.02, 0.7, g=0.05)
    elif k == 'dent':
        gamme = [74, 77, 79, 81, 84, 86, 89, 91, 93, 96, 98, 101, 103, 105]
        m = gamme[int(round(v * 13))]
        n = ns(0.12)
        s = sine(hz(m), n) * env(n, 0.001, 0.04)
        sfx.add(s, t, g=0.07, pan=-0.5 + v)
        rev_env.add(s, t, g=0.03)
    elif k == 'balaye':
        souffle(t - 0.04, 0.32, 1200, 5200, g=0.22 * v, p0=0.5, p1=-0.8, q=0.6)
    elif k == 'feuille':
        n = ns(0.6)
        u = tt(n) / 0.6
        froissé = bp(bruit(n), 1500, 7000) * (0.5 + 0.5 * (rng.random(n) > 0.92)) * np.sin(np.pi * u) ** 1.2
        sfx.add(stereo_pan(froissé, -0.3, 0.3), t, g=0.08)
        souffle(t, 0.6, 250, 2200, g=0.16, p0=0, p1=0, bas=0.4)
    elif k == 'ligne':
        n = ns(0.42)
        u = tt(n) / 0.42
        mod = 0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 14 * tt(n)))
        s = bp(bruit(n), 2200, 6500) * mod * np.sin(np.pi * u) ** 0.8
        sfx.add(s, t, g=0.06 * v, pan=0.2)
    elif k == 'tampon':
        n = ns(0.5)
        thud = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-tt(n) / 0.02)) / SR) * env(n, 0.001, 0.11)
        claque = bp(bruit(n), 600, 3500) * env(n, 0.0005, 0.03)
        s = np.tanh(2.2 * (thud + 0.6 * claque))
        sfx.add(s, t, g=0.55)
        rev_env.add(s, t, g=0.15)
    elif k == 'rature':
        n = ns(0.34)
        u = tt(n) / 0.34
        s = bp(bruit(n), 1100, 4200) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * tt(n))) * np.sin(np.pi * u) ** 0.6
        sfx.add(stereo_pan(s, -0.4, 0.4), t, g=0.14)
    elif k == 'carte':
        souffle(t - 0.05, 0.32, 2400, 700, g=0.1 * v, p0=-0.3, p1=0.2)
    elif k == 'ding':
        cloche(rng.choice([81, 86]), t, 1.3, g=0.09 * v, pan=rng.uniform(-0.4, 0.4))
    elif k == 'flip':
        souffle(t, 0.6, 400, 3800, g=0.24, p0=-0.6, p1=0.6, q=0.6, bas=0.3)
    elif k == 'verrou':
        sfx.add(tic(1900, 0.01), t, g=0.4)
        sfx.add(tic(1200, 0.014), t + 0.07, g=0.35)
        n = ns(0.14)
        sfx.add(sine(np.linspace(900, 1500, n), n) * env(n, 0.01, 0.05), t, g=0.06)
    elif k == 'laser':
        n = ns(1.3)
        u = tt(n) / 1.3
        s = sine(300 * (2400 / 300) ** u, n) * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * tt(n)))
        s = s * 0.5 + bp(bruit(n), 1500, 7000) * 0.35
        s *= np.sin(np.pi * u) ** 0.6
        sfx.add(stereo_pan(s, 0, 0), t, g=0.07)
        rev_env.add(s, t, g=0.04)
    elif k == 'detect':
        for j, f in enumerate([1760, 2349]):
            n = ns(0.06)
            sfx.add(sine(f * v, n) * adsr(n, 0.003, 0.03, 0.6, 0.01, 0.045), t + j * 0.06, g=0.1)
    elif k == 'envol':
        souffle(t, 0.6, 1500, 9000, g=0.13, p0=-0.2, p1=0.5)
        for j, m in enumerate([86, 93]):
            cloche(m, t + 0.1 + j * 0.12, 0.9, g=0.04, rev=0.9)
    elif k == 'whoosh':
        souffle(t - 0.06, 0.45, 600, 4500, g=0.24 * v, p0=-0.5, p1=0.6, bas=0.3)
    elif k == 'alerte':
        for j, f in enumerate([880, 740]):
            n = ns(0.14)
            sfx.add(sine(f, n) * adsr(n, 0.005, 0.05, 0.6, 0.03, 0.1), t + j * 0.15, g=0.08)
    elif k == 'fusion':
        n = ns(0.5)
        x = fvar(hp(bruit(n), 300), 800 * (9000 / 800) ** (tt(n) / 0.5)) * (tt(n) / 0.5) ** 2
        sfx.add(stereo_pan(x, 0.6, 0), t, g=0.2)
        sfx.add(tic(2200, 0.01), t + 0.48, g=0.3)
    elif k == 'barre':
        souffle(t - 0.04, 0.42, 300, 3500, g=0.2, p0=-0.6, p1=0.6, bas=0.4)
    elif k == 'touche':
        n = ns(0.03)
        s = bp(bruit(n), 2500, 7500) * env(n, 0.0003, 0.004) + sine(rng.uniform(1800, 2600), n) * env(n, 0.0003, 0.003) * 0.4
        sfx.add(s, t, g=0.15 * v, pan=rng.uniform(-0.25, 0.25))
    elif k == 'cascade':
        sfx.add(tic(2000 + 400 * v, 0.01), t, g=0.18)
        souffle(t - 0.02, 0.18, 2500, 900, g=0.05)
    elif k == 'tap':
        n = ns(0.1)
        tock = sine(np.linspace(260, 190, n), n) * env(n, 0.001, 0.03)
        sfx.add(np.concatenate([tic(1700, 0.008), np.zeros(n - ns(0.05))]) * 0.8 + tock, t, g=0.4 * v)
    elif k == 'roulette':
        tc = t
        while tc < t + 0.72:
            sfx.add(tic(rng.uniform(2200, 3600), 0.005), tc, g=0.12, pan=rng.uniform(-0.3, 0.3))
            tc += 0.026
    elif k == 'cran':
        sfx.add(tic(1400 + 900 * v, 0.012), t, g=0.26)
        n = ns(0.05)
        sfx.add(lp(bruit(n), 900) * env(n, 0.001, 0.012), t, g=0.2)
    elif k == 'odometre':
        tc, pas = t, 0.02
        while tc < t + 1.1:
            sfx.add(tic(rng.uniform(2600, 3400), 0.004), tc, g=0.09)
            pas *= 1.12
            tc += pas
    elif k == 'caisse':
        sfx.add(tic(2400, 0.01), t, g=0.25)
        cloche(88, t + 0.01, 0.8, g=0.09)
        cloche(93, t + 0.08, 1.2, g=0.1)
    elif k == 'whip':
        souffle(t - 0.04, 0.42, 500, 7000, g=0.38, p0=0.8, p1=-0.8, q=0.7, bas=0.5)
    elif k == 'envoi':
        souffle(t - 0.03, 0.28, 900, 6500, g=0.16, p0=-0.2, p1=0.4)
    elif k == 'reflexion':
        n = ns(1.2)
        u = tt(n) / 1.2
        s = sum(np.sin(2 * np.pi * hz(m) * tt(n)) * (0.5 + 0.5 * np.sin(2 * np.pi * (6 + j) * tt(n) + j)) for j, m in enumerate([86, 89, 93, 98]))
        s *= np.sin(np.pi * u) ** 1.2 / 4
        sfx.add(stereo_pan(s, -0.4, 0.4), t, g=0.06)
        rev_env.add(s, t, g=0.08)
        for j in range(7):
            cloche(int(rng.choice([93, 96, 98, 101, 105])), t + 0.1 + j * 0.14, 0.5, g=0.025, pan=rng.uniform(-0.6, 0.6), rev=1.0)
    elif k == 'magie':
        for j, m in enumerate([86, 89, 93, 98, 101]):
            cloche(m, t + j * 0.035, 1.0, g=0.06, pan=-0.5 + j * 0.25, rev=0.9)
        souffle(t - 0.1, 0.4, 2000, 9000, g=0.1, p0=0.4, p1=-0.4)
    elif k == 'pop':
        n = ns(0.14)
        f = np.minimum(500 * 2 ** (tt(n) / 0.045), 1300)
        sfx.add(sine(f, n) * env(n, 0.002, 0.04), t, g=0.3 * v)
    elif k == 'implosion':
        cymbale_inverse(t + 0.5, 0.55, g=0.32)
        n = ns(0.5)
        u = tt(n) / 0.5
        s = sine(400 * (60 / 400) ** u, n) * u ** 1.5
        sfx.add(s, t, g=0.12)


# ================================================================ COMPOSITION
coupe1 = T(3) - 0.12
coupe2 = T(12) - 0.1
kicks = []

# ---- accroche
for tb in [0, T(1, 3), T(2, 1), T(2, 3)]:
    perc.add(battement(), tb, g=0.6)
    perc.add(battement(), tb + 0.17, g=0.36)
t = 0.0
k = 0
while t < coupe1 - 1e-6:
    pas = B / 2 if t < T(2, 4) else S16
    perc.add(tic(4500 if k % 2 == 0 else 3300, 0.006), t, g=0.19 if k % 2 == 0 else 0.12, pan=0.3 if k % 2 == 0 else -0.3)
    t += pas
    k += 1
n = ns(coupe1)
u = tt(n) / coupe1
drone = sum(fvar(saw(hz(m), n, rng.random()) * 0.9 + sine(hz(m), n) * 0.7, 520 + 900 * u) for m in [38, 45, 50])
drone *= np.minimum(1, tt(n) / 1.2) * np.minimum(1, (coupe1 - tt(n)) / 0.02)
musique.add(drone, 0, g=0.1)
verre = sum(np.sin(2 * np.pi * hz(m) * tt(n) * (1 + 0.003 * np.sin(2 * np.pi * 5.5 * tt(n)))) for m in [81, 86])
verre *= (u ** 1.5) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * tt(n))) * np.minimum(1, (coupe1 - tt(n)) / 0.02)
musique.add(np.vstack([verre, np.roll(verre, 200)]) * 0.5, 0, g=0.06)
rev_env.add(np.vstack([verre, verre]) * 0.5, 0, g=0.03)
montee(T(2), coupe1, g=0.2)
cymbale_inverse(T(3), 0.9, g=0.32)

# ---- logo : braam en ré mineur
perc.add(boom(74, 40, 2.0), T(3), g=0.5)
perc.add(grosse_caisse(1.0), T(3), g=0.8)
kicks.append(T(3))
perc.add(taiko(110, 1.2), T(3), g=0.6)
perc.add(cymbale(3.0), T(3), g=0.32)
rev_env.add(cymbale(3.0), T(3), g=0.12)
br = braam([38, 45, 50, 53, 57], 2.8)
musique.add(br, T(3), g=0.42)
rev_env.add(br, T(3), g=0.18)
cordes([50, 57, 62, 65], T(3), BAR, g=0.1, a=0.3)

# ---- fonctionnalités : Ré m | Si♭ | Fa | Do (x2)
grille = {4: ([50, 57, 62, 65], 38), 5: ([50, 58, 62, 65], 34), 6: ([48, 57, 60, 65], 41), 7: ([48, 55, 60, 64], 36),
          8: ([50, 57, 62, 65], 38), 9: ([50, 58, 62, 65], 34), 10: ([48, 57, 60, 65], 41), 11: ([48, 55, 60, 64], 36)}
arpege = {4: [69, 74, 77], 5: [65, 70, 74], 6: [65, 69, 72], 7: [64, 67, 72], 8: [69, 74, 77], 9: [65, 70, 74], 10: [65, 69, 72], 11: [64, 67, 72]}
for bar in range(4, 12):
    notes, racine = grille[bar]
    energie = (bar - 4) / 7
    cordes(notes, T(bar), BAR, g=0.09 + 0.05 * energie, fc=1500 + 1500 * energie, a=0.35)
    # pulsation en doubles croches
    motif = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12]
    for i in range(16):
        t16 = T(bar) + i * S16
        if bar == 11 and i >= 14:
            continue
        m = racine + motif[i]
        n = ns(S16 * 0.95)
        s = saw(hz(m), n) * 0.7 + sq(hz(m) * 1.002, n) * 0.4
        fc = (500 + 1700 * energie) * (1.4 if i % 4 == 0 else 1.0)
        s = fvar(s, fc * (0.4 + 0.6 * np.exp(-tt(n) / 0.05)))
        s *= adsr(n, 0.002, 0.06, 0.4, 0.02, S16 * 0.8)
        musique.add(s, t16, g=(0.13 if i % 4 == 0 else 0.09) * (0.8 + 0.4 * energie), pan=0.15 if i % 2 else -0.15)
    # basse continue
    n = ns(BAR)
    sb = sine(hz(racine), n) * adsr(n, 0.02, 0.5, 0.8, 0.1, BAR - 0.1) + sine(hz(racine + 12), n) * 0.3 * adsr(n, 0.02, 0.5, 0.8, 0.1, BAR - 0.1)
    musique.add(sb, T(bar), g=0.16)
    # percussions
    for beat in (1, 3):
        tb = T(bar, beat)
        perc.add(grosse_caisse(), tb, g=0.62)
        kicks.append(tb)
    if bar in (6, 8, 10):
        perc.add(taiko(100, 1.0), T(bar), g=0.5)
        perc.add(boom(64, 34, 1.4), T(bar), g=0.32)
        perc.add(cymbale(2.0), T(bar), g=0.13)
    if bar >= 6:
        cc = caisse_claire()
        perc.add(cc, T(bar, 3), g=0.33)
        rev_env.add(np.vstack([cc, cc]), T(bar, 3), g=0.14)
    if bar >= 8:
        for j, f0 in enumerate([150, 130, 115, 100]):
            perc.add(taiko(f0, 0.5), T(bar, 4) + j * S16, g=0.2 + 0.05 * j, pan=-0.4 + 0.27 * j)
    for i in range(16):
        g = (0.035 if i % 2 else 0.055) * (0.6 + 0.8 * energie)
        perc.add(shaker(), T(bar) + i * S16, g=g, pan=0.35)
        if i % 2 == 0:
            perc.add(tic(4200, 0.004), T(bar) + i * S16, g=0.04, pan=-0.3)
    # piano feutré
    a = arpege[bar]
    positions = [(1, 0), (1.5, 1), (2, 2)] if bar < 8 else [(1, 0), (1.5, 1), (2, 2), (3, 1), (3.5, 2), (4, 0)]
    for (bt, idx) in positions:
        piano(a[idx] + 12, T(bar, bt), g=0.085, pan=-0.3 + 0.3 * idx)
# montée vers le final
montee(T(11, 3), coupe2, g=0.18, haut=11000)
for j in range(8):
    perc.add(caisse_claire(), T(11, 3) + j * S16 * 0.5 + 0.0, g=0.05 + 0.03 * j)

# ---- final : ré majeur
perc.add(boom(70, 40, 2.4), T(12), g=0.5)
perc.add(grosse_caisse(1.0), T(12), g=0.8)
kicks.append(T(12))
perc.add(taiko(105, 1.4), T(12), g=0.55)
perc.add(cymbale(3.4), T(12), g=0.32)
rev_env.add(cymbale(3.4), T(12), g=0.14)
br = braam([38, 45, 50, 54, 57], 3.4, majeur=True)
musique.add(br, T(12), g=0.4)
rev_env.add(br, T(12), g=0.2)
cordes([50, 57, 62, 66, 69], T(12), DUREE - T(12) - 0.6, g=0.12, fc=2600, a=0.2)
n = ns(DUREE - T(12))
musique.add(sine(hz(50), n) * adsr(n, 0.02, 1.5, 0.5, 1.0, DUREE - T(12) - 1.0), T(12), g=0.12)
for j, m in enumerate([62, 66, 69, 74, 78, 81]):
    piano(m + 12, T(12, 2) + j * B / 2, g=0.07, pan=-0.5 + j * 0.2, long=3.0)
piano(86, T(13, 2), g=0.06, long=3.0)
cloche(86, T(13, 2), 2.5, g=0.05, rev=1.0)

# ---- bruitages
for c in json.load(open(sys.argv[1])):
    if c['k'] in ('impact', 'final'):
        continue
    bfx(c['k'], c['t'], c['v'])

# silences avant les deux grands impacts
for a, b in [(coupe1, T(3)), (coupe2, T(12))]:
    i, j = int(a * SR), int(b * SR)
    for bus in (musique, perc):
        r = np.linspace(1, 0, ns(0.01))
        bus.x[:, i:i + len(r)] *= r
        bus.x[:, i + len(r):j] = 0

# ================================================================ MIXAGE
duck = np.ones(N)
for tk in kicks:
    i = int(tk * SR)
    m = min(N - i, ns(0.45))
    d = 1 - 0.45 * np.exp(-np.arange(m) / (0.09 * SR))
    a = min(m, ns(0.005))
    d[:a] = np.linspace(1, d[a], a)
    duck[i:i + m] = np.minimum(duck[i:i + m], d)


def ir(rt=3.0, pre=0.03):
    n = ns(rt)
    t = tt(n)
    dec = np.exp(-6.91 * t / rt)
    out = []
    for c in range(2):
        w = bruit(n) * dec
        k = np.minimum(1, t / rt * 1.6)
        w = lp(w, 7500) * (1 - k) + lp(w, 1800) * k
        w = np.concatenate([np.zeros(ns(pre)), w])
        out.append(w / np.sqrt(np.sum(w ** 2)))
    return out


R = ir()
rev = np.vstack([signal.fftconvolve(rev_env.x[c], R[c])[:N] for c in range(2)])
rev = hp(rev, 200)
dl = np.zeros((2, N))
pas = ns(0.75 * B)
src = lp(del_env.x.sum(0) * 0.5, 4500)
for k in range(1, 6):
    dl[k % 2, pas * k:] += (0.4 ** k) * src[:N - pas * k]

mix = perc.x + musique.x * duck + sfx.x + rev * 0.6 + dl * 0.5
mix = hp(mix, 30)


def compresseur(x, seuil=0.3, ratio=2.2, att=0.005, rel=0.15):
    niveau = np.sqrt(uniform_filter1d((x ** 2).mean(0), ns(0.012)))
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
mix = compresseur(mix)
mix = limiteur(np.tanh(mix * gain * 1.1) / 1.1)
f = ns(0.8)
mix[:, -f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
mix[:, :ns(0.003)] *= np.linspace(0, 1, ns(0.003))
wavfile.write(sys.argv[2], SR, (mix.T * 32767).astype(np.int16))
print('pic', np.abs(mix).max().round(3), 'rms', np.sqrt((mix ** 2).mean()).round(4))
