"""Draws the architecture / flow diagrams and result charts used in the report.
Run after `node tests/experiments.js`:   python docs/make_figures.py"""
import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'report_img')
R = json.load(open(os.path.join(HERE, 'results.json')))
dims_path = os.path.join(OUT, 'dims.json')
DIMS = json.load(open(dims_path)) if os.path.exists(dims_path) else {}
plt.rcParams['font.family'] = 'DejaVu Sans'
C_FIX, C_SELF, C_NASH, INK, MUTED = '#64748b', '#0d9488', '#4f46e5', '#0e1621', '#586577'


def save(fig, name):
    png = os.path.join(OUT, name + '.png')
    fig.savefig(png, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    im = Image.open(png).convert('RGB')
    im.save(os.path.join(OUT, name + '.jpg'), quality=92)
    os.remove(png)
    DIMS[name + '.jpg'] = im.size


def box(ax, x, y, w, h, title, lines, color, tcolor='white'):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.0,rounding_size=0.12', fc=color, ec='none'))
    ax.text(x + 0.14, y + h - 0.2, title, color=tcolor, fontsize=9.5, fontweight='bold', va='top')
    for i, l in enumerate(lines):
        ax.text(x + 0.14, y + h - 0.55 - i * 0.27, l, color=tcolor, fontsize=7.4, va='top', alpha=0.95)


def arrow(ax, a, b, color=MUTED, style='-|>', rad=0.0, ls='-'):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle=style, mutation_scale=12, color=color, lw=1.4, connectionstyle='arc3,rad=%s' % rad, linestyle=ls))


# ------------------------------------------------------------------ d1 architecture
fig, ax = plt.subplots(figsize=(11, 6.2)); ax.set_xlim(0, 11); ax.set_ylim(0, 6.2); ax.axis('off')
ax.text(5.5, 5.95, 'System architecture: a closed loop between traffic, detectors and game-playing signals', ha='center', fontsize=11.5, fontweight='bold', color=INK)
box(ax, 0.2, 3.6, 2.4, 1.9, '1. Demand', ['Poisson arrivals per entry', 'direction mix, rush wave', 'car, bike, auto, bus mix', 'same seed, same traffic'], '#475569')
box(ax, 2.95, 3.6, 2.5, 1.9, '2. Traffic simulator', ['microscopic, step 0.1 s', 'safe-distance following', 'stop lines, no box blocking', 'spillback emerges'], '#2563eb')
box(ax, 5.8, 3.6, 2.3, 1.9, '3. Detectors', ['q queued, m approaching', 'w waiting time', 'e emergency vehicle', 'blocked-approach flag'], '#0f766e')
box(ax, 8.45, 3.6, 2.35, 1.9, '4. Controllers', ['Fixed-time 20 s / 20 s', 'Selfish (lambda=kappa=0)', 'Nash game (best response)', 'decides every 1 s'], '#4f46e5')
box(ax, 8.45, 1.35, 2.35, 1.75, '5. Phase machine', ['min green 8 s, max 45 s', 'yellow 2.5 s, all-red 1 s', 'preemption: min green 3 s'], '#b45309')
box(ax, 2.95, 1.35, 2.5, 1.75, 'Disruptions (live)', ['block an approach 60-180 s', 'send an ambulance', 'same event for all controllers'], '#b91c1c')
box(ax, 0.2, 0.15, 5.25, 0.95, 'Measurement and analysis', ['delay, P95, stops, idling, ambulance trip, paired t-test,', 'exact equilibrium enumeration, lambda sweep'], '#334155')
box(ax, 5.8, 0.15, 5.0, 0.95, 'Presentation (runs in the browser, no server)', ['animated map, payoff matrix, signal timeline,', 'benchmark, history, CSV / JSON export'], '#1e293b')
for a_, b_ in [((2.6, 4.55), (2.95, 4.55)), ((5.45, 4.55), (5.8, 4.55)), ((8.1, 4.55), (8.45, 4.55))]:
    arrow(ax, a_, b_)
arrow(ax, (9.62, 3.6), (9.62, 3.1))
arrow(ax, (8.45, 2.2), (5.45, 4.0), rad=-0.25)
ax.text(7.2, 2.95, 'green / red lights', fontsize=7.5, color=MUTED, ha='center')
arrow(ax, (4.2, 3.1), (4.2, 3.6), color='#b91c1c')
save(fig, 'd1_architecture')

# ------------------------------------------------------------------ d2 decision cycle
fig, ax = plt.subplots(figsize=(11, 3.9)); ax.set_xlim(0, 11); ax.set_ylim(0, 3.9); ax.axis('off')
ax.text(5.5, 3.65, 'One decision cycle (once per simulated second)', ha='center', fontsize=11.5, fontweight='bold', color=INK)
steps = [('Read detectors', 'q, m, w, e\nblocked flags', '#0f766e'), ('Start from the\ncurrent phases', 'committed junctions\n(yellow / all-red) fixed', '#475569'),
         ('Sweep players', 'each picks its best\nresponse to the others', '#4f46e5'), ('Stable?', 'no change in a full\nsweep = Nash equilibrium', '#6d28d9'),
         ('Apply with safety', 'min / max green,\nyellow, all-red', '#b45309')]
x = 0.2
for i, (t, d, c) in enumerate(steps):
    ax.add_patch(FancyBboxPatch((x, 1.5), 1.9, 1.5, boxstyle='round,pad=0.0,rounding_size=0.12', fc=c, ec='none'))
    ax.text(x + 0.95, 2.72, t, ha='center', va='top', color='white', fontsize=9, fontweight='bold')
    ax.text(x + 0.95, 2.15, d, ha='center', va='top', color='white', fontsize=7.4)
    if i < 4: arrow(ax, (x + 1.9, 2.25), (x + 2.15, 2.25))
    x += 2.15
arrow(ax, (6.9, 1.5), (5.3, 1.5), rad=-0.5, color='#6d28d9')
ax.text(6.1, 0.72, 'not stable: another sweep\n(cut off after 8 rounds)', ha='center', fontsize=7.6, color='#6d28d9')
ax.text(10.1, 1.15, 'next second:\nnew detector data', ha='center', fontsize=7.6, color=MUTED)
save(fig, 'd2_decision_cycle')


# ------------------------------------------------------------------ result charts
def bars(ax, names, series, ylabel, title, errs=None, labels=True):
    n = len(series); w = 0.8 / n
    for k, (lab, vals, col) in enumerate(series):
        xs = [i + (k - (n - 1) / 2) * w for i in range(len(names))]
        e = errs[k] if errs else None
        ax.bar(xs, vals, w * 0.92, color=col, label=lab, yerr=e, capsize=2.5, error_kw={'lw': 0.9, 'ecolor': INK})
        if labels:
            for xx, v in zip(xs, vals): ax.text(xx, v + (max(vals) * 0.015), '%.0f' % v, ha='center', va='bottom', fontsize=6.6, color=INK)
    ax.set_xticks(range(len(names))); ax.set_xticklabels(names, fontsize=7.5)
    ax.set_ylabel(ylabel, fontsize=8.5); ax.set_title(title, fontsize=10.5, fontweight='bold', loc='left', color=INK)
    ax.spines[['top', 'right']].set_visible(False); ax.grid(axis='y', alpha=0.25); ax.legend(fontsize=7.5, frameon=False)


sc = R['scenarios']
names = [s['name'].replace(' (', '\n(').replace('2x2 ', '2x2\n').replace('3x3 ', '3x3\n') for s in sc]
names = [n.replace('\n(8 veh/min)', '').replace('\n(11 veh/min)', ' heavy').replace('\n(+45%)', ' +45%') for n in names]
names = ['2x2 balanced', '2x2 E-W rush', '2x2 heavy', '2x2 wave', '3x3 balanced', '3x3 heavy']
fig, ax = plt.subplots(figsize=(8.6, 3.9))
bars(ax, names, [(c.capitalize() if c != 'nash' else 'Nash game', [s['controllers'][c]['delay'][0] for s in sc], col) for c, col in [('fixed', C_FIX), ('selfish', C_SELF), ('nash', C_NASH)]],
     'average delay per vehicle (s)', 'Average delay by scenario (mean of 10 seeds, error bars = SD)',
     errs=[[s['controllers'][c]['delay'][1] for s in sc] for c in ['fixed', 'selfish', 'nash']])
save(fig, 'c1_delay_by_scenario')

fig, ax = plt.subplots(figsize=(8.6, 3.6))
chg = [s['tests']['nashVsFixed']['change'] for s in sc]
ax.barh(names[::-1], [-c for c in chg[::-1]], color=C_NASH)
for i, c in enumerate(chg[::-1]): ax.text(-c + 0.8, i, '%.1f%%' % c, va='center', fontsize=8)
ax.set_xlabel('reduction in average delay versus fixed-time (%)', fontsize=8.5); ax.set_title('Gain of the Nash controller over fixed-time (every p < 0.001)', fontsize=10.5, fontweight='bold', loc='left', color=INK)
ax.spines[['top', 'right']].set_visible(False); ax.grid(axis='x', alpha=0.25)
save(fig, 'c2_gain_vs_fixed')

fig, axs = plt.subplots(1, 2, figsize=(9.2, 3.5))
for ax, sw in zip(axs, R['sweep']):
    xs = [p['lam'] for p in sw['points']]; ys = [p['mean'] for p in sw['points']]; es = [p['sd'] for p in sw['points']]
    ax.errorbar(xs, ys, yerr=es, color=C_NASH, marker='o', ms=4, lw=1.8, capsize=2.5, label='Nash game at each lambda')
    ax.axhline(sw['fixed'], color=C_FIX, ls='--', lw=1.4, label='Fixed-time')
    ax.set_title(sw['name'], fontsize=10, fontweight='bold', loc='left', color=INK); ax.set_xlabel('spillback penalty lambda (0 = selfish game)', fontsize=8.5)
    ax.set_ylabel('average delay (s)', fontsize=8.5); ax.spines[['top', 'right']].set_visible(False); ax.grid(alpha=0.25); ax.legend(fontsize=7.5, frameon=False)
save(fig, 'c3_lambda_sweep')

pre = R['preemption']
fig, ax = plt.subplots(figsize=(6.2, 3.5))
labs = ['Fixed-time', 'Nash,\nno preemption', 'Nash,\npreemption on']; vals = [pre['fixed'][0], pre['off'][0], pre['on'][0]]; errs = [pre['fixed'][1], pre['off'][1], pre['on'][1]]
ax.bar(labs, vals, color=[C_FIX, '#8b8bd6', C_NASH], yerr=errs, capsize=3, error_kw={'lw': 0.9})
for i, v in enumerate(vals): ax.text(i, v + 1.2, '%.1f s' % v, ha='center', fontsize=8.5, fontweight='bold')
ax.set_ylabel('ambulance trip time (s)', fontsize=8.5); ax.set_title('Ambulance trip, 10 seeds (mean, SD)', fontsize=10.5, fontweight='bold', loc='left', color=INK)
ax.spines[['top', 'right']].set_visible(False); ax.grid(axis='y', alpha=0.25)
save(fig, 'c4_ambulance')

ds = R['disruptions']
fig, ax = plt.subplots(figsize=(8.2, 3.6))
dn = ['No disruption\n(2x2 balanced)', 'Blocked\napproaches', 'Ambulance\nruns', 'Both']
base = [sc[0]] + ds
bars(ax, dn, [(('Nash game' if c == 'nash' else c.capitalize()), [s['controllers'][c]['delay'][0] for s in base], col) for c, col in [('fixed', C_FIX), ('selfish', C_SELF), ('nash', C_NASH)]],
     'average delay (s)', 'Average delay under disruptions (mean of 10 seeds)')
save(fig, 'c5_disruptions')

eq = R['equilibrium']
fig, axs = plt.subplots(1, 2, figsize=(8.6, 3.3))
en = [e['name'] for e in eq]
axs[0].bar(en, [e['efficiency'][0] * 100 for e in eq], color=C_NASH); axs[0].set_ylim(90, 100); axs[0].set_title('Equilibrium efficiency (%)', fontsize=10, fontweight='bold', loc='left', color=INK)
axs[1].bar(en, [e['bestPlanShare'][0] * 100 for e in eq], color=C_SELF); axs[1].set_ylim(0, 100); axs[1].set_title('Decisions where the equilibrium is the best plan (%)', fontsize=9.2, fontweight='bold', loc='left', color=INK)
for a, k, sc_ in [(axs[0], 'efficiency', 100), (axs[1], 'bestPlanShare', 100)]:
    for i, e in enumerate(eq): a.text(i, e[k][0] * sc_ + (0.25 if k == 'efficiency' else 2), '%.1f' % (e[k][0] * sc_), ha='center', fontsize=8.5, fontweight='bold')
    a.spines[['top', 'right']].set_visible(False); a.grid(axis='y', alpha=0.25); a.tick_params(axis='x', labelsize=8)
save(fig, 'c6_equilibrium_quality')

logo = os.path.join(OUT, 'sies_logo.png')
if os.path.exists(logo): DIMS['sies_logo.png'] = list(Image.open(logo).size)
json.dump(DIMS, open(dims_path, 'w'), indent=1)
print('figures done')
