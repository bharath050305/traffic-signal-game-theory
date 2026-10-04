"""Captures the screenshots used in the project report from the running app.
Usage:  python -m http.server 8765   (in the project folder, in another terminal)
        python docs/capture_screenshots.py
Needs: pip install playwright pillow   and Google Chrome installed (or run `playwright install chromium`).
The simulator is stepped in code, so every screenshot shows the same, reproducible state."""
import asyncio, json, os
from playwright.async_api import async_playwright
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'report_img')
URL = os.environ.get('APP_URL', 'http://localhost:8765/')
os.makedirs(OUT, exist_ok=True)
DIMS = {}


def save(png, name):
    im = Image.open(png).convert('RGB')
    jpg = os.path.join(OUT, name + '.jpg')
    im.save(jpg, quality=90)
    DIMS[name + '.jpg'] = im.size
    os.remove(png)


async def main():
    async with async_playwright() as p:
        try:
            b = await p.chromium.launch(channel='chrome', headless=True)
        except Exception:
            b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1.5)
        await pg.goto(URL)
        await pg.wait_for_timeout(1200)

        async def adv(sec):
            await pg.evaluate("sec => { S.playing = false; for (let i = 0; i < Math.round(sec / CFG.dt); i++) for (const c of CTRLS) S.sims[c].step(); refreshPanels(); drawMap(); }", sec)
            await pg.wait_for_timeout(450)

        async def shot(locator, name, pad=0):
            tmp = os.path.join(OUT, name + '.png')
            await locator.screenshot(path=tmp)
            save(tmp, name)

        card = lambda sel: pg.locator(sel).locator('xpath=ancestor::div[contains(@class,"card")][1]')
        await pg.evaluate("S.playing = false; setPlayIcon();")

        # 1. live simulation, normal operation (2x2, Nash on the map)
        await adv(150)
        await pg.evaluate('window.scrollTo(0, 0)')
        tmp = os.path.join(OUT, 'f01.png'); await pg.screenshot(path=tmp, clip={'x': 0, 'y': 0, 'width': 1440, 'height': 1010}); save(tmp, 'f01_live_simulation')
        await shot(pg.locator('#kpis').locator('xpath=ancestor::div[contains(@class,"card")][1]'), 'f02_kpis')
        await shot(card('#chartLive'), 'f03_three_controllers_chart')
        await shot(card('#chartTL'), 'f04_timeline_nash')
        await pg.click('#segCtrl button[data-c="fixed"]'); await adv(0.1)
        await shot(card('#chartTL'), 'f05_timeline_fixed')
        await pg.click('#segCtrl button[data-c="nash"]'); await adv(0.1)
        await shot(card('#inspBody'), 'f06_inspector')
        await shot(card('#presets'), 'f07_scenario_panel')

        # 2. incident
        await pg.click('#chips .chip[data-i="1"]'); await pg.select_option('#selBlkDir', 'W'); await pg.select_option('#selBlkDur', '180')
        await pg.click('#btnBlock'); await adv(25)
        await shot(card('#sim'), 'f08_incident_map')
        await shot(card('#evLog'), 'f09_event_log')

        # 3. ambulance (fresh run so all three controllers start together)
        await pg.click('#btnReset'); await adv(120)
        await pg.select_option('#selAmb', 'h|0|1'); await pg.click('#btnAmb'); await adv(9)
        await shot(card('#sim'), 'f10_ambulance_map')
        await adv(50)
        for road in ['v|0|1', 'h|1|-1', 'v|1|-1', 'h|1|1']:      # four more ambulances on different roads
            await pg.select_option('#selAmb', road); await pg.click('#btnAmb'); await adv(55)
        await shot(pg.locator('#disrupt'), 'f11_ambulance_result')
        await shot(card('#evLog'), 'f12_event_log_ambulance')

        # 4. 3x3 grid
        await pg.click('#segGrid button[data-n="3"]'); await adv(150)
        await shot(card('#sim'), 'f13_grid_3x3')
        await shot(card('#chartTL'), 'f14_timeline_3x3')
        await pg.click('#segGrid button[data-n="2"]'); await adv(150)

        # 5. game tab
        await pg.click('#t-game'); await adv(0.1); await pg.wait_for_timeout(500)
        await shot(card('#pmBox'), 'f15_payoff_matrix')
        await shot(card('#trace'), 'f16_best_response_rounds')
        await shot(pg.locator('.params'), 'f17_tune_game')
        await shot(pg.locator('#eqCard'), 'f18_equilibrium_analysis')
        await shot(pg.locator('#tab-game .card').first, 'f19_signal_game_model')

        # 6. benchmark: 10 seeds, 15 min (the same seeds as tests/experiments.js)
        await pg.click('#t-bench')
        await pg.select_option('#selSeeds', '10'); await pg.select_option('#selDur', '900'); await pg.select_option('#selDisrupt', 'none')
        await pg.click('#btnBench'); await pg.wait_for_function("document.getElementById('btnBench').disabled === false", timeout=400000)
        await pg.wait_for_timeout(500)
        await shot(pg.locator('#benchOut .card').nth(0), 'f20_bench_summary')
        await shot(pg.locator('#benchOut .card').nth(1), 'f21_bench_table')
        await shot(pg.locator('#benchOut .card').nth(3), 'f22_bench_bars')
        await shot(pg.locator('#benchOut .card').nth(4), 'f23_bench_stopped_over_time')
        await pg.select_option('#selDisrupt', 'both')
        await pg.click('#btnBench'); await pg.wait_for_function("document.getElementById('btnBench').disabled === false", timeout=400000)
        await pg.wait_for_timeout(500)
        await shot(pg.locator('#benchOut .card').nth(0), 'f24_bench_disruptions_summary')
        await shot(pg.locator('#benchOut .card').nth(1), 'f25_bench_disruptions_table')
        await pg.click('#btnSweep'); await pg.wait_for_function("document.getElementById('btnSweep').disabled === false", timeout=400000)
        await pg.wait_for_timeout(600)
        await shot(pg.locator('#sweepCard'), 'f26_lambda_sweep')
        await shot(pg.locator('#histCard'), 'f27_run_history')

        # 7. dark theme
        await pg.click('#t-sim'); await pg.click('#btnTheme'); await pg.click('#chips .chip[data-i="0"]'); await adv(1)
        await pg.evaluate('window.scrollTo(0, 0)'); await pg.wait_for_timeout(300)
        tmp = os.path.join(OUT, 'f28.png'); await pg.screenshot(path=tmp, clip={'x': 0, 'y': 0, 'width': 1440, 'height': 1010}); save(tmp, 'f28_dark_theme')
        await b.close()
    dp = os.path.join(OUT, 'dims.json')
    merged = json.load(open(dp)) if os.path.exists(dp) else {}
    merged.update(DIMS)                      # keep entries written by make_figures.py
    with open(dp, 'w') as f:
        json.dump(merged, f, indent=1)
    print('saved', len(DIMS), 'images')


asyncio.run(main())
