"""Bande-son de la pub Drill (15 s, 128 BPM, la majeur / fa# mineur).
Usage : python3 son.py cues.json sortie.wav
Tout est synthétisé : batterie, basse, nappes, motif pincé, carillons et bruitages d'interface
calés sur les indices exportés par la timeline Motion."""
import json, sys
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.io import wavfile

SR = 48000
DUREE = 15.0
N = int(SR * DUREE)
rng = np.random.default_rng(7)
B = 60 / 128
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


# ---------------------------------------------------------------- bus
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


drums, musique, sfx, envoi_rev, envoi_delai = Bus(), Bus(), Bus(), Bus(), Bus()


# ---------------------------------------------------------------- filtres
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


def filtre_var(x, fc, kind='low', bloc=64):
    """Filtre à fréquence de coupure variable (bloc par bloc, état conservé)."""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    y = np.empty_like(x)
    zi = None
    for i in range(0, len(x), bloc):
        sos = _sos(kind, float(fc[i]), 2)
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y[i:i + bloc], zi = signal.sosfilt(sos, x[i:i + bloc], zi=zi)
    return y


# ---------------------------------------------------------------- oscillateurs
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


def env(n, a=0.002, d=0.2, courbe=1.0):
    t = tt(n)
    e = np.minimum(1, t / max(a, 1e-5)) * np.exp(-np.maximum(0, t - a) / d)
    return e ** courbe


def adsr(n, a, d, s, r, tenue):
    t = tt(n)
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / d))
    rel = np.clip((t - tenue) / r, 0, 1)
    return e * (1 - rel) ** 2


# ---------------------------------------------------------------- instruments
def kick(g=1.0):
    n = ns(0.55)
    t = tt(n)
    f = 54 + 140 * np.exp(-t / 0.03)
    corps = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16)
    clic = bp(bruit(n), 1800, 6000) * env(n, 0.0005, 0.006)
    return np.tanh(2.0 * (corps + 0.5 * clic)) * g


def clap():
    n = ns(0.45)
    x = np.zeros(n)
    for k, d in enumerate([0, 0.011, 0.022]):
        i = ns(d)
        m = ns(0.012)
        x[i:i + m] += bruit(m) * np.exp(-np.arange(m) / (0.004 * SR))
    x += bruit(n) * env(n, 0.024, 0.13) * 0.55
    x = bp(x, 900, 3800)
    corps = sine(195, n) * env(n, 0.001, 0.05) * 0.35
    return x + corps


def snare(g=1.0):
    n = ns(0.22)
    x = bp(bruit(n), 1200, 7000) * env(n, 0.001, 0.07)
    corps = sine(np.linspace(240, 180, n), n) * env(n, 0.001, 0.04)
    return (x + 0.6 * corps) * g


def hat(ouvert=False):
    n = ns(0.3 if ouvert else 0.06)
    x = hp(bruit(n), 7500, 4) * env(n, 0.0007, 0.12 if ouvert else 0.018)
    return x


def crash(long=1.8):
    n = ns(long)
    out = []
    for c in range(2):
        x = hp(bruit(n), 4500, 2)
        metal = sum(sq(f * (1 + 0.01 * c), n) for f in [321, 427, 539, 637, 781, 913]) / 6
        x = x + 0.5 * hp(metal, 3000)
        out.append(x * env(n, 0.002, long / 3.2))
    return np.vstack(out)


def boom(f0=72, f1=31, long=1.6, g=1.0):
    n = ns(long)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, long / 3.5)
    s = np.tanh(2.2 * s)
    souffle = lp(bruit(n), 900) * env(n, 0.002, 0.18) * 0.5
    return (s + souffle) * g


def supersaw(f, n, voix=7, ecart=0.22, fc=2600):
    L = np.zeros(n)
    R = np.zeros(n)
    for k in range(voix):
        d = (k - (voix - 1) / 2) / ((voix - 1) / 2)
        fk = f * 2 ** (d * ecart / 12)
        s = saw(fk, n, rng.random())
        p = d * 0.8
        a = (p + 1) * np.pi / 4
        L += s * np.cos(a)
        R += s * np.sin(a)
    st = np.vstack([lp(L, fc), lp(R, fc)]) / np.sqrt(voix)
    return st


def nappe(notes, t0, long, g=0.16, fc=2400, a=0.03, r=0.5, bus=None):
    n = ns(long + r)
    e = adsr(n, a, 0.6, 0.75, r, long)
    st = sum(supersaw(hz(m), n, fc=fc) for m in notes) / np.sqrt(len(notes))
    (bus or musique).add(st * e, t0, g=g)
    envoi_rev.add(st * e, t0, g=g * 0.35)


def pince(m, t0, long=S16 * 1.6, g=0.2, clair=1.0, pan=0.0):
    n = ns(long + 0.25)
    t = tt(n)
    s = saw(hz(m), n) + 0.45 * sq(hz(m) * 1.003, n)
    fc = 500 + (5200 * clair) * np.exp(-t / 0.07)
    s = filtre_var(s, fc)
    s *= adsr(n, 0.002, 0.12, 0.25, 0.12, long)
    musique.add(s, t0, pan=pan, g=g)
    envoi_delai.add(s, t0, pan=pan, g=g * 0.5)
    envoi_rev.add(s, t0, pan=pan, g=g * 0.25)


def basse(m, t0, long, g=0.36):
    n = ns(long + 0.04)
    t = tt(n)
    s = saw(hz(m), n) * 0.8 + sq(hz(m), n) * 0.3
    s = filtre_var(s, 380 + 1500 * np.exp(-t / 0.06))
    sub = sine(hz(m), n) * 0.55 + sine(hz(m - 12), n) * 0.14
    e = adsr(n, 0.004, 0.15, 0.7, 0.03, long)
    musique.add((s + sub) * e, t0, g=g)


def cloche(m, t0, long=1.2, g=0.15, pan=0.0, rev=0.5):
    n = ns(long)
    t = tt(n)
    f = hz(m)
    I = 2.2 * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t))
    s += 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.25)
    s *= env(n, 0.001, long / 4)
    sfx.add(s, t0, pan=pan, g=g)
    envoi_rev.add(s, t0, pan=pan, g=g * rev)


def souffle(t0, long, f0, f1, g=0.3, pan0=-0.5, pan1=0.5, q=0.5):
    n = ns(long)
    x = bruit(n)
    t = tt(n) / long
    fc = f0 * (f1 / f0) ** t
    y = filtre_var(hp(x, 150), fc * (1 + q), 'low') - filtre_var(hp(x, 150), fc * (1 - q * 0.7), 'low') * 0.6
    e = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.5
    y = y * e
    a = (np.linspace(pan0, pan1, n) + 1) * np.pi / 4
    st = np.vstack([y * np.cos(a), y * np.sin(a)]) * np.sqrt(2)
    sfx.add(st, t0, g=g)
    envoi_rev.add(st, t0, g=g * 0.3)


# ---------------------------------------------------------------- bruitages d'interface
def clic(f=3200, d=0.012):
    n = ns(0.05)
    return sine(f, n) * env(n, 0.0003, d) + hp(bruit(n), 4000) * env(n, 0.0002, 0.002) * 0.5


def bfx(k, t, v):
    if k == 'mot':
        n = ns(0.3)
        tt_ = tt(n)
        th = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-tt_ / 0.03)) / SR) * env(n, 0.002, 0.11)
        sfx.add(th, t, g=0.55 * v)
        souffle(t - 0.12, 0.26, 3500, 500, g=0.16 * v, pan0=0.3, pan1=-0.2)
    elif k == 'pop':
        n = ns(0.12)
        f = 520 * 2 ** (tt(n) / 0.045)
        f = np.minimum(f, 1300)
        sfx.add(sine(f, n) * env(n, 0.002, 0.035), t, g=0.32 * v, pan=rng.uniform(-.3, .3))
    elif k == 'tic':
        sfx.add(clic(rng.choice([2900, 3300, 3700])), t, g=0.13 * v, pan=rng.uniform(-.4, .4))
    elif k == 'tap':
        n = ns(0.1)
        tock = sine(np.linspace(260, 200, n), n) * env(n, 0.001, 0.025)
        sfx.add(np.concatenate([clic(1700, 0.008), np.zeros(n - ns(0.05))]) * 0.8 + tock, t, g=0.42 * v)
    elif k == 'ding':
        cloche(rng.choice([85, 88]), t, 0.9, g=0.12 * v, pan=rng.uniform(-.4, .4))
    elif k == 'bip':
        n = ns(0.09)
        m = 88 + int(round((v - 0.6) * 20))
        s = sine(hz(m), n) * adsr(n, 0.004, 0.05, 0.6, 0.02, 0.06)
        sfx.add(s, t, g=0.14)
        envoi_rev.add(s, t, g=0.05)
    elif k == 'scan':
        n = ns(0.62)
        u = tt(n) / 0.62
        f = 380 * (2400 / 380) ** u
        s = sine(f, n) * 0.6 + bp(bruit(n), 2000, 6000) * 0.25
        s *= np.sin(np.pi * u) ** 0.8
        a = (np.linspace(-0.6, 0.6, n) + 1) * np.pi / 4
        sfx.add(np.vstack([s * np.cos(a), s * np.sin(a)]) * np.sqrt(2), t, g=0.11)
    elif k == 'touche':
        n = ns(0.03)
        s = bp(bruit(n), 2500, 7000) * env(n, 0.0003, 0.004) + sine(rng.uniform(1800, 2600), n) * env(n, 0.0003, 0.003) * 0.4
        sfx.add(s, t, g=0.16 * v, pan=rng.uniform(-.25, .25))
    elif k == 'caisse':
        sfx.add(clic(2400, 0.01), t, g=0.25)
        cloche(88, t + 0.01, 0.7, g=0.13)
        cloche(93, t + 0.075, 1.1, g=0.15)
        n = ns(0.35)
        sfx.add(hp(bruit(n), 6000) * env(n, 0.002, 0.08), t, g=0.07)
    elif k == 'envoi':
        souffle(t - 0.04, 0.22, 900, 6000, g=0.18, pan0=-0.2, pan1=0.4)
    elif k == 'magie':
        for j, m in enumerate([93, 97, 100, 105]):
            cloche(m, t + j * 0.035, 0.8, g=0.09, pan=-0.4 + j * 0.27, rev=0.8)
        n = ns(0.6)
        sh = hp(bruit(n), 7000) * env(n, 0.01, 0.15) * 0.5
        sfx.add(sh, t, g=0.08)
        envoi_rev.add(sh, t, g=0.06)
    elif k == 'whoosh':
        souffle(t - 0.08, 0.38, 500, 4200, g=0.30 * v, pan0=-0.5, pan1=0.6)
    elif k == 'swoosh':
        souffle(t - 0.05, 0.42, 300, 5200, g=0.34, pan0=0.6, pan1=-0.6, q=0.6)
        n = ns(0.3)
        sfx.add(lp(bruit(n), 300) * env(n, 0.05, 0.08) * 0.6, t + 0.1, g=0.25)


# ================================================================ COMPOSITION
coupure = T(3) - S16 * 2          # silence juste avant le premier temps fort
grosses_caisses = []


def kick_a(t, g=0.8):
    drums.add(kick(), t, g=g)
    grosses_caisses.append(t)


# ---- 1. accroche (mesures 1-2) : battements, horloge, arpège qui s'ouvre, montée
for t in [0, T(1, 3), T(2, 1), T(2, 3)]:
    n = ns(0.35)
    lub = np.sin(2 * np.pi * np.cumsum(62 + 50 * np.exp(-tt(n) / 0.04)) / SR) * env(n, 0.004, 0.08)
    lub += lp(bruit(n), 250) * env(n, 0.002, 0.05) * 0.4
    drums.add(np.tanh(2.4 * lub), t, g=0.7)
    drums.add(np.tanh(2.4 * lub), t + 0.17, g=0.42)

t = 0.0
k = 0
while t < coupure - 1e-6:
    drums.add(clic(4600 if k % 2 == 0 else 3900, 0.006), t, g=0.16 if k % 2 == 0 else 0.09, pan=0.25 if k % 2 == 0 else -0.25)
    t += B / 2
    k += 1

arp_fm = [54, 57, 61, 64, 61, 57]
arp_e = [52, 56, 59, 64, 59, 56]
for i in range(int(coupure / S16) + 1):
    t = i * S16
    if t >= coupure - 1e-6:
        break
    notes = arp_e if t >= T(2, 3) - 1e-6 else arp_fm
    m = notes[i % 6]
    pince(m, t, long=S16 * 1.2, g=0.15 + 0.12 * t / coupure, clair=0.08 + 0.95 * (t / coupure) ** 1.6, pan=0.35 if i % 2 else -0.35)

for (notes, a, b) in [([42, 49], 0.0, T(2, 3)), ([40, 47], T(2, 3), coupure)]:
    n = ns(b - a + 0.02)
    st = sum(lp(saw(hz(m), n) * 0.5 + sine(hz(m), n), 600) for m in notes)
    e = np.minimum(1, (tt(n) + a) / 1.6) * np.minimum(1, (b - a - tt(n)) / 0.01)
    musique.add(st * e, a, g=0.09)

n = ns(coupure - T(2))
u = tt(n) / (coupure - T(2))
x = hp(bruit(n), 200)
r = filtre_var(x, 400 * (9000 / 400) ** u, 'low') * u ** 2.2
sfx.add(np.vstack([r, np.roll(r, 37)]), T(2), g=0.16)
sw = sine(220 * (1760 / 220) ** u, n) * u ** 2.5
sfx.add(sw, T(2), g=0.05)
for (a, b, pas) in [(T(2), T(2, 3), B / 2), (T(2, 3), T(2, 4), S16), (T(2, 4), coupure, S16 / 2)]:
    t = a
    while t < b - 1e-6:
        drums.add(snare(), t, g=0.06 + 0.32 * ((t - T(2)) / (coupure - T(2))) ** 1.5)
        t += pas
rc = crash(0.55)[:, ::-1]
sfx.add(rc, T(3) - 0.55, g=0.3)

# ---- 2. le logo (mesure 3) : impact
drums.add(boom(), T(3), g=0.6)
kick_a(T(3), 1.0)
drums.add(crash(2.2), T(3), g=0.42)
envoi_rev.add(crash(2.2), T(3), g=0.1)
n = ns(1.6)
stab = sum(supersaw(hz(m), n, fc=5000) for m in [45, 52, 57, 61, 64, 69]) / np.sqrt(6)
stab *= env(n, 0.002, 0.45)
musique.add(stab, T(3), g=0.3)
envoi_rev.add(stab, T(3), g=0.12)
for j, m in enumerate([81, 83, 85, 88, 93]):
    cloche(m, T(3, 2) - 0.08 + j * 0.045, 1.4, g=0.11, pan=-0.5 + j * 0.25, rev=0.7)

# ---- 3. le groove (mesures 3 à 7)
accords = {3: ('A', [57, 61, 64, 69], 45), 4: ('E', [56, 59, 64, 68], 40), 5: ('F#m', [57, 61, 66, 69], 42),
           6: ('D', [57, 62, 66, 69], 38), 7: ('E', [56, 59, 64, 71], 40)}
lead = {4: [64, 68, 71, 76], 5: [66, 69, 73, 78], 6: [62, 66, 69, 74], 7: [64, 68, 71, 76]}
motif = [(0, 2), (2, 1), (3, 3), (6, 2), (8, 0), (10, 2), (11, 1), (14, 3)]
for bar in range(3, 8):
    nom, nappe_notes, racine = accords[bar]
    nappe(nappe_notes, T(bar) + (0.02 if bar == 3 else 0), BAR - 0.02, g=0.24 if bar > 3 else 0.2)
    for beat in range(4):
        tb = T(bar, beat + 1)
        if bar == 7 and beat == 3:
            continue
        if not (bar == 3 and beat == 0):
            kick_a(tb)
        if beat in (1, 3):
            drums.add(clap(), tb, g=0.55)
            envoi_rev.add(np.vstack([clap(), clap()]), tb, g=0.06)
        basse(racine, tb + B / 2, B / 2 * 0.85)
        if bar >= 4:
            for s16 in range(4):
                g = 0.17 if s16 == 2 else 0.09
                drums.add(hat(), tb + s16 * S16, g=g, pan=0.2 if s16 % 2 else -0.15)
            drums.add(hat(True), tb + B / 2, g=0.1, pan=0.1)
        else:
            drums.add(hat(True), tb + B / 2, g=0.06)
    if bar >= 4:
        tons = lead[bar]
        for (pos, idx) in motif:
            m = tons[idx] + (12 if bar == 7 and pos >= 8 else 0)
            pince(m, T(bar) + pos * S16, g=0.24, clair=0.85, pan=0.25 if idx % 2 else -0.25)
# fill de fin de mesure 7
for j in range(4):
    drums.add(snare(), T(7, 4) + j * S16, g=0.15 + 0.1 * j)
n = ns(B)
u = tt(n) / B
sfx.add(filtre_var(hp(bruit(n), 300), 600 * (10000 / 600) ** u) * u ** 2, T(7, 4), g=0.14)

# ---- 4. la fin (mesure 8)
drums.add(boom(66, 34, 1.5), T(8), g=0.55)
kick_a(T(8), 1.0)
drums.add(crash(2.4), T(8), g=0.4)
envoi_rev.add(crash(2.4), T(8), g=0.12)
final = [45, 52, 57, 61, 64, 69, 76]
n = ns(DUREE - T(8))
stab = sum(supersaw(hz(m), n, fc=4200) for m in final) / np.sqrt(len(final))
stab *= env(n, 0.003, 0.9) * 0.6 + adsr(n, 0.004, 0.5, 0.5, 0.6, DUREE - T(8) - 0.6) * 0.4
musique.add(stab, T(8), g=0.3)
envoi_rev.add(stab, T(8), g=0.14)
n = ns(DUREE - T(8))
sub = sine(hz(33), n) * adsr(n, 0.01, 1.0, 0.4, 0.5, DUREE - T(8) - 0.5)
musique.add(sub, T(8), g=0.1)
for j, m in enumerate([81, 85, 88, 93, 97]):
    cloche(m, T(8) + 0.18 + j * 0.04, 1.8, g=0.12, pan=-0.5 + j * 0.25, rev=0.8)
cloche(93, T(8, 3), 1.5, g=0.08, rev=0.9)
for beat in range(1, 4):
    drums.add(hat(), T(8, beat + 1), g=0.04)

# ---------------------------------------------------------------- bruitages calés sur l'image
cues = json.load(open(sys.argv[1]))
for c in cues:
    if c['k'] in ('impact', 'final'):
        continue
    bfx(c['k'], c['t'], c['v'])

# ================================================================ MIXAGE
t_all = tt(N)
duck = np.ones(N)
for tk in grosses_caisses:
    i = int(tk * SR)
    m = min(N - i, ns(0.4))
    d = 1 - 0.62 * np.exp(-np.arange(m) / (0.075 * SR))
    a = min(m, ns(0.004))
    d[:a] = np.linspace(1, d[a], a)
    duck[i:i + m] = np.minimum(duck[i:i + m], d)


def ir(rt=2.3, pre=0.022):
    n = ns(rt)
    t = tt(n)
    dec = np.exp(-6.91 * t / rt)
    out = []
    for c in range(2):
        w = bruit(n) * dec
        clair = lp(w, 8000)
        sombre = lp(w, 2200)
        k = np.minimum(1, t / rt * 1.8)
        w = clair * (1 - k) + sombre * k
        w = np.concatenate([np.zeros(ns(pre)), w])
        out.append(w / np.sqrt(np.sum(w ** 2)))
    return out


R = ir()
rev = np.vstack([signal.fftconvolve(envoi_rev.x[c], R[c])[:N] for c in range(2)])
rev = hp(rev, 250)

dl = np.zeros((2, N))
pas = ns(0.75 * B)
src = envoi_delai.x.copy()
for k in range(1, 6):
    g = 0.42 ** k
    c = k % 2
    dl[c, pas * k:] += g * lp(src.sum(0) * 0.5, 5000)[:N - pas * k]

mix = drums.x + musique.x * duck + sfx.x + rev * 0.55 * (0.5 + 0.5 * duck) + dl * 0.6 * duck
mix = hp(mix, 32)


def compresseur(x, seuil=0.35, ratio=2.5, att=0.004, rel=0.12):
    niveau = np.sqrt(uniform_filter1d((x ** 2).mean(0), ns(0.01)))
    cible = np.where(niveau > seuil, (seuil * (niveau / seuil) ** (1 / ratio)) / np.maximum(niveau, 1e-9), 1.0)
    g = np.empty(N)
    a_att = np.exp(-1 / (att * SR))
    a_rel = np.exp(-1 / (rel * SR))
    gc = 1.0
    for i in range(N):
        c = cible[i]
        gc = a_att * gc + (1 - a_att) * c if c < gc else a_rel * gc + (1 - a_rel) * c
        g[i] = gc
    return x * g


mix = compresseur(mix)


def limiteur(x, plafond=0.89, avance=0.004):
    pic = np.abs(x).max(0) + 1e-9
    g = np.minimum(1.0, plafond / pic)
    L = ns(avance)
    g = minimum_filter1d(g, size=2 * L + 1)
    g = uniform_filter1d(g, size=L)
    return np.clip(x * g, -plafond, plafond)


gain = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
mix = limiteur(np.tanh(mix * gain * 1.1) / 1.1)
fondu = np.ones(N)
f = ns(0.45)
fondu[-f:] = np.cos(np.linspace(0, np.pi / 2, f)) ** 2
mix *= fondu
mix[:, :ns(0.003)] *= np.linspace(0, 1, ns(0.003))
wavfile.write(sys.argv[2], SR, (mix.T * 32767).astype(np.int16))
print('pic', np.abs(mix).max().round(3), 'rms', np.sqrt((mix ** 2).mean()).round(4))
