"""Records a narrated walkthrough of the project: concept slides + live demo of the real app.

Needs: Google Chrome, ffmpeg on PATH, `pip install playwright edge-tts` and an internet connection for the neural voice
(falls back to the built-in Windows voice if the connection fails).

    python video/make_demo_video.py            # -> video/Traffic_Signal_Game_Theory_Demo.mp4
                                               #    video/narration_transcript.md   (what is said, with timestamps)
                                               #    video/Traffic_Signal_Game_Theory_Demo.srt  (subtitles)
Environment: VOICE (default en-IN-NeerjaNeural; en-IN-PrabhatNeural is the male alternative), RATE (default -4%).
"""
import asyncio, os, re, subprocess, sys, threading, time, wave, http.server, functools, json

from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = os.path.join(HERE, '_work')
OUT = os.path.join(HERE, 'Traffic_Signal_Game_Theory_Demo.mp4')
W, H = 1600, 900
VOICE = os.environ.get('VOICE', 'en-IN-NeerjaNeural')
RATE = os.environ.get('RATE', '-4%')
PORT = 8766
BASE = 'http://127.0.0.1:%d/index.html' % PORT
START_LAG = 0.35
R = json.load(open(os.path.join(ROOT, 'docs', 'results.json')))

OVERLAY_JS = r"""
window.addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style');
  st.textContent = `.rv{opacity:0;transform:translateY(18px);transition:opacity .8s ease,transform .8s ease}.rv.on{opacity:1;transform:none}
  .vcard h1{margin:0}.vcard{font-family:"Barlow","Segoe UI",sans-serif}
  .tile{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:22px 26px}`;
  document.head.appendChild(st);
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;z-index:99999;width:26px;height:26px;border-radius:50%;background:rgba(79,70,229,.35);border:2px solid #4f46e5;pointer-events:none;transform:translate(-50%,-50%);left:-60px;top:-60px;transition:background .1s,transform .1s';
  document.body.appendChild(c);
  document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  document.addEventListener('mousedown', () => { c.style.background = 'rgba(79,70,229,.95)'; c.style.transform = 'translate(-50%,-50%) scale(.8)'; }, true);
  document.addEventListener('mouseup', () => { c.style.background = 'rgba(79,70,229,.35)'; c.style.transform = 'translate(-50%,-50%)'; }, true);
  const cap = document.createElement('div');
  cap.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:70%;z-index:99998;background:rgba(10,16,28,.9);color:#fff;font:500 21px/1.4 "Barlow","Segoe UI",sans-serif;padding:10px 24px;border-radius:14px;text-align:center;display:none;box-shadow:0 10px 34px rgba(0,0,0,.45)';
  document.body.appendChild(cap);
  window.__cap = t => { cap.textContent = t; cap.style.display = t ? 'block' : 'none'; };
  const card = document.createElement('div');
  card.className = 'vcard';
  card.style.cssText = 'position:fixed;inset:0;z-index:99997;background:linear-gradient(150deg,#070c16,#10193a 55%,#241f5c);color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 70px 90px';
  document.body.appendChild(card);
  window.__card = h => { card.innerHTML = h; card.style.display = h ? 'flex' : 'none'; };
  window.__rev = n => document.querySelectorAll('.vcard [data-n]').forEach(e => { if (+e.dataset.n <= n) e.classList.add('on'); });
});
"""


def tile(n, title, body, color='#a5b4fc', w=None):
    return ('<div class="tile rv" data-n="%d" style="text-align:left;%s"><div style="font-size:30px;font-weight:700;color:%s;margin-bottom:8px">%s</div>'
            '<div style="font-size:22px;line-height:1.45;color:#e6ebf8">%s</div></div>') % (n, ('width:%s;' % w) if w else '', color, title, body)


TITLE = """
<div style="font-size:24px;letter-spacing:.2em;color:#a5b4fc;margin-bottom:22px">DATA SCIENCE · COMPLEX ENGINEERING PROBLEM 1</div>
<h1 style="font-size:78px;line-height:1.08;max-width:1200px">Smart Traffic Signal Optimization<br>using Game Theory</h1>
<div style="font-size:30px;margin-top:30px;color:#fcd34d">Every signal is a rational player. The equilibrium decides who goes.</div>
<div style="font-size:22px;margin-top:44px;color:#b6c2e2">Team G2 · Batch B1 · Bharath Rathinasapabathy · Gregory · Harshwardhan Ahire</div>
<div style="font-size:20px;margin-top:8px;color:#8d9bc2">SIES Graduate School of Technology, Nerul · SDG 11: Sustainable Cities and Communities</div>
"""

PROBLEM = """
<h1 style="font-size:54px;margin-bottom:34px">The problem with fixed-time signals</h1>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:26px;max-width:1380px;text-align:left">
 <div class="tile rv" data-n="1"><svg viewBox="0 0 300 150" width="100%" height="150"><rect x="20" y="20" width="60" height="110" rx="12" fill="#111827" stroke="#334155"/><circle cx="50" cy="48" r="13" fill="#3f1d1d"/><circle cx="50" cy="75" r="13" fill="#3f3516"/><circle cx="50" cy="102" r="13" fill="#22c55e"/><text x="100" y="62" fill="#e6ebf8" font-size="22">Green for 20 s...</text><text x="100" y="92" fill="#fca5a5" font-size="22">...to an empty road</text></svg>
  <div style="font-size:30px;font-weight:700;color:#fcd34d;margin:10px 0 6px">A timer cannot see</div><div style="font-size:22px;line-height:1.45;color:#e6ebf8">20 seconds one way, 20 the other, whatever the traffic. Cars idle at red in front of an empty cross street.</div></div>
 <div class="tile rv" data-n="2"><svg viewBox="0 0 300 150" width="100%" height="150"><rect x="10" y="55" width="130" height="40" rx="6" fill="#1f2937"/><rect x="160" y="55" width="130" height="40" rx="6" fill="#7f1d1d"/><g fill="#93c5fd"><rect x="20" y="62" width="22" height="26" rx="4"/><rect x="48" y="62" width="22" height="26" rx="4"/><rect x="76" y="62" width="22" height="26" rx="4"/></g><g fill="#fecaca"><rect x="168" y="62" width="22" height="26" rx="4"/><rect x="196" y="62" width="22" height="26" rx="4"/><rect x="224" y="62" width="22" height="26" rx="4"/><rect x="252" y="62" width="22" height="26" rx="4"/></g><text x="20" y="40" fill="#e6ebf8" font-size="19">J1 clears its queue</text><text x="290" y="130" text-anchor="end" fill="#fca5a5" font-size="19">J2 link full: spillback</text><path d="M104 75 H150" stroke="#e6ebf8" stroke-width="3" marker-end="url(#a)"/></svg>
  <div style="font-size:30px;font-weight:700;color:#fcd34d;margin:10px 0 6px">Local greed hurts neighbours</div><div style="font-size:22px;line-height:1.45;color:#e6ebf8">A signal that only serves its own queue can push cars into a junction that is already full, and block that junction too.</div></div>
 <div class="tile rv" data-n="3"><svg viewBox="0 0 300 150" width="100%" height="150"><rect x="10" y="55" width="280" height="40" rx="6" fill="#1f2937"/><g fill="#93c5fd"><rect x="150" y="62" width="22" height="26" rx="4"/><rect x="178" y="62" width="22" height="26" rx="4"/><rect x="206" y="62" width="22" height="26" rx="4"/><rect x="234" y="62" width="22" height="26" rx="4"/></g><rect x="100" y="60" width="36" height="30" rx="5" fill="#fff"/><rect x="113" y="66" width="10" height="18" fill="#d32f2f"/><rect x="109" y="72" width="18" height="6" fill="#d32f2f"/><text x="20" y="40" fill="#e6ebf8" font-size="19">Ambulance stuck behind the queue</text></svg>
  <div style="font-size:30px;font-weight:700;color:#fcd34d;margin:10px 0 6px">Emergencies wait too</div><div style="font-size:22px;line-height:1.45;color:#e6ebf8">There is no way to ask for priority, and no way to react to a stalled vehicle or road work.</div></div>
</div>
"""

IDEA = """
<h1 style="font-size:54px;margin-bottom:12px">The idea: signals as players in a game</h1>
<div style="font-size:24px;color:#b6c2e2;margin-bottom:30px">Each signal controls only its own phase, but its result depends on its neighbours.</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:1380px">
""" + tile(1, 'Players', 'The junctions. Four on a 2×2 grid, nine on a 3×3 grid.') + tile(2, 'Strategies', 'Which road gets the next green: <b>↕ North–South</b> or <b>↔ East–West</b>.') + \
    tile(3, 'Payoff', '<span style="color:#86efac">+</span> vehicles cleared, waiting relieved<br><span style="color:#fca5a5">−</span> switching cost σ<br><span style="color:#fca5a5">−</span> spillback into a full neighbour, λ<br><span style="color:#86efac">+</span> bonus for a neighbour’s platoon, κ', '#fcd34d') + \
    tile(4, 'Nash equilibrium', 'A set of choices where <b>no junction can do better by changing only its own choice</b>. Stable: nobody has a reason to deviate.', '#86efac') + "</div>"

METHOD = """
<h1 style="font-size:54px;margin-bottom:30px">Finding the equilibrium every second</h1>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:1440px">
""" + tile(1, '1. Read detectors', 'Queue q, approaching m, waiting w, ambulance e, blocked approach.', '#5eead4') + tile(2, '2. Best response', 'One by one, each junction picks the phase with the higher payoff given the others’ current choice.', '#a5b4fc') + \
    tile(3, '3. Repeat until stable', 'A full round with no change = <b>pure Nash equilibrium</b>. It stopped within the 8-round cap in 100% of decisions.', '#fcd34d') + tile(4, '4. Safety layer', 'Yellow 2.5 s, all-red 1 s, minimum green 8 s, maximum 45 s. Conflicting greens are impossible.', '#fca5a5') + """</div>
<div class="rv" data-n="5" style="margin-top:34px;font-size:26px;color:#e6ebf8">Compared with <b style="color:#cbd5e1">Fixed-time</b> (20 s / 20 s, no sensing) and <b style="color:#5eead4">Selfish</b> (the same game with λ = κ = 0).</div>
"""


def res_rows():
    out = ''
    for s in R['scenarios']:
        ch = s['tests']['nashVsFixed']['change']; ns = s['tests']['nashVsSelfish']
        out += '<tr><td style="text-align:left">%s</td><td>%.1f</td><td>%.1f</td><td>%.1f</td><td style="color:#86efac">%.1f%%</td><td style="color:#cbd5e1">%+.1f%% (p = %.2f)</td></tr>' % (
            s['name'], s['controllers']['fixed']['delay'][0], s['controllers']['selfish']['delay'][0], s['controllers']['nash']['delay'][0], ch, ns['change'], ns['p'])
    return out


PRE = R['preemption']
RESULTS = """
<h1 style="font-size:50px;margin-bottom:20px">What the data says <span style="font-size:26px;color:#b6c2e2;font-weight:400">(10 seeds × 15 simulated minutes, synthetic demand)</span></h1>
<table class="rv" data-n="1" style="border-collapse:collapse;font-size:23px;max-width:1380px;width:100%;color:#e6ebf8">
<thead><tr style="color:#a5b4fc"><th style="text-align:left;padding:8px 12px">Average delay (s)</th><th>Fixed</th><th>Selfish</th><th>Nash</th><th>Nash vs fixed</th><th>Nash vs selfish</th></tr></thead>
<tbody style="line-height:1.9">""" + res_rows() + """</tbody></table>
<div style="display:flex;gap:24px;margin-top:26px;max-width:1380px">
<div class="tile rv" data-n="2" style="flex:1;text-align:left"><div style="font-size:26px;font-weight:700;color:#86efac">Adaptive beats fixed-time</div><div style="font-size:21px;line-height:1.45;margin-top:6px">8% to 63% less delay, every p &lt; 0.001. Ambulance trip @FIX@ s (fixed-time) → @OFF@ s (no preemption) → <b>@ON@ s</b> with preemption.</div></div>
<div class="tile rv" data-n="3" style="flex:1;text-align:left;border-color:#fcd34d"><div style="font-size:26px;font-weight:700;color:#fcd34d">What we did not find</div><div style="font-size:21px;line-height:1.45;margin-top:6px">The coupled Nash game was <b>not significantly better</b> than the selfish controller in any scenario. Most of the gain comes from adaptivity.</div></div></div>
""".replace('@FIX@', '%.0f' % PRE['fixed'][0]).replace('@OFF@', '%.0f' % PRE['off'][0]).replace('@ON@', '%.0f' % PRE['on'][0])

END = """
<h1 style="font-size:52px;margin-bottom:26px">Summary</h1>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;max-width:1380px">
""" + tile(1, 'Idea', 'Signals as players; a Nash equilibrium of their payoffs decides who goes, every second.') + tile(2, 'Evidence', 'Seeded simulation, common random numbers, paired t-tests: 8% to 63% less delay than fixed-time.', '#86efac') + \
    tile(3, 'Dynamic', 'Blocked roads, ambulance preemption, exact equilibrium analysis, benchmark with disruptions, export and share links.', '#fcd34d') + tile(4, 'Honest', 'Nash ≈ selfish here; synthetic demand; not yet calibrated against real data.', '#fca5a5') + """</div>
<div class="rv" data-n="5" style="margin-top:34px;font-size:24px;color:#cbd5e1">JavaScript · Canvas · Node.js · Python · Playwright · Matplotlib · Git<br><b style="color:#a5b4fc">github.com/bharath050305/traffic-signal-game-theory</b></div>
<div class="rv" data-n="6" style="margin-top:22px;font-size:30px;color:#fcd34d">Thank you. Questions welcome.</div>
"""

BEATS = []   # (scene, narration, action-name)


def beat(scene, text):
    def deco(fn):
        BEATS.append((scene, text, fn)); return fn
    return deco


# ------------------------------------------------------------------ helpers
async def sleep(t): await asyncio.sleep(t)


async def glide(page, sel, dx=0, dy=0, steps=26):
    loc = page.locator(sel).first
    await loc.scroll_into_view_if_needed()
    b = await loc.bounding_box()
    await page.mouse.move(b['x'] + b['width'] / 2 + dx, b['y'] + b['height'] / 2 + dy, steps=steps)
    await sleep(0.15)


async def click(page, sel, **kw):
    await glide(page, sel, **kw); await page.locator(sel).first.click()


async def focus(page, sel, off=24, pause=0.9):
    await page.evaluate("([s, o]) => { const e = document.querySelector(s); const y = e.getBoundingClientRect().top + window.scrollY - o; window.scrollTo({top: y, behavior: 'smooth'}); }", [sel, off])
    await sleep(pause)


async def card(page, html, rev=0):
    await page.evaluate("h => window.__card(h)", html); await sleep(0.2)
    if rev: await page.evaluate("n => window.__rev(n)", rev)


async def reveal(page, n): await page.evaluate("n => window.__rev(n)", n)
async def hide_card(page): await page.evaluate("window.__card('')"); await sleep(0.4)
async def speed(page, v): await click(page, '#segSpeed button[data-v="%d"]' % v)


async def tab(page, t):
    await click(page, '#t-' + t); await sleep(1.0)
    await page.evaluate("window.scrollTo(0, 0)")


# ------------------------------------------------------------------ scenes
@beat('title', "Hello everyone. We are Team G2, and this is our Data Science complex engineering problem: Smart Traffic Signal Optimization using Game Theory. It supports Sustainable Development Goal eleven, sustainable cities, in particular safe and sustainable transport. In this video I will explain the idea, show the live system, and show what the data says, including what it does not say.")
async def b_title(page): await card(page, TITLE); await sleep(1)


@beat('problem', "Let us start with the problem. Most traffic signals run on a fixed timer: twenty seconds for one road, twenty for the other, whatever the traffic.")
async def b_p1(page): await card(page, PROBLEM, 1)


@beat('problem', "The timer cannot see that one road is empty, so cars wait at red in front of an empty cross street. And a signal that only looks at its own queue can push cars into a neighbouring junction that is already full, which then blocks that junction too. We call this spillback.")
async def b_p2(page): await sleep(1.5); await reveal(page, 2)


@beat('problem', "And an ambulance has no way to ask for priority. It waits in the queue like everyone else.")
async def b_p3(page): await sleep(0.5); await reveal(page, 3)


@beat('idea', "Here is our idea. Treat every junction as a player in a game. Each signal controls only its own phase, but its result depends on what its neighbours do. That is exactly the structure of a non-cooperative game. The players are the junctions: four on a two by two grid, nine on a three by three grid.")
async def b_i1(page): await card(page, IDEA, 1)


@beat('idea', "Each player has two strategies: give the next green to North-South, or to East-West.")
async def b_i2(page): await reveal(page, 2)


@beat('idea', "Each player has a payoff, which is a score. It gains for every vehicle it can clear, and for waiting time it relieves. It loses a little for switching, because switching wastes time. It loses for pushing cars into a neighbour whose road is already full; that is the spillback penalty, lambda. And it gains a bonus for matching a neighbour that is sending it a platoon of cars; that is kappa.")
async def b_i3(page): await sleep(0.5); await reveal(page, 3)


@beat('idea', "The solution concept is a Nash equilibrium: a set of choices where no junction can do better by changing only its own choice. That is stable, because nobody has a reason to deviate.")
async def b_i4(page): await sleep(0.5); await reveal(page, 4)


@beat('method', "How do we find that equilibrium every second? Each junction reads its detectors: how many vehicles are queued, how many are approaching, how long they have waited, and whether an ambulance or a blockage is there.")
async def b_m1(page): await card(page, METHOD, 1)


@beat('method', "Then, one after another, each junction picks the phase with the higher payoff, given what the others are currently doing. This is called best-response dynamics.")
async def b_m2(page): await reveal(page, 2)


@beat('method', "We repeat until a full round changes nothing. That is a pure Nash equilibrium. In our experiments this happened in every single decision, usually within two rounds.")
async def b_m3(page): await reveal(page, 3)


@beat('method', "Then a safety layer applies: yellow two and a half seconds, all-red one second, minimum green eight seconds, maximum forty-five. Conflicting greens are impossible. We compare against two baselines: a fixed timer, and a selfish controller, which is the same game with the neighbour terms switched off.")
async def b_m4(page): await reveal(page, 4); await sleep(4); await reveal(page, 5)


@beat('sim', "Now the live system. This is a traffic simulator with cars, bikes, auto-rickshaws and buses, driving on the left. The traffic lights are the players. The red tint shows queues, and the blue band is a green corridor, where two neighbouring junctions are serving the same road.")
async def b_s1(page):
    await hide_card(page); await focus(page, '.canvas-wrap', 70, 1.0); await speed(page, 4)
    await glide(page, '#sim', dx=-120, dy=-60); await sleep(2.5); await glide(page, '#sim', dx=120, dy=40, steps=60)


@beat('sim', "Below the map, the three controllers run side by side in the background, on exactly the same vehicle arrivals, so the comparison is fair. The map shows whichever one I select. After a minute or two you can see the fixed timer in grey has the highest delay, and the adaptive controllers are lower.")
async def b_s2(page):
    await focus(page, '#chartLive', 120, 1.2); await glide(page, '#chartLive', dx=-100); await sleep(4); await glide(page, '#score', dx=-80)


@beat('sim', "The tiles show average delay, vehicles stopped, throughput, and how often the equilibrium was reached. Idling time and a carbon dioxide figure are there too, but that figure is only an illustration.")
async def b_s3(page):
    await focus(page, '#kpis', 60, 1.0); await glide(page, '#kpis', dx=-150, dy=-40); await sleep(2); await glide(page, '#kpis', dx=150, dy=60, steps=40)


@beat('sim', "The signal timeline shows every junction's phases. Here is the fixed timer: a regular pattern. Now the Nash controller: the greens stretch and shrink to follow the queues.")
async def b_s4(page):
    await focus(page, '#chartTL', 160, 1.2)
    await page.mouse.move(800, 420, steps=20)
    await page.keyboard.press('1'); await sleep(3.2)      # shortcut keys switch the controller without scrolling the page
    await page.keyboard.press('3'); await sleep(3)


@beat('sim', "Clicking a junction opens the inspector: the queue on every approach, the payoff of each action, and the reason for the decision.")
async def b_s5(page):
    await focus(page, '#inspector', 60, 1.0); await click(page, '#chips .chip[data-i="1"]'); await sleep(2); await click(page, '#chips .chip[data-i="2"]')


@beat('game', "The Game model tab shows the game itself, live. Here is the payoff formula, and sliders to tune the weights while the simulation is running.")
async def b_g1(page):
    await tab(page, 'game'); await glide(page, '.eq', dx=-100); await sleep(2.5); await focus(page, '.params', 100, 1.0); await glide(page, '#gpLam')


@beat('game', "This is the payoff matrix for two neighbouring junctions. Each cell shows both payoffs. The underlined number is the best response to what the other player does. The shaded cell, where both are underlined, is the Nash equilibrium.")
async def b_g2(page):
    await focus(page, '#pmBox', 140, 1.0); await glide(page, '#pmBox', dx=-60, dy=20); await sleep(3)
    await click(page, '#chips2 .chip[data-i="2"]'); await sleep(1.5)


@beat('game', "Below it are the best-response rounds: junctions take turns, and by the second round nobody wants to change.")
async def b_g3(page): await focus(page, '#trace', 160, 1.0); await glide(page, '#trace', dx=100)


@beat('game', "New in version two is the equilibrium analysis. Every second the simulator lists all the joint plans, sixteen for four junctions, checks which are Nash equilibria, and finds the plan with the highest total payoff. The highlighted row is the plan the controller chose.")
async def b_e1(page): await focus(page, '#eqCard', 40, 1.2); await glide(page, '#eqTable', dx=-120, dy=-60); await sleep(2.5)


@beat('game', "Over ten seeds, the dynamics reached an equilibrium every time, there was almost always exactly one, and it captured ninety-seven to ninety-eight percent of the best possible joint payoff. It was the very best plan in fifty-seven to eighty-four percent of decisions. That gap is the price of anarchy of this game, and we measure it instead of assuming it.")
async def b_e2(page): await glide(page, '#eqKpis', dx=200); await sleep(5); await glide(page, '#eqNote', dx=-200)


@beat('dyn', "Now let us make it dynamic. I go back to the simulation, select junction J2, and block its approach from the west for a hundred and twenty seconds, like an accident or road work.")
async def b_d1(page):
    await tab(page, 'sim'); await focus(page, '#inspector', 60, 0.8); await click(page, '#chips .chip[data-i="1"]')
    await focus(page, '#disrupt', 40, 1.0); await glide(page, '#selBlkDir'); await sleep(1.2)
    await click(page, '#btnBlock')


@beat('dyn', "The striped barrier on the map is the blockage, with a countdown. The adaptive controllers see it through their detectors, so they stop giving that approach green, and the upstream junctions hold traffic back. The fixed timer cannot see it, and keeps giving green to a stop line nobody can cross. The event log records it.")
async def b_d2(page):
    await focus(page, '.canvas-wrap', 70, 1.2); await sleep(5); await focus(page, '#evLog', 300, 1.0)


@beat('dyn', "Next, an ambulance. I send one from the west on row one. It has flashing lights and a red halo. Under preemption, a large priority term is added to the payoff of its road, and the minimum green is cut to three seconds. Yellow and all-red are never skipped, so it stays safe.")
async def b_a1(page):
    await focus(page, '#disrupt', 40, 1.0); await click(page, '#btnAmb'); await sleep(3)
    await focus(page, '.canvas-wrap', 70, 1.0)


@beat('dyn', "The event log shows junctions pre-empting for the ambulance. One run is noisy, so I will send a few more, on different roads, to get a mean.")
async def b_a2(page):
    await focus(page, '#disrupt', 40, 1.0)
    for i, v in enumerate(['v|0|1', 'h|1|-1', 'v|1|-1']):
        await page.select_option('#selAmb', v); await click(page, '#btnAmb'); await sleep(6.5)


@beat('dyn', "The panel shows the latest and the mean trip time for each controller. Fixed-time is slower, because it cannot respond. Now I switch preemption off and send one more. A single run is noisy, so the fair comparison is the average over many seeds, which we will see in the benchmark: about fifty seconds for fixed-time, forty-three for the adaptive controller without preemption, and thirty-two with it.")
async def b_a3(page):
    await glide(page, '#ambResult', dx=-100); await sleep(3.5)
    await click(page, '#chkPre'); await page.select_option('#selAmb', 'h|0|1'); await click(page, '#btnAmb'); await sleep(8)


@beat('bench', "To make this rigorous, we use the Benchmark tab. It runs all three controllers on the same traffic, for ten seeds of fifteen simulated minutes. For each seed, every controller sees identical arrivals; this is called common random numbers. We inject blocked roads and ambulances, the same events for every controller, and compare with a paired t-test.")
async def b_b1(page):
    await click(page, '#chkPre')    # preemption back on for the benchmark
    await tab(page, 'bench')
    await page.select_option('#selSeeds', '10'); await page.select_option('#selDur', '900'); await page.select_option('#selDisrupt', 'both')
    await glide(page, '#selSeeds'); await sleep(1.5); await click(page, '#btnBench')
    await page.wait_for_function("document.getElementById('btnBench').disabled === false", timeout=240000)


@beat('bench', "Here is the result. The Nash controller lowers average delay by about a quarter against the fixed timer, with p below zero point zero zero one, and it shortens the ambulance trip. Delay counts every vehicle, including those still waiting to enter, so a controller cannot look good by leaving cars outside.")
async def b_b2(page):
    await focus(page, '#benchSummary', 160, 1.0); await glide(page, '#benchSummary', dx=-150); await sleep(4); await focus(page, '#benchTable', 120, 1.0)


@beat('bench', "But look at the last column. Nash against selfish: the difference is small and not statistically significant. We will come back to that, because it is the most important honest finding.")
async def b_b3(page): await glide(page, '#benchTable', dx=420, dy=-60); await sleep(2.5); await glide(page, '#benchTable', dx=420, dy=40)


@beat('bench', "The lambda sweep varies the spillback penalty. It stays flat for small values, and rises when lambda is large, because the junctions become over-cautious and hold traffic back to protect their neighbours.")
async def b_b4(page):
    await focus(page, '#sweepCard', 40, 1.0); await click(page, '#btnSweep')
    await page.wait_for_function("document.getElementById('btnSweep').disabled === false", timeout=240000); await sleep(2)


@beat('bench', "Every run is saved in the history, and can be downloaded as CSV or JSON, so the numbers are reproducible.")
async def b_b5(page): await focus(page, '#histCard', 120, 1.0); await glide(page, '#histTable', dx=-100)


@beat('results', "Across six traffic scenarios, the adaptive controllers cut average delay by eight to sixty-three percent against the fixed timer, and every paired test has p below zero point zero zero one. The gain is largest when one direction is much busier, and smallest under heavy load, where the whole network is near saturation. With preemption, the ambulance trip falls from about fifty seconds to about thirty-two.")
async def b_r1(page): await card(page, RESULTS, 1); await sleep(8); await reveal(page, 2)


@beat('results', "Now what we did not find. The coupled Nash game was not significantly better than the selfish adaptive controller in any scenario. So most of the gain comes from reacting to queues at all. What the game formulation gives us is an explainable decision rule, an equilibrium we can verify by enumeration, and a natural way to add emergency priority and incidents. And all of this is on synthetic demand, in a model not yet calibrated against real data.")
async def b_r2(page): await reveal(page, 3)


@beat('wp', "This is a complex engineering problem. It needs game theory, traffic modelling, statistics and web engineering together. Its requirements conflict: a junction's own benefit against the network's, ambulance priority against everyone else's wait. There is no standard solution, the stakeholders have different needs, and the parts are strongly interdependent. The report maps all of this to the complex problem attributes, W P one to W P seven, and to Sustainable Development Goal eleven.")
async def b_w1(page):
    await hide_card(page); await tab(page, 'report')
    await page.evaluate("[...document.querySelectorAll('.report h2')].find(h => /WP1/.test(h.textContent)).scrollIntoView({behavior:'smooth', block:'start'})"); await sleep(4)
    await page.mouse.move(700, 500, steps=30); await sleep(3)


@beat('end', "To summarise: signals as players in a game, a Nash equilibrium of their payoffs every second, better than a fixed timer by eight to sixty-three percent in simulation, faster for ambulances, resilient to blocked roads, and honest about what the data does and does not show. It is built with JavaScript and the browser canvas, tested with Node, and the code, report and this script are on GitHub. Thank you. We are happy to take your questions.")
async def b_end(page): await card(page, END, 1); await sleep(5); await reveal(page, 2); await sleep(1); await reveal(page, 3); await sleep(1); await reveal(page, 4); await sleep(1.5); await reveal(page, 5); await sleep(3); await reveal(page, 6)


# ------------------------------------------------------------------ speech
async def synth_edge(i, text):
    import edge_tts
    mp3 = os.path.join(WORK, 'b%02d.mp3' % i); wav = os.path.join(WORK, 'b%02d.wav' % i)
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(mp3)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-ar', '24000', '-ac', '1', '-sample_fmt', 's16', wav], check=True)
    return wav


def synth_sapi(i, text):
    txt = os.path.join(WORK, 'b%02d.txt' % i); wav0 = os.path.join(WORK, 'b%02d_s.wav' % i); wav = os.path.join(WORK, 'b%02d.wav' % i)
    open(txt, 'w', encoding='utf-8').write(text)
    ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft Hazel Desktop'); "
          "$s.SetOutputToWaveFile('%s'); $s.Speak([IO.File]::ReadAllText('%s', [Text.Encoding]::UTF8)); $s.Dispose()" % (wav0, txt))
    subprocess.run(['powershell.exe', '-NoProfile', '-Command', ps], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav0, '-ar', '24000', '-ac', '1', '-sample_fmt', 's16', wav], check=True)
    return wav


def dur_of(wav):
    with wave.open(wav) as w: return w.getnframes() / w.getframerate()


def sentences(text):
    parts = re.split(r'(?<=[.!?])\s+', text.strip()); out = []
    for p in parts:
        if len(p) > 120:
            cur = ''
            for b in re.split(r'(?<=[,:;])\s+', p):
                if len(cur) + len(b) > 110 and cur: out.append(cur.strip()); cur = ''
                cur += b + ' '
            out.append(cur.strip())
        else: out.append(p)
    return out


async def captions(page, text, dur):
    sents = sentences(text); total = sum(len(s) for s in sents)
    for s in sents:
        await page.evaluate("t => window.__cap && window.__cap(t)", s)
        await asyncio.sleep(max(0.8, dur * len(s) / total))
    await page.evaluate("window.__cap && window.__cap('')")


def srt_time(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return '%02d:%02d:%06.3f' % (h, m, s)


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def main():
    os.makedirs(WORK, exist_ok=True)
    for f in os.listdir(WORK): os.remove(os.path.join(WORK, f))
    print('Synthesising narration (%s) ...' % VOICE)
    wavs = []
    use_edge = True
    for i, (scene_name, text, _) in enumerate(BEATS):
        try:
            wav = await synth_edge(i, text) if use_edge else synth_sapi(i, text)
        except Exception as e:
            if use_edge: print('  neural voice failed (%s); using the Windows voice' % e); use_edge = False; wav = synth_sapi(i, text)
            else: raise
        wavs.append((wav, dur_of(wav)))
    print('  narration total %.1f min' % (sum(d for _, d in wavs) / 60))

    srv = serve()
    print('Recording ...')
    timeline = []
    async with async_playwright() as p:
        try: browser = await p.chromium.launch(channel='chrome', headless=True, args=['--force-device-scale-factor=1'])
        except Exception: browser = await p.chromium.launch(headless=True, args=['--force-device-scale-factor=1'])
        ctx = await browser.new_context(viewport={'width': W, 'height': H}, record_video_dir=WORK, record_video_size={'width': W, 'height': H}, locale='en-IN')
        await ctx.add_init_script(OVERLAY_JS)
        page = await ctx.new_page()
        t0 = time.time()
        await page.goto(BASE); await page.wait_for_selector('#sim'); await sleep(1.0)
        await page.evaluate("try{localStorage.removeItem('tsgt_history_v1')}catch(e){}")
        for i, ((scene_name, text, fn), (wav, dur)) in enumerate(zip(BEATS, wavs)):
            start = time.time() - t0
            timeline.append((start + START_LAG, wav, dur, text, scene_name))
            cap = asyncio.create_task(captions(page, text, dur)); act = asyncio.create_task(fn(page))
            try: await act
            except Exception as e: print('  ! beat %d (%s) action failed: %s' % (i, scene_name, str(e)[:160]))
            await cap
            wait = start + dur + 0.45 - (time.time() - t0)
            if wait > 0: await sleep(wait)
            print('  beat %2d %-8s done at %4.0fs (narration %.1fs)' % (i, scene_name, time.time() - t0, dur))
        total = time.time() - t0 + 1.0
        await ctx.close(); video_path = await page.video.path(); await browser.close()
    srv.shutdown()

    print('Mixing audio ...')
    rate = 24000
    frames = bytearray(b'\x00' * int(total * rate) * 2)
    for start, wav, dur, _, _ in timeline:
        with wave.open(wav) as w: data = w.readframes(w.getnframes())
        off = int(start * rate) * 2; frames[off:off + len(data)] = data
    mixed = os.path.join(WORK, 'narration.wav')
    with wave.open(mixed, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(bytes(frames))

    print('Writing transcript and subtitles ...')
    with open(os.path.join(HERE, 'narration_transcript.md'), 'w', encoding='utf-8') as f:
        f.write('# Narration transcript (what the video says, with timestamps)\n\nUse this to rehearse: say each paragraph while doing what the bracketed action describes on screen.\n\n')
        last = None
        for start, wav, dur, text, sc in timeline:
            if sc != last: f.write('\n## %s\n\n' % {'title': 'Opening', 'problem': 'The problem', 'idea': 'The idea: signals as players', 'method': 'How the equilibrium is found', 'sim': 'Live simulation', 'game': 'Game model and equilibrium analysis', 'dyn': 'Dynamic features: blocked road and ambulance', 'bench': 'Benchmark, sweep, history', 'results': 'Results and honesty', 'wp': 'Complex problem attributes and SDG', 'end': 'Summary'}[sc]); last = sc
            f.write('**[%d:%02d]** %s\n\n' % (int(start // 60), int(start % 60), text))
    with open(os.path.join(HERE, 'Traffic_Signal_Game_Theory_Demo.srt'), 'w', encoding='utf-8') as f:
        n = 1
        for start, wav, dur, text, sc in timeline:
            sents = sentences(text); tot = sum(len(s) for s in sents); t = start
            for s in sents:
                d = max(0.8, dur * len(s) / tot)
                f.write('%d\n%s --> %s\n%s\n\n' % (n, srt_time(t).replace('.', ','), srt_time(t + d).replace('.', ','), s)); n += 1; t += d

    print('Encoding mp4 ...')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video_path, '-i', mixed, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', OUT], check=True)
    print('Done: %s  (%.1f min)' % (OUT, total / 60))


if __name__ == '__main__':
    asyncio.run(main())
