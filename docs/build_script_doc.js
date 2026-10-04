// Builds Presentation_Script.docx  (run: NODE_PATH=<folder with docx> node docs/build_script_doc.js)
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType, PageBreak, Footer, PageNumber, TableOfContents } = require('docx');
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'results.json'), 'utf8'));

const INK = '0F1A2E', MUTED = '5B677C', ACC = '4F46E5', LINE = 'CBD3DF', SOFT = 'F4F6FA', AMBERSOFT = 'FFF0CC', BLUESOFT = 'E0EAFD', GREENSOFT = 'E3F5EA';
const FONT = 'Calibri', W = 9906;
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 22, color: INK, ...o });
const P = (t, o = {}) => new Paragraph({ spacing: { after: 120, line: 300 }, ...o, children: Array.isArray(t) ? t : [run(t)] });
const B = t => run(t, { bold: true });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: t, font: FONT, size: 34, bold: true, color: INK })] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: t, font: FONT, size: 26, bold: true, color: ACC })] });
const H3 = t => new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: t, font: FONT, size: 23, bold: true, color: INK })] });
const bullet = t => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 70, line: 290 }, children: Array.isArray(t) ? t : [run(t)] });
const num = (t, ref = 'num') => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 70, line: 290 }, children: Array.isArray(t) ? t : [run(t)] });
const br = () => new Paragraph({ children: [new PageBreak()] });
const sp = () => new Paragraph({ spacing: { after: 100 }, children: [] });
const border = { style: BorderStyle.SINGLE, size: 4, color: LINE }, borders = { top: border, bottom: border, left: border, right: border };
const cell = (children, w, o = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders, margins: { top: 90, bottom: 90, left: 120, right: 120 },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? new Paragraph({ spacing: { after: 40, line: 270 }, children: [run(c, { size: o.size || 20, bold: o.bold })] }) : c)
});
function table(widths, header, rows, o = {}) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, borders, margins: { top: 90, bottom: 90, left: 120, right: 120 }, shading: { fill: INK, type: ShadingType.CLEAR, color: 'auto' }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, size: 20, bold: true, color: 'FFFFFF' })] })] })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? SOFT : undefined, size: o.size })) }))]
  });
}
const callout = (title, lines, fill = AMBERSOFT) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, borders, shading: { fill, type: ShadingType.CLEAR, color: 'auto' }, margins: { top: 120, bottom: 120, left: 180, right: 180 },
    children: [new Paragraph({ spacing: { after: 60 }, children: [run(title, { bold: true })] }), ...lines.map(l => new Paragraph({ spacing: { after: 60, line: 290 }, children: [run(l, { size: 21 })] }))] })] })]
});
// a scene: Say / Do blocks side by side in two rows
const say = lines => callout('SAY', lines, BLUESOFT);
const doIt = lines => callout('DO', lines, GREENSOFT);

/* numbers */
const f1 = x => x.toFixed(1), f0 = x => x.toFixed(0), f2 = x => x.toFixed(2);
const SC = R.scenarios, DS = R.disruptions, S0 = SC[0], PRE = R.preemption, EQ = R.equilibrium, SW = R.sweep;
const gain = SC.map(s => -s.tests.nashVsFixed.change), nsCh = SC.map(s => s.tests.nashVsSelfish.change), nsP = SC.map(s => s.tests.nashVsSelfish.p);
const gMin = Math.min(...gain), gMax = Math.max(...gain);
const effMin = Math.min(...EQ.map(e => e.efficiency[0] * 100)), effMax = Math.max(...EQ.map(e => e.efficiency[0] * 100));
const bestMin = Math.min(...EQ.map(e => e.bestPlanShare[0] * 100)), bestMax = Math.max(...EQ.map(e => e.bestPlanShare[0] * 100));
const c = (s, k, m) => s.controllers[k].delay[0];

const body = [];
/* ---------------------------------------------------------------- title */
body.push(
  new Paragraph({ spacing: { before: 2000, after: 100 }, children: [new TextRun({ text: 'TRAFFIC SIGNALS AS PLAYERS', font: FONT, size: 64, bold: true, color: ACC })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Smart Traffic Signal Optimization using Game Theory', font: FONT, size: 40, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: 'Full presentation script, technology explanation and viva preparation', font: FONT, size: 28, color: MUTED })] }),
  table([2400, 7506], ['Item', 'Detail'], [
    ['Course', 'Data Science, Complex Engineering Problem 1 (CEP)'],
    ['Team', 'Team G2, Batch B1: Bharath Rathinasapabathy (123A8012), Gregory (123A8020), Harshwardhan Ahire (123A8004)'],
    ['Theme', 'SDG 11: Sustainable Cities and Communities (target 11.2)'],
    ['App', 'index.html (works offline), or the GitHub repository bharath050305/traffic-signal-game-theory'],
    ['Length', 'About 13 minutes of presenting, then questions'],
  ]),
  br()
);
body.push(H1('Contents'), new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }), br());

/* ---------------------------------------------------------------- 1 how to use */
body.push(
  H1('1. How to use this document'),
  P('Read Parts 2 to 4 the night before. Keep Part 5 (the live script) next to the laptop while presenting. Part 8 (numbers) is a one-page cheat sheet.'),
  table([1800, 8106], ['Part', 'Use it for'], [
    ['2. Before you start', 'Setup checklist and how to share the speaking.'],
    ['3. The idea in plain language', 'What a game, a payoff and a Nash equilibrium are, and what we built. Read before the viva.'],
    ['4. Timeline', 'The 13-minute plan at a glance.'],
    ['5. Live script', 'Word-for-word narration and exact clicks, scene by scene.'],
    ['6. Technology and methods', 'How the simulator, the controllers and the statistics work.'],
    ['7. Results and honesty', 'What the data shows and what it does not. Say these before the examiner asks.'],
    ['8. Key numbers', 'A one-page cheat sheet.'],
    ['9. WP1 to WP7, SDG, PO, WK', 'What to say if asked about the mapping.'],
    ['10. Questions and answers', 'Thirty likely questions with safe answers.'],
    ['11. Troubleshooting and commands', 'If something fails, and how to run the tests.'],
  ]),
  sp(),
  callout('Delivery tips', [
    'Speak slowly and pause after every screen change so the examiner can read it.',
    'Say "synthetic demand" whenever you quote a number. It shows you understand the limits, and examiners reward that.',
    'The most credible sentence in the whole talk is: "The coupled Nash game was not significantly better than the selfish controller; most of the gain comes from adaptivity." Say it yourself before anyone asks.',
    'Do not click quickly. If the animation is busy, press Space to pause while you explain.',
  ]),
  br()
);

/* ---------------------------------------------------------------- 2 before you start */
body.push(
  H1('2. Before you start'),
  H2('2.1 Setup checklist (do this 15 minutes before)'),
  num('Open the folder and double-click index.html (Chrome or Edge). Everything runs offline; no server is needed.', 'num_a'),
  num('Press F11 for full screen, then zoom the browser to 110% if the room is large (Ctrl and +).', 'num_a'),
  num('Switch the theme with the Light / dark button to whichever is easier to read on the projector. Light is usually better in a bright room.', 'num_a'),
  num('Click "Live simulation", leave speed at 2x. Do not change any slider before you start; the defaults are the ones in the report.', 'num_a'),
  num('Open the PDF of the report in another window as a backup, and keep the screenshots folder (docs/report_img) handy in case the browser fails.', 'num_a'),
  num('Run the Benchmark once now (10 seeds, 15 min, Disruptions: Both). It takes about 10 seconds and puts a row in the Run history, which proves the numbers are reproducible.', 'num_a'),
  num('Reload the page so the live simulation starts from time 0:00 when you begin.', 'num_a'),
  H2('2.2 Sharing the speaking'),
  table([2200, 3300, 4406], ['Presenter', 'Parts', 'Why'], [
    ['A: problem and idea', 'Scenes 1 and 2 (opening, the game idea)', 'Sets the story. Needs the clearest explanation of players, strategies and payoff.'],
    ['B: demo driver', 'Scenes 3 to 6 (simulation, game model, disruptions, benchmark)', 'Runs the mouse. Narrates what is on screen.'],
    ['C: evidence and mapping', 'Scenes 7 and 8 (results, WP and SDG, conclusion)', 'Owns the honest findings and the questions about statistics and mapping.'],
  ]),
  P('Decide among yourselves who answers which questions in Part 10; the table above is a suggestion.'),
  br()
);

/* ---------------------------------------------------------------- 3 idea */
body.push(
  H1('3. The idea in plain language'),
  H2('3.1 The problem'),
  P('Most traffic signals run on a fixed timer: 20 seconds for one road, 20 for the other, whatever the traffic. Cars wait at red lights in front of an empty cross street. Queues from one junction spill back into the next. An ambulance waits like everyone else. Smarter signals read detectors and adapt, but there is a trap: a junction that greedily clears its own queue can push cars into a neighbour whose road is already full.'),
  H2('3.2 Why a game?'),
  P('Each signal controls only its own phase, but its result depends on what the neighbours do. Several decision makers, each choosing for itself, each affected by the others: that is a non-cooperative game. Game theory gives us a precise question, "what is a stable choice for everyone?", and a precise answer, the Nash equilibrium.'),
  H2('3.3 The four words you must be able to explain'),
  table([2200, 7706], ['Word', 'Plain explanation in our project'], [
    ['Player', 'A signalised junction. Four players on the 2x2 grid, nine on the 3x3 grid.'],
    ['Strategy', 'Which road gets the green next: North-South or East-West.'],
    ['Payoff', 'A score for choosing a phase: it gains for every vehicle it can clear and for long waits it relieves, and loses for switching, for pushing cars into a jammed neighbour (spillback penalty lambda) and for breaking a green wave (coordination bonus kappa).'],
    ['Nash equilibrium', 'A set of choices where no junction can do better by changing only its own choice. We find it by best-response dynamics: each junction in turn picks its best action given the others, until nobody wants to change.'],
  ]),
  sp(),
  callout('The payoff, in one line you can say aloud', [
    '"A junction scores the vehicles it can clear plus the waiting it relieves, minus a cost for switching, minus a penalty for sending cars into a neighbour that is already full, plus a bonus for matching a neighbour that is sending it a platoon."',
  ]),
  H2('3.4 What we built'),
  bullet('A traffic simulator with cars, bikes, auto-rickshaws and buses on 2x2 and 3x3 grids, left-hand traffic.'),
  bullet('Three controllers on identical traffic: Fixed-time, Selfish adaptive (each junction ignores neighbours), Nash game (neighbours included).'),
  bullet('Version 2, the "dynamic" part: block a road live, send an ambulance that gets priority, tune the game while it runs, measure how good the equilibrium is by listing every possible joint plan, run statistical benchmarks with disruptions, sweep the spillback penalty, keep a history, export CSV and JSON, share a scenario as a link.'),
  bullet('Tests, a reproducible experiment script, this script, and a 50-page report with the WP1 to WP7 mapping.'),
  br()
);

/* ---------------------------------------------------------------- 4 timeline */
body.push(
  H1('4. Timeline (13 minutes)'),
  table([1100, 900, 3400, 4506], ['Time', 'Who', 'Scene', 'Key message'], [
    ['0:00', 'A', '1. Opening', 'Fixed timers waste time; signals are a game.'],
    ['1:30', 'A', '2. The game idea', 'Players, strategies, payoff, Nash equilibrium.'],
    ['3:30', 'B', '3. Live simulation', 'Three controllers, same traffic; Nash and selfish beat the timer.'],
    ['5:30', 'B', '4. Game model tab', 'The payoff matrix, best-response rounds, and the exact equilibrium analysis.'],
    ['7:00', 'B', '5. Dynamic features', 'Block a road; send an ambulance; preemption on and off.'],
    ['9:00', 'B/C', '6. Benchmark and sweep', 'Ten seeds, paired t-tests, disruptions, lambda sweep, history, export.'],
    ['11:00', 'C', '7. Results and honesty', 'Nash is not significantly better than selfish. Say so.'],
    ['12:00', 'C', '8. WP, SDG, conclusion', 'Why this is a CEP; limits; future work.'],
    ['13:00', 'All', 'Questions', 'Part 10.'],
  ]),
  br()
);

/* ---------------------------------------------------------------- 5 live script */
body.push(H1('5. Live script'));
const scene = (title, who, time, sayLines, doLines, expect, wrong) => {
  body.push(H2(title), P([B('Presenter: '), run(who + '     '), B('Time: '), run(time)]));
  body.push(say(sayLines), sp());
  if (doLines && doLines.length) body.push(doIt(doLines), sp());
  if (expect) body.push(P([B('You should see: '), run(expect)]));
  if (wrong) body.push(P([B('If it goes wrong: '), run(wrong)]));
};
scene('Scene 1. Opening', 'A', '0:00 to 1:30', [
  '"Good morning, ma\'am. Our project is Smart Traffic Signal Optimization using Game Theory, our Complex Engineering Problem for Data Science. It supports Sustainable Development Goal 11, sustainable cities, in particular target 11.2, safe and sustainable transport."',
  '"Think of a junction at rush hour. The signal runs on a fixed timer, twenty seconds one way and twenty the other. It cannot see that one road is empty. It cannot see that the junction ahead is already full. And it cannot see an ambulance behind the queue."',
  '"Our idea is to treat every signal as a rational player in a game. Each one chooses which road gets the green, each one is affected by what its neighbours choose, and we compute the stable outcome, the Nash equilibrium, every second."',
  '"We built a traffic simulator to test this, compared it with a fixed timer and with a selfish adaptive controller, and tested it statistically. Version 2, which you will see today, makes it dynamic: you can break the network while it runs, and watch the signals respond."',
], [], 'The Live simulation tab already running in the background, at 2x speed.', 'Nothing to click yet. Keep the screen on the map so the audience sees traffic moving while you talk.');
scene('Scene 2. The game idea', 'A', '1:30 to 3:30', [
  '"A game has players, strategies and payoffs. Our players are the junctions: four on this 2 by 2 grid, nine on a 3 by 3 grid. A strategy is the choice of phase: North-South green or East-West green."',
  '"The payoff is a score. A junction gains for every vehicle it can clear and for waiting it relieves. It loses a little for switching, because switching wastes time. It loses for sending cars into a neighbour whose road is already full, which we call the spillback penalty, lambda. And it gains a bonus when a neighbour is releasing a platoon towards it, the coordination bonus, kappa."',
  '"A Nash equilibrium is a set of choices where no junction can do better by changing only its own choice. We find it by best-response dynamics: each junction in turn picks its best action given the others, and we repeat until nothing changes. Safety rules are never relaxed: yellow 2.5 seconds, all-red 1 second, minimum green 8 seconds, maximum 45."',
], ['Click the "Game model" tab and show the formula card on the left for ten seconds.', 'Return to "Live simulation".'],
  'The signal game card with the payoff formula and sliders for omega, sigma, lambda and kappa.', 'If the formula does not render clearly, say it in words from the SAY box; it is the same.');
scene('Scene 3. Live simulation', 'B', '3:30 to 5:30', [
  '"This is the simulator. Cars, two-wheelers, auto-rickshaws and buses, left-hand traffic. The coloured strips show queue heat, and the blue band is a green corridor where two junctions are serving the same road."',
  '"The important point is the chart on the left. The three controllers, fixed-time, selfish and Nash, run side by side in the background on exactly the same vehicle arrivals, so the comparison is fair. The map shows whichever one I select."',
  '"Look at the numbers. Average delay for the Nash controller is on this tile, in seconds, and the tile shows how much better than fixed-time it is. The timeline below shows each junction\'s phases: the fixed-time controller is a regular pattern; the Nash controller stretches and shortens greens to follow the queues."',
], [
  'Press 8x to let time run to about 2 minutes, then press 2x.',
  'Click "Fixed-time" on the right of the map toolbar, then "Nash game" again. Point at the timeline changing from regular stripes to an irregular pattern.',
  'Click junction J2 on the map. Point at the inspector: queues, payoff of each action, the reason for the decision.',
], 'The average delay tile in green with a negative percentage against fixed-time; the timeline for Nash looks irregular, for fixed-time regular.',
  'If delay vs fixed-time is still near zero, the run is too young. Press 8x for a few seconds. Do not restart.');
scene('Scene 4. Game model tab', 'B', '5:30 to 7:00', [
  '"This tab shows the game itself, live. Here is the payoff matrix for junctions J1 and J2. In each cell, the first number is J1\'s payoff and the second is J2\'s. The underlined number is the best response to what the other does. Where both are underlined, the shaded cell, is a pure Nash equilibrium."',
  '"Below it, the rounds of best-response dynamics: junctions take turns, and by round two nobody wants to change."',
  '"New in version 2 is the equilibrium analysis. Every second the simulator lists all the joint plans, sixteen for four junctions, and checks which are Nash equilibria and which plan has the highest total payoff. The equilibrium found by best-response is usually the only one, and over ten seeds it captured about 97 to 98 percent of the best possible outcome. It was the very best plan in 57 to 84 percent of decisions. The gap is the price of anarchy of this game in practice."',
], [
  'Click "Game model".',
  'Point at the payoff matrix and the shaded cell.',
  'Click the J2 chip and a different neighbour in the drop-down to show the matrix change.',
  'Scroll to "Equilibrium analysis" and point at the "chosen by best-response" row and its rank.',
], 'A table of 8 plans; one row highlighted "Nash equilibrium, chosen by best-response". Usually the text "The equilibrium found is also the best plan." appears in green.', 'If the matrix shows "No pure equilibrium in this pair right now", say: "This is the case we guard against with the eight-round cap; in our experiments the dynamics always converged." and click another junction pair.');
scene('Scene 5. Dynamic features', 'B', '7:00 to 9:00', [
  '"Now the dynamic part. We can disrupt the network while it runs. I select junction J2 and block its approach from the west for 120 seconds. The same event hits all three controllers."',
  '"The striped barrier is the blockage. Watch the inspector: the adaptive controllers know the approach is blocked through their detectors, so they stop giving it green. Fixed-time cannot see it and keeps giving green to a stop line nobody can cross. The event log records it."',
  '"Next, an ambulance. I send one from the west on row 1. It has flashing lights and a red halo. The controller adds a large priority term to the payoff of the ambulance\'s road and shortens the minimum green to three seconds, but yellow and all-red are never skipped. The event log shows which junctions pre-empted."',
  '"A single ambulance is a noisy test, so I will send a few and the panel shows the mean for each controller. And I can switch preemption off to see the difference."',
], [
  'Back on "Live simulation", click the J2 chip. In "Disrupt the network" choose "from the west", 120 s, click "Block approach (B)".',
  'Point at the barrier on the map and the line in the Event log.',
  'Choose "Row 1, from the west", click "Send ambulance (A)" three or four times at intervals of about 20 seconds, choosing different roads in the drop-down. (Keyboard: A.)',
  'Read the ambulance panel: fixed-time versus selfish and Nash, with means.',
  'Untick "Emergency preemption", send one more ambulance, and compare its trip with the earlier ones.',
], 'Fixed-time ambulance trips are usually longer than Nash with preemption (the 10-seed averages are ' + f1(PRE.fixed[0]) + ' s and ' + f1(PRE.on[0]) + ' s). A single trip can be close, which is why we show means.',
  'If one ambulance happens to be equal across controllers, say: "One run is noisy, which is exactly why the next scene averages over ten seeds." Do not hide it.');
scene('Scene 6. Benchmark and sweep', 'B then C', '9:00 to 11:00', [
  '"To make this rigorous, the Benchmark tab runs all three controllers on the same traffic for ten seeds of fifteen simulated minutes. For each seed all controllers see identical arrivals, which is called common random numbers, and we compare them with a paired t-test."',
  '"I will inject both disruptions: blocked approaches and ambulance runs, the same events for every controller. The table gives mean and standard deviation, the percentage difference, and the p-value. Delay counts every vehicle, including those still waiting to enter, so a controller cannot look good by leaving cars outside."',
  '"The lambda sweep varies the spillback penalty. You can see the curve is flat for small lambda and rises for large lambda, because junctions become over-cautious. And every run is saved in the history and can be downloaded as CSV or JSON, so the numbers are reproducible."',
], [
  'Click "Benchmark". Seeds: 10. Time: 15 min. Disruptions: Both. Click "Run benchmark" (about 10 seconds).',
  'Read the "What the data says" box aloud. Point at the p-values and the ambulance row.',
  'Scroll to "Parameter sweep", click "Run lambda sweep" and wait a few seconds. Point at the curve and the summary.',
  'Scroll to "Run history" and then click "Download CSV (every seed)" to show that the evidence is exportable.',
], 'The Nash controller lowered average delay by roughly a quarter against fixed-time with p below 0.001, and a statement about the ambulance trip.',
  'If the benchmark seems stuck, wait; 3x3 is slower. If it fails, show the screenshot figures in the report (Figures 19 to 23).');
scene('Scene 7. Results and honesty', 'C', '11:00 to 12:00', [
  '"Across six scenarios, balanced, East-West heavy, heavy load, rush-hour wave, and the 3 by 3 grid, the Nash controller reduced average delay by ' + f0(gMin) + ' to ' + f0(gMax) + ' percent against the fixed timer, and every paired t-test has p below 0.001."',
  '"We want to be clear about what we did not find. The coupled Nash game was not significantly better than the selfish adaptive controller in any scenario; the difference ranged from ' + f1(Math.min(...nsCh)) + ' to +' + f1(Math.max(...nsCh)) + ' percent, with p-values from ' + f2(Math.min(...nsP)) + ' to ' + f2(Math.max(...nsP)) + '. So most of the gain comes from reacting to queues at all. What the game formulation gives us is an explainable decision rule, an equilibrium we can verify by enumeration, and preemption and incidents that fit naturally into the payoff."',
  '"Ambulance trips fell from ' + f1(PRE.fixed[0]) + ' seconds under fixed-time, and ' + f1(PRE.off[0]) + ' without preemption, to ' + f1(PRE.on[0]) + ' seconds with preemption. All of this is on synthetic demand and a model that is not calibrated, so these are results about controllers inside our simulator, not predictions for a real city."',
], ['Optionally open the report PDF at Table 16 (the six-scenario table) and Figure 25.'], null, null);
scene('Scene 8. WP, SDG and conclusion', 'C', '12:00 to 13:00', [
  '"This is a Complex Engineering Problem. It needs game theory, traffic modelling, statistics and web engineering together (WP1). Requirements conflict: a junction\'s own benefit against the network\'s, ambulance priority against everyone else\'s wait, adaptivity against safety timings (WP2). There is no standard solution, so the payoff and the evaluation had to be designed (WP3), the issues go beyond textbook exercises (WP4), signal clearance practice applies but the simulator itself is not covered by a code (WP5), the stakeholders have different needs (WP6) and the parts are strongly interdependent (WP7)."',
  '"In summary: signals as players in a game; a decision every second; better than a fixed timer by ' + f0(gMin) + ' to ' + f0(gMax) + ' percent in simulation; safer and faster for ambulances; and honest about what the data does and does not show. Future work is calibration with real counts, validation against SUMO, learning the payoff weights, and larger networks. Thank you. We are happy to take questions."',
], ['Click the "Project report" tab and scroll to section 7, the WP1 to WP7 table.'], 'The WP table in the in-app report.', null);
body.push(br());

/* ---------------------------------------------------------------- 6 technology */
body.push(
  H1('6. Technology and methods'),
  H2('6.1 Tools'),
  table([2200, 2800, 4906], ['Tool', 'What it is', 'Where it appears'], [
    ['JavaScript', 'The language of the browser', 'src/engine.js (simulator and controllers), src/ui.js (interface). One code base, one HTML file, no installation.'],
    ['HTML5 Canvas', 'Drawing surface', 'The animated map, charts, timeline.'],
    ['Node.js', 'JavaScript outside the browser', 'Tests and the experiment script: node tests/features.js, node tests/experiments.js.'],
    ['Python', 'General-purpose language', 'build.py bundles the sources; scripts for screenshots and figures.'],
    ['Playwright, Matplotlib', 'Browser automation, plotting', 'Reproducible screenshots and charts for the report.'],
    ['Git and GitHub', 'Version control', 'github.com/bharath050305/traffic-signal-game-theory'],
  ]),
  H2('6.2 How the simulator works'),
  bullet('Time advances in 0.1-second steps. Vehicles enter at the border by a Poisson process (random but with a known average rate), possibly with a direction bias or a rush-hour wave.'),
  bullet('Each vehicle accelerates towards its desired speed but never faster than the speed from which it can still stop in the free distance ahead. That is a safe-distance rule and it prevents collisions.'),
  bullet('Vehicles stop at red, never block the junction box, and about a quarter turn at each junction.'),
  bullet('Randomness is seeded. Same seed, same traffic. All three controllers see identical traffic for a given seed.'),
  H2('6.3 How the controllers decide'),
  bullet('Detectors give, per approach: q (queued vehicles near the stop line), m (vehicles approaching), w (accumulated waiting), e (emergency vehicles), and whether the approach is blocked.'),
  bullet('Once per second, best-response dynamics: start from current phases (a junction in yellow or all-red is committed and cannot change), each free junction picks the phase with the higher payoff given the others, repeat until a full sweep changes nothing.'),
  bullet('Safety layer: minimum green 8 s, maximum 45 s, yellow 2.5 s, all-red 1 s. Preemption relaxes only the minimum green (to 3 s).'),
  bullet('Selfish controller = same game with lambda = kappa = 0. Fixed-time = 20 s each, no sensing.'),
  H2('6.4 How we evaluate'),
  bullet('Common random numbers: identical arrivals for all controllers per seed, so differences come from the controller.'),
  bullet('Ten seeds; mean and standard deviation; paired two-sided t-test; p below 0.05 is significant.'),
  bullet('Delay counts everyone: finished trips, vehicles on the map and vehicles waiting to enter.'),
  bullet('95th percentile delay shows the worst-off vehicles, so improvement is not bought at their expense.'),
  H2('6.5 Equilibrium analysis in one paragraph'),
  P('For F free junctions there are 2 to the power F joint plans. We list them all, compute the total payoff of each, and check the Nash condition for every free junction. Efficiency = (total payoff of the plan we chose minus the worst plan) divided by (the best minus the worst). 100 percent means the equilibrium we found is also the best plan. We do not use a ratio because payoffs can be negative.'),
  H2('6.6 Terms you may be asked about'),
  table([2800, 7106], ['Term', 'One-sentence answer'], [
    ['Best response', 'The action with the highest payoff given what the others are doing.'],
    ['Best-response dynamics', 'Players take turns switching to their best response; if it stops, the result is a Nash equilibrium.'],
    ['Potential game', 'A game where one function rises whenever any player improves, so best-response dynamics must converge. Congestion games are the standard example.'],
    ['Price of anarchy', 'How much worse a selfish equilibrium can be than the best joint outcome. We measure it as equilibrium efficiency.'],
    ['Common random numbers', 'Giving every alternative the same random inputs so differences are due to the alternative.'],
    ['Paired t-test', 'Tests whether the mean of per-seed differences between two controllers is zero.'],
    ['p-value', 'If there were really no difference, the chance of seeing a difference this large by luck. Small means unlikely to be luck.'],
    ['Preemption', 'Giving an emergency vehicle priority at signals, while keeping clearance intervals.'],
  ]),
  br()
);

/* ---------------------------------------------------------------- 7 results */
const sRows = SC.map(s => [s.name, f1(c(s, 'fixed')), f1(c(s, 'selfish')), f1(c(s, 'nash')), (s.tests.nashVsFixed.change).toFixed(1) + '%', (s.tests.nashVsSelfish.change > 0 ? '+' : '') + s.tests.nashVsSelfish.change.toFixed(1) + '% (p ' + s.tests.nashVsSelfish.p.toFixed(2) + ')']);
body.push(
  H1('7. Results and honesty'),
  table([2900, 1000, 1100, 1000, 1500, 2406], ['Scenario (10 seeds, 15 min)', 'Fixed', 'Selfish', 'Nash', 'Nash vs fixed', 'Nash vs selfish'], sRows, { size: 19 }),
  sp(),
  H2('7.1 What you can claim'),
  bullet('Adaptive control beats a fixed timer in every scenario we tested, by ' + f0(gMin) + '% to ' + f0(gMax) + '% in average delay, all p below 0.001.'),
  bullet('Preemption roughly cuts the ambulance trip: ' + f1(PRE.off[0]) + ' s without, ' + f1(PRE.on[0]) + ' s with (paired p below 0.001); fixed-time ' + f1(PRE.fixed[0]) + ' s.'),
  bullet('Best-response dynamics converged in 100% of decisions; there was almost always exactly one pure equilibrium; the equilibrium captured ' + f0(effMin) + '% to ' + f0(effMax) + '% of the best possible joint payoff, and was the best plan in ' + f0(bestMin) + '% to ' + f0(bestMax) + '% of decisions.'),
  bullet('Blocked approaches raised delay for everyone; the adaptive controllers absorbed about 30% less of the extra delay than fixed-time.'),
  bullet('Large lambda (3.0) makes junctions over-cautious: on the 2x2 grid delay rises from ' + f1(SW[0].points[0].mean) + ' s to ' + f1(SW[0].points[7].mean) + ' s.'),
  H2('7.2 What you must not claim'),
  bullet('That the Nash game beats the selfish controller. The data says it does not, at these loads and grid sizes.'),
  bullet('That these delays apply to a real city. Demand is synthetic and the model is not calibrated or validated against SUMO.'),
  bullet('That the CO2 figure is a measurement. It is an illustration: idling vehicle-hours times 0.8 L/h times 2.31 kg per litre.'),
  bullet('That the game "proves" optimality. The equilibrium is stable, not necessarily optimal; we measured the gap.'),
  br()
);

/* ---------------------------------------------------------------- 8 numbers */
body.push(
  H1('8. Key numbers (cheat sheet)'),
  table([5400, 4506], ['Fact', 'Value'], [
    ['Grids / players', '2x2 = 4 players, 3x3 = 9 players'],
    ['Strategies per player', '2 (North-South or East-West)'],
    ['Decision interval', '1 simulated second'],
    ['Safety timings', 'Yellow 2.5 s, all-red 1 s, min green 8 s, max green 45 s, preemption min green 3 s'],
    ['Payoff weights', 'omega 1.0, sigma 2.0, lambda 0.6, kappa 0.5, emergency 60'],
    ['Experiment size', '10 seeds x 15 simulated minutes; about 500 runs in total'],
    ['Delay reduction vs fixed-time', f1(gMin) + '% to ' + f1(gMax) + '% (all p < 0.001)'],
    ['2x2 balanced delay', 'Fixed ' + f1(c(S0, 'fixed')) + ' s, selfish ' + f1(c(S0, 'selfish')) + ' s, Nash ' + f1(c(S0, 'nash')) + ' s'],
    ['Nash vs selfish', 'Not significant in any scenario (p ' + f2(Math.min(...nsP)) + ' to ' + f2(Math.max(...nsP)) + ')'],
    ['Ambulance trip', 'Fixed ' + f1(PRE.fixed[0]) + ' s; Nash without preemption ' + f1(PRE.off[0]) + ' s; Nash with preemption ' + f1(PRE.on[0]) + ' s'],
    ['Best-response convergence', '100% of decisions'],
    ['Equilibrium efficiency', f1(effMin) + '% to ' + f1(effMax) + '%; best plan in ' + f0(bestMin) + '% to ' + f0(bestMax) + '% of decisions'],
    ['Pure equilibria per decision', '1.03 to 1.20 on average'],
    ['Tests', 'Invariants: 0 overlaps, 0 red-light entries; 17 feature checks pass'],
    ['Repository', 'github.com/bharath050305/traffic-signal-game-theory'],
  ]),
  br()
);

/* ---------------------------------------------------------------- 9 mapping */
body.push(
  H1('9. WP1 to WP7, SDG, PO and WK'),
  P('WP means the complex problem-solving attributes of the Washington Accord graduate attributes (WP1 to WP7). A Complex Engineering Problem must satisfy WP1 and some of the others.'),
  table([700, 2300, 6906], ['WP', 'Attribute', 'One-line answer'], [
    ['WP1', 'Depth of knowledge', 'Game theory, traffic flow, simulation, statistics and web engineering all needed together.'],
    ['WP2', 'Conflicting requirements', 'Junction versus network benefit (lambda); delay versus stability (sigma); adaptivity versus safety; ambulance versus everyone else.'],
    ['WP3', 'Depth of analysis', 'No standard solution: we designed the payoff, the equilibrium computation and the evaluation.'],
    ['WP4', 'Familiarity of issues', 'Spillback and equilibrium selection in a coupled signal game, and preemption inside it, are not textbook exercises.'],
    ['WP5', 'Applicable codes', 'Signal clearance and green limits follow practice (Webster, IRC); the simulator is outside any code, and we say so.'],
    ['WP6', 'Stakeholders', 'Commuters, bus and two-wheeler riders, emergency services, police, planners.'],
    ['WP7', 'Interdependence', 'Demand, vehicles, detectors, four interacting signals, safety rules, disruptions and metrics feed each other.'],
  ]),
  sp(),
  H2('SDG and outcomes'),
  bullet('SDG 11.2 (primary), 11.6 (air quality, via less idling), supporting SDG 3.6, 9.1, 13.'),
  bullet('PO high: PO1 to PO6, PO10. PO medium: PO7 to PO9, PO11, PO12.'),
  bullet('WK: WK2 to WK9.'),
  bullet('The CO numbers in the report follow the order of Data Science topics; check them against the official CO list before submission.'),
  br()
);

/* ---------------------------------------------------------------- 10 Q&A */
const qa = [
  ['Why is this a game and not just an optimisation?', 'Each junction controls only its own phase, yet its payoff depends on the neighbours\' phases through spillback and platoons. Decentralised decision makers with interdependent payoffs is the definition of a non-cooperative game.'],
  ['What is a Nash equilibrium here?', 'A set of phase choices where no junction can improve its own payoff by changing only its own phase.'],
  ['Does an equilibrium always exist and is it unique?', 'Not in general for pure strategies. We use best-response dynamics with an eight-round cap and report convergence: 100% of decisions converged in our experiments. There was almost always exactly one equilibrium (1.03 to 1.20 per decision on average).'],
  ['Why does it converge?', 'The payoff is made of congestion-style terms, which behave like a potential game, so best-response dynamics tend to settle. That is an observation for this design, not a proof; the simulator reports the convergence rate to check it.'],
  ['Is the equilibrium the best outcome?', 'No guarantee. We measured it by listing every joint plan: the equilibrium found was the best plan in ' + f0(bestMin) + '% to ' + f0(bestMax) + '% of decisions and reached ' + f0(effMin) + '% to ' + f0(effMax) + '% of the best possible total payoff on average.'],
  ['What is the price of anarchy?', 'How much worse a selfish equilibrium can be than the best joint outcome. Our payoffs can be negative, so a ratio is not meaningful; we use equilibrium efficiency, (chosen minus worst) divided by (best minus worst).'],
  ['Is the Nash controller better than the selfish one?', 'In our data, no: the difference was between ' + f1(Math.min(...nsCh)) + '% and +' + f1(Math.max(...nsCh)) + '%, never significant. The benefit over fixed-time comes from adaptivity. The game formulation gives us an explainable rule, checkable equilibria, and a natural place to add preemption and incidents.'],
  ['Then why use game theory at all?', 'Because it makes the interaction explicit and the decision explainable, it supports analysis (equilibrium counts and efficiency), and it let us add emergency priority and blockages as terms in the same payoff. Coordination terms may matter on larger or more saturated networks, which we list as future work.'],
  ['How do you know the improvement is real and not luck?', 'Common random numbers (identical traffic for every controller per seed), ten seeds, and a paired t-test. The Benchmark tab prints the p-values.'],
  ['What is a paired t-test and why paired?', 'It tests whether the mean of the per-seed differences is zero. Pairing is valid because each seed gives all controllers the same traffic, which removes most of the traffic randomness.'],
  ['Why 10 seeds and 15 minutes?', 'Ten seeds gives a stable mean with a small p-value for large effects while keeping the run short enough to repeat live. Fifteen minutes covers the rush-hour wave period. More seeds would be needed to detect very small effects, such as Nash versus selfish.'],
  ['How did you keep the comparison fair?', 'Delay includes vehicles still on the map and those waiting to enter, so a controller cannot look good by leaving cars outside; safety timings are identical for all; the same disruptions are injected into all controllers.'],
  ['Is it safe? Could two directions get green together?', 'No. One phase per junction, yellow and all-red between phases for every controller, minimum and maximum green. Invariant tests count zero overlaps and zero red-light entries.'],
  ['How does the ambulance get priority without breaking safety?', 'Preemption adds a large payoff term for the ambulance\'s road and shortens the minimum green from 8 s to 3 s, but only for a junction whose current phase does not serve the ambulance. Yellow and all-red are never skipped.'],
  ['The ambulance trip was the same for all controllers in your demo. Why?', 'A single run is noisy: it may arrive when the fixed signal is green. That is why the panel shows a mean over runs and the benchmark averages ten seeds: ' + f1(PRE.fixed[0]) + ' s fixed against ' + f1(PRE.on[0]) + ' s with preemption.'],
  ['How does the controller handle a blocked road?', 'The detector flags the approach as blocked; its gain in the payoff is zero, so the junction stops giving it green. The queue on that link is still visible to the upstream neighbour through the spillback term, so it holds traffic back. Fixed-time cannot see the flag.'],
  ['What does lambda do and what happens if it is too large?', 'Lambda is the penalty for sending vehicles into a neighbour with a full queue. For small values nothing much changes; for large values (3.0) junctions become over-cautious and delay rises, ' + f1(SW[0].points[0].mean) + ' s to ' + f1(SW[0].points[7].mean) + ' s on the 2x2 grid.'],
  ['Why do adaptive controllers switch more often? Is that a problem?', 'About 265 switches per junction per hour against 148 for the fixed timer. Frequent switching costs lost time (which is why the switching cost sigma exists) and may confuse drivers; we report it as a cost.'],
  ['Is the simulator realistic? Is it validated?', 'It is a microscopic model with safe-distance following, mixed vehicle types and left-hand traffic, but demand is synthetic and it is not calibrated or validated against SUMO or real counts. We say so in the report and the app.'],
  ['What would you do with real data?', 'Calibrate arrival rates and turning shares from counts on a Navi Mumbai corridor, validate against SUMO, then re-run the same experiment script.'],
  ['How is idling and CO2 computed?', 'Idling is the sum of vehicle stopped time. The CO2 estimate multiplies idling hours by an assumed 0.8 L/h and 2.31 kg per litre of petrol. It is illustrative, not a measurement.'],
  ['What are the limitations?', 'Synthetic demand, small grids, one lane per direction, two phases, no pedestrians or left-turn phases, no calibration, ten seeds.'],
  ['What is the difference between version 1 and version 2?', 'Version 1 was a fixed demonstration. Version 2 added live disruptions, ambulance preemption, exact equilibrium analysis, a signal timeline, disruption benchmarks, the lambda sweep, history and export, share links and shortcuts.'],
  ['Can you reproduce your numbers?', 'Yes: node tests/experiments.js reruns everything and writes docs/results.json; the report tables are generated from that file. Seeds are fixed.'],
  ['Why is it a Complex Engineering Problem? Explain WP1 to WP7.', 'See Part 9: WP1 knowledge depth, WP2 conflicting requirements, WP3 depth of analysis, WP4 familiarity, WP5 codes (partly), WP6 stakeholders, WP7 interdependence.'],
  ['Which SDG and target?', 'SDG 11, target 11.2 (safe and sustainable transport), with 11.6 (air quality), and supporting SDG 3.6, 9.1 and 13.'],
  ['How does this compare with max-pressure control?', 'Max-pressure (Varaiya) picks the phase with the largest queue difference between upstream and downstream and has stability guarantees. Our selfish and Nash controllers are the same family of queue-driven decentralised rules; we did not implement max-pressure, and that comparison is future work.'],
  ['Could reinforcement learning do better?', 'Possibly. It could learn the payoff weights from data, but needs training time and care about safety. We list it as future work.'],
  ['What did each of you do?', 'Agree beforehand. Suggested honest answer: shared design and testing; one person led the simulator, one the game model and controllers, one the evaluation and report; all three reviewed everything.'],
  ['What would you do next?', 'Calibrate with real data, validate against SUMO, test larger grids with more seeds, learn payoff weights, compare with max-pressure.'],
  ['Why a web application and not Python?', 'A single HTML file runs anywhere with no installation, is easy to demonstrate live, and can be hosted on GitHub Pages. The experiments run in Node.js with the same engine, so the browser and the report use identical code.'],
];
body.push(H1('10. Questions and answers'));
qa.forEach(([q, a], i) => { body.push(new Paragraph({ spacing: { before: 140, after: 40 }, keepNext: true, children: [run((i + 1) + '. ' + q, { bold: true })] }), P(a)); });
body.push(br());

/* ---------------------------------------------------------------- 11 trouble */
body.push(
  H1('11. Troubleshooting and commands'),
  table([3300, 6606], ['Problem', 'What to do'], [
    ['The page is blank or the map is frozen', 'Reload (F5). Check that the Space bar did not pause it (the play button shows a triangle). Press Space again.'],
    ['Text or charts look small on the projector', 'Ctrl and + to zoom; the layout is responsive.'],
    ['Browser asks about fonts or is offline', 'Nothing breaks: the page falls back to system fonts. Everything else works offline.'],
    ['Benchmark takes long', 'Choose 5 seeds and 10 minutes, or the 2x2 grid. 3x3 is slower.'],
    ['A result differs slightly from the report', 'Different seeds or settings. The report uses the default scenario, 10 seeds, 15 min. The Run history lists what you ran.'],
    ['Nothing works', 'Open the report PDF and walk through Chapter 7 figures; they show every screen.'],
  ]),
  sp(),
  H2('Commands (in a terminal in the project folder)'),
  table([4600, 5306], ['Command', 'What it does'], [
    ['python build.py', 'Rebuild index.html from src/ after any edit.'],
    ['node tests/features.js', 'Checks incidents, preemption and equilibrium analysis (17 checks).'],
    ['node tests/inv.js ; node tests/inv2.js', 'Overlap and red-light invariants.'],
    ['node tests/experiments.js', 'Reproduce every number in the report (about 3 minutes).'],
  ]),
);

const doc = new Document({
  creator: 'Team G2', title: 'Presentation script: Smart Traffic Signal Optimization using Game Theory',
  features: { updateFields: true },
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    { reference: 'num_a', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Presentation script · Team G2 · page ', font: FONT, size: 18, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED })] })] }) },
    children: body
  }]
});
Packer.toBuffer(doc).then(buf => { const out = path.join(__dirname, 'Presentation_Script.docx'); fs.writeFileSync(out, buf); console.log('wrote', out, (buf.length / 1e3).toFixed(0) + ' KB'); });
