// Builds Traffic_Signal_Game_Theory_Report.docx
// Run:  NODE_PATH=<folder containing node_modules with docx> node docs/build_report.js
// Needs docs/results.json (node tests/experiments.js), docs/report_img/*.jpg (capture_screenshots.py, make_figures.py)
const fs = require('fs');
const path = require('path');
const L = require('./report_lib');
const { t, bold, para, center, chapter, unnumbered, sec, sub, bullets, numbered, eq, blank, figure, table, logo } = L;
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, LevelFormat, Footer, PageNumber, TableOfContents, SectionType } = L.D;

const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'results.json'), 'utf8'));
const REPO = 'https://github.com/bharath050305/traffic-signal-game-theory';
const TEAM = [['Bharath Rathinasapabathy', '123A8012'], ['Gregory', '123A8020'], ['Harshwardhan Ahire', '123A8004']];
const TITLE = 'Smart Traffic Signal Optimization using Game Theory';
const GUIDE = process.env.GUIDE || '[Name of guide]';           // <- put your guide's name here (or set the GUIDE environment variable)
const YEAR = process.env.YEAR || '2025-26';

/* ---------------------------------------------------------------- numbers from the experiments */
const f1 = x => x.toFixed(1), f0 = x => x.toFixed(0), f2 = x => x.toFixed(2);
const pf = p => p < 0.001 ? '< 0.001' : p.toFixed(3);
const sgn = x => (x > 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%';
const SC = R.scenarios, DS = R.disruptions, S0 = SC[0];
const ctl = (s, c, k) => s.controllers[c][k];
const rangeNashFixed = [Math.min(...SC.map(s => -s.tests.nashVsFixed.change)), Math.max(...SC.map(s => -s.tests.nashVsFixed.change))];
const maxPFixed = Math.max(...SC.map(s => s.tests.nashVsFixed.p));
const nsCh = SC.map(s => s.tests.nashVsSelfish.change), nsP = SC.map(s => s.tests.nashVsSelfish.p);
const EQ = R.equilibrium, PRE = R.preemption;
const idleKg = h => h * 0.8 * 2.31;

/* ---------------------------------------------------------------- front matter */
const cover = [
  logo(300), L.blank(),
  center('A', { run: { size: 28 } }), center('Report on', { run: { size: 28 } }),
  center(TITLE, { run: { size: 34, bold: true }, before: 120, after: 200 }),
  center('Prepared For', { run: { size: 28 }, before: 160 }),
  center('Data Science', { run: { size: 28, bold: true } }),
  center('Complex Engineering Problem 1 (CEP) · SDG 11: Sustainable Cities and Communities', { run: { size: 24 }, after: 200 }),
  center('Team G2 · Batch B1', { run: { size: 30, bold: true }, before: 240, after: 600 }),
  center('SIES GRADUATE SCHOOL OF TECHNOLOGY NERUL,', { run: { size: 26 }, before: 600 }),
  center('NAVI MUMBAI 400706', { run: { size: 26 } }),
  center('ACADEMIC YEAR ' + YEAR, { run: { size: 26 } }),
];
const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, nob = { top: noB, bottom: noB, left: noB, right: noB };
const nameTable = new Table({
  width: { size: 6200, type: WidthType.DXA }, columnWidths: [4000, 2200], alignment: AlignmentType.CENTER,
  rows: TEAM.map(([n, r]) => new TableRow({ children: [
    new TableCell({ width: { size: 4000, type: WidthType.DXA }, borders: nob, children: [new Paragraph({ spacing: { after: 100 }, children: [bold(n, { size: 26 })] })] }),
    new TableCell({ width: { size: 2200, type: WidthType.DXA }, borders: nob, children: [new Paragraph({ spacing: { after: 100 }, children: [bold(r, { size: 26 })] })] })] }))
});
const titlePage = [
  logo(260),
  center('A', { run: { size: 28 } }), center('Report on', { run: { size: 28 } }),
  center(TITLE, { run: { size: 30, bold: true }, before: 80, after: 120 }),
  center('Prepared For', { run: { size: 26 } }),
  center('Data Science · CEP', { run: { size: 26, bold: true }, after: 240 }),
  center('Submitted by: Team G2 (Batch B1)', { run: { size: 28, bold: true }, after: 200 }),
  nameTable,
  center('Department of Artificial Intelligence & Data Science', { run: { size: 24 }, before: 240 }),
  center('Under the guidance of', { run: { size: 26, bold: true }, before: 280 }),
  center(GUIDE, { run: { size: 28, bold: true }, after: 360 }),
  center('SIES GRADUATE SCHOOL OF TECHNOLOGY NERUL,', { run: { size: 26 }, before: 300 }),
  center('NAVI MUMBAI 400706', { run: { size: 26 } }),
  center('ACADEMIC YEAR ' + YEAR, { run: { size: 26 } }),
];

const ack = [
  ...unnumbered('Acknowledgement'),
  para('We, Team G2, express our sincere gratitude to our guide, **' + GUIDE + '**, for the direction, feedback and encouragement given throughout this project. Framing the work as a Complex Engineering Problem aligned with a Sustainable Development Goal pushed us to build a complete, testable system rather than a classroom demonstration.'),
  para('We thank the Department of Artificial Intelligence & Data Science and SIES Graduate School of Technology, Nerul, for the laboratory facilities and the academic environment that made this work possible. We also thank our classmates, whose questions during the interim presentation helped us sharpen the problem statement and the evaluation.'),
  para('Finally, we acknowledge the open-source communities behind JavaScript, Python, Node.js, Matplotlib and Playwright. Their tools allowed three students to build, test and document a complete multi-agent traffic simulator on ordinary laptops.'),
  para('Team G2', { alignment: AlignmentType.RIGHT }),
];

const ap = (x, o) => para(x, { spacing: { after: 130, line: 300 }, ...(o || {}) });
const abstract = [
  ...unnumbered('Abstract'),
  ap('Traffic signals in most Indian cities run on fixed timers that cannot see the queues in front of them. Vehicles idle at red lights over empty cross streets, queues spill back into neighbouring junctions, and ambulances wait like everyone else. This report presents **Smart Traffic Signal Optimization using Game Theory**, a multi-agent traffic management system in which every signalised junction is a rational player that competes for green-light allocation.'),
  ap('Each junction chooses between North–South and East–West green. Its payoff rewards clearing queued and approaching vehicles and long-waiting traffic, and penalises switching, pushing vehicles into a neighbour whose queue is already full (spillback) and breaking a platoon that a neighbour is about to release. Decisions are a pure-strategy **Nash equilibrium** of this game, found every simulated second by best-response dynamics, under yellow, all-red, minimum-green and maximum-green safety rules. The system is evaluated in a microscopic traffic simulator with cars, two-wheelers, auto-rickshaws and buses on 2×2 and 3×3 grids, against a fixed-time controller and a selfish adaptive controller, using common random numbers, ten seeds and paired t-tests.'),
  ap('Version 2 turns the demonstration into a dynamic system. Users can block an approach, send an ambulance that triggers emergency preemption, change load and game weights while the simulation runs, enumerate every joint plan to measure how good the equilibrium is, view a signal timeline, run benchmarks with disruptions, sweep the spillback penalty, keep a run history, export CSV and JSON, and share a scenario as a link. The whole application is a single browser page with no server.'),
  ap('Across six traffic scenarios the Nash controller reduced average vehicle delay by **' + f0(rangeNashFixed[0]) + '% to ' + f0(rangeNashFixed[1]) + '%** against the fixed timer (every paired t-test p < 0.001). Ambulance trips fell from ' + f1(PRE.fixed[0]) + ' s under fixed-time and ' + f1(PRE.off[0]) + ' s without preemption to **' + f1(PRE.on[0]) + ' s** with preemption. The equilibrium found by best-response dynamics reached ' + f0(Math.min(...EQ.map(e => e.efficiency[0] * 100))) + '% to ' + f0(Math.max(...EQ.map(e => e.efficiency[0] * 100))) + '% of the best possible joint payoff, and in every scenario the coupled Nash game was statistically indistinguishable from the selfish adaptive controller: most of the gain comes from reacting to queues at all. Demand is synthetic and the model is not calibrated or validated against real data, and the report states this openly. The project supports **SDG 11** (target 11.2, safe and sustainable transport), with links to SDG 3, SDG 9 and SDG 13.'),
  ap('**Keywords:** game theory, Nash equilibrium, best-response dynamics, traffic signal control, multi-agent systems, microscopic simulation, emergency vehicle preemption, paired t-test, SDG 11.'),
];

/* ---------------------------------------------------------------- chapters */
const ch1 = [
  ...chapter(1, 'Introduction'),
  sec('1.1 Background'),
  para('Traffic congestion is one of the most visible failures of urban infrastructure. In dense cities such as Mumbai, vehicles lose a large share of their trip time at signalised junctions. A fixed-time signal gives each road a preset green regardless of demand. It is cheap and predictable, but it wastes green on empty approaches, cannot respond to a stalled vehicle or a cricket-match crowd, and cannot give way to an ambulance.'),
  para('Adaptive control reads detectors and adjusts the signal. The hard part is coordination: a junction that serves its own queue greedily may push vehicles into a neighbour whose road is already full, which blocks that neighbour and eventually blocks the junction itself. Each signal controls only its own phase, yet its outcome depends on the neighbours’ phases. That is the structure of a non-cooperative game, which is why game theory is a natural language for the problem.'),
  para('This project, **Smart Traffic Signal Optimization using Game Theory**, models every signalised junction as a rational player, computes each decision as a Nash equilibrium, and tests the idea in a microscopic traffic simulator. Version 2 adds the dynamic features that make the system usable as a live decision-support tool: disruptions, emergency preemption, exact equilibrium analysis, and reproducible experiments.'),
  sec('1.2 Problem Statement'),
  para('*Complex Engineering Problem, option 1: Smart Traffic Signal Optimization using Game Theory. Design and implement a multi-agent traffic management system where each traffic signal acts as a rational player competing for green-light allocation, to minimise overall congestion and vehicle waiting time.*'),
  sec('1.3 Motivation'),
  bullets([
    '**Waiting is waste.** Every second a vehicle idles costs time and fuel, and adds emissions in already polluted streets.',
    '**Local decisions, network consequences.** A greedy signal can hurt its neighbours. A model that captures this interaction is needed, not just a queue-length rule.',
    '**Emergencies.** An ambulance should not wait through a full signal cycle behind a queue.',
    '**Disruptions are normal.** Breakdowns, road works and processions block approaches. A controller should notice and adapt.',
    '**Evidence over claims.** Any improvement should be measured against a baseline, on identical traffic, with a statistical test.',
  ]),
  sec('1.4 Objectives'),
  numbered([
    'Model each signalised junction as a rational agent with a strategy set and a payoff function.',
    'Compute each signal decision as a pure-strategy Nash equilibrium of the resulting non-cooperative game.',
    'Build a microscopic traffic simulator with mixed Indian traffic, to test the controller under safe, realistic rules.',
    'Compare the game-theoretic controller with a fixed-time controller and a selfish (non-cooperative) adaptive controller.',
    'Evaluate with data-science methods: repeated runs, common random numbers, confidence from paired t-tests, and several load scenarios.',
    'Make the system dynamic: live disruptions, emergency-vehicle preemption, tunable game weights, and exact equilibrium analysis.',
    'Provide reproducible evidence: seeded runs, exportable results, saved history, and automated tests.',
    'Document limits honestly, including what the data does and does not show.',
  ], 'num1'),
  sec('1.5 Alignment with the Sustainable Development Goals'),
  para('Sustainable Development Goal 11 aims to "make cities and human settlements inclusive, safe, resilient and sustainable" [1]. The project contributes as follows:'),
  table([1300, 3900, 3826], ['Goal / target', 'Statement (summary)', 'Contribution of this project'], [
    ['SDG 11.2', 'Provide access to safe, affordable, accessible and sustainable transport systems and improve road safety.', 'Lower delay and fewer stops on shared roads; emergency vehicles cross the network sooner; safe signal timings are never relaxed.'],
    ['SDG 11.6', 'Reduce the adverse per capita environmental impact of cities, including air quality.', 'Less idling time. The tool reports idling vehicle-hours and an illustrative CO₂ estimate.'],
    ['SDG 3.6', 'Halve road traffic deaths and injuries (supporting).', 'Faster ambulance response; safety-first design with yellow and all-red intervals.'],
    ['SDG 9.1', 'Develop quality, reliable, resilient infrastructure (supporting).', 'A controller that adapts to blocked roads instead of failing silently.'],
    ['SDG 13', 'Take urgent action on climate change (supporting).', 'Reducing idling lowers fuel burnt per trip.'],
  ], 'Sustainable Development Goals addressed by the project'),
  sec('1.6 Scope and Limitations'),
  para('**In scope:** a 2×2 or 3×3 grid of signalised junctions; four vehicle types; three controllers; live disruptions (blocked approach, ambulance); exact equilibrium enumeration; benchmark, sweep, history and export; a single-page web application; automated tests.'),
  para('**Out of scope:** pedestrians, left-turn phases, more than two phases per junction, multi-lane roads, real detector data, calibration against a real city, and validation against an established simulator such as SUMO. Demand is **synthetic**, so every delay figure describes the controllers inside our simulator and should not be read as a prediction for a real road network.'),
  sec('1.7 Organisation of the Report'),
  para('Chapter 2 reviews related work and the techniques used. Chapter 3 analyses requirements, shows why this is a Complex Engineering Problem (attributes WP1 to WP7) and gives the project plan. Chapter 4 presents the system design. Chapter 5 describes the game-theoretic method in detail. Chapter 6 describes the simulation model and the experimental design. Chapter 7 describes the implementation and the user interface. Chapter 8 reports testing and results. Chapter 9 discusses social impact, ethics and sustainability. Chapter 10 maps the work to course outcomes, programme outcomes, knowledge profiles and complex-problem attributes. Chapter 11 concludes with future scope.'),
];

const ch2 = [
  ...chapter(2, 'Literature Review and Technical Background'),
  sec('2.1 Traffic Signal Control'),
  para('Classical signal design sets cycle length and green splits from average flows. Webster [2] derived the cycle length that minimises delay at an isolated junction under uniform arrivals; fixed-time plans built this way are still common. **Actuated control** extends or truncates greens when detectors see vehicles. **Network-level adaptive systems** such as SCOOT and SCATS adjust splits and offsets from measured flows. A more recent line, **max-pressure control** [3], chooses the phase that relieves the largest difference between upstream and downstream queues and has provable stability properties under mild assumptions. Our selfish and Nash controllers belong to the same family of queue-driven, decentralised rules and are compared with a fixed-time baseline.'),
  sec('2.2 Game Theory Essentials'),
  para('A **normal-form game** has a set of players, a set of actions for each player and a payoff for each player for every combination of actions [4]. A **pure-strategy Nash equilibrium** is an action profile in which no player can raise its own payoff by changing only its own action. A **best response** is the action that maximises a player’s payoff given the others’ actions. In **best-response dynamics**, players take turns replacing their action by a best response. If the sequence stops, the profile is a Nash equilibrium. In general, pure equilibria need not exist and the dynamics can cycle. A **potential game** [5] is a game in which a single function increases whenever any player improves by a unilateral change; best-response dynamics always converge in a finite potential game. Congestion games are the classical example. Our payoff is built from congestion-style terms, so we expect good convergence, but we **measure** it instead of assuming it: the simulator reports how often the dynamics reached equilibrium (100% in every experiment) and caps each decision at eight rounds.'),
  para('The **price of anarchy** is the ratio between the best total outcome and the worst equilibrium; the **price of stability** compares the best total outcome with the best equilibrium. Because our payoffs can be negative, a ratio is not meaningful, so we report a normalised measure called equilibrium efficiency (Chapter 5.9).'),
  sec('2.3 Multi-Agent Methods in Traffic'),
  para('Bazzan [6] surveys multi-agent systems and multi-agent reinforcement learning for traffic control, and notes that independent learners at each junction can fail to coordinate. Game-theoretic formulations make the interaction explicit and give a decision rule that can be explained at the control room. Reinforcement learning can learn payoffs from data but needs training time, a simulator and care about safety; we list it as future work.'),
  sec('2.4 Emergency-Vehicle Preemption'),
  para('Many signal systems offer preemption: when an emergency vehicle is detected, the signal ends the current phase early, observing yellow and all-red clearance, and holds green on the vehicle’s approach. We reproduce the key behaviour (a priority term in the payoff and a shortened minimum green) without relaxing the clearance intervals.'),
  sec('2.5 Simulation and Statistical Evaluation'),
  para('Microscopic simulators represent each vehicle and its interaction with the vehicle ahead. We use a simple safe-distance rule: each vehicle accelerates towards its desired speed but never faster than the speed from which it can still stop in the free distance ahead with a fixed braking rate [7]. For comparing controllers we use **common random numbers** [8]: for a given seed every controller sees identical arrival times, vehicle types and turning choices, so differences come from the controller alone and variance is reduced. Results are averaged over seeds and compared with a **paired two-sided t-test** [9].'),
  sec('2.6 Research Gap and Contribution'),
  table([3000, 6026], ['Gap in common practice', 'How this project addresses it'], [
    ['Fixed timers ignore queues', 'Detector-driven controllers cut average delay by ' + f0(rangeNashFixed[0]) + '% to ' + f0(rangeNashFixed[1]) + '% in our scenarios.'],
    ['Local greed ignores neighbours', 'The payoff includes spillback and coordination terms; the effect is measured with a sweep of the penalty λ.'],
    ['Claims of "optimal" without evidence', 'Exact enumeration of all joint plans measures how close the equilibrium is to the best joint outcome.'],
    ['Emergency vehicles wait in queues', 'Preemption through the payoff and a shortened minimum green, with all clearance intervals kept.'],
    ['Disruptions handled by hand', 'Blocked approaches are detected; controllers stop giving them green.'],
    ['Results that cannot be reproduced', 'Seeded runs, common random numbers, CSV and JSON export, a one-command experiment script.'],
  ], 'Gaps addressed by this work'),
];

/* ---- WP table (Washington Accord complex problem-solving attributes) */
const wpRows = [
  ['WP1', 'Depth of knowledge required', 'Cannot be resolved without in-depth knowledge at the level of WK3, WK4, WK5, WK6 or WK8.',
    'Game theory (Nash equilibrium, best response, potential games), traffic-flow modelling, discrete-event simulation, statistics (paired t-test, common random numbers) and web engineering are all needed together.'],
  ['WP2', 'Range of conflicting requirements', 'Wide-ranging or conflicting technical, engineering and other issues.',
    'A junction’s own benefit versus network benefit (λ); delay versus stability (switching cost σ); adaptivity versus safety timings; ambulance priority versus the wait of everyone else; realism versus a model small enough to explain.'],
  ['WP3', 'Depth of analysis required', 'No obvious solution; abstract thinking and originality in analysis to formulate suitable models.',
    'The payoff function, the coupling between neighbours, the equilibrium computation, the emergency term and the evaluation design were formulated and tested by experiments (Chapters 5, 6, 8).'],
  ['WP4', 'Familiarity of issues', 'Infrequently encountered issues.',
    'Equilibrium selection in a coupled signal game, spillback in short mixed-traffic links and preemption inside a game-theoretic controller are beyond standard textbook exercises.'],
  ['WP5', 'Extent of applicable codes', 'Outside problems encompassed by standards and codes of practice.',
    'Yellow and all-red clearance and minimum and maximum green follow signal-timing practice (for example Webster [2] and IRC guidance); the simulation model itself is not covered by a code, and departures are stated in Chapter 6.'],
  ['WP6', 'Extent of stakeholder involvement', 'Diverse groups with widely varying needs.',
    'Commuters, bus riders, two-wheeler riders, emergency services, traffic police and city planners want different things from the same junction.'],
  ['WP7', 'Interdependence', 'High-level problems with many components or sub-problems.',
    'Demand, vehicle dynamics, detectors, four interacting signals, safety rules, disruptions and metrics all feed one another; a change to one payoff weight changes every other component’s behaviour.'],
];
const ch3 = [
  ...chapter(3, 'Requirements and Problem Analysis'),
  sec('3.1 Stakeholders'),
  table([2000, 3200, 3826], ['Stakeholder', 'Needs', 'What the system provides'], [
    ['Commuters, bus and two-wheeler riders', 'Shorter, smoother trips with fewer stops.', 'Lower delay, fewer stops and higher throughput than a fixed timer.'],
    ['Emergency services', 'Fast, safe passage.', 'Preemption that cuts ambulance trip time while keeping clearance intervals.'],
    ['Traffic police / control room', 'To see what the signals are doing and why; to react to incidents.', 'Live payoff matrix, equilibrium analysis, event log, blocked-approach handling.'],
    ['City planners', 'Evidence to compare control strategies.', 'Reproducible benchmark with statistics, CSV and JSON export, parameter sweep.'],
    ['Examiners and students', 'A system they can explore and test.', 'One-file web app, shareable scenario links, automated tests, written report.'],
  ], 'Stakeholders and their needs'),
  sec('3.2 Functional Requirements'),
  table([900, 5800, 2326], ['ID', 'Requirement', 'Module'], [
    ['FR1', 'Simulate a 2×2 or 3×3 grid of signalised junctions with mixed vehicles and left-hand traffic.', 'Engine'],
    ['FR2', 'Generate demand with configurable rate, direction mix and a rush-hour wave, from a seed.', 'Engine'],
    ['FR3', 'Run fixed-time, selfish and Nash controllers side by side on identical traffic.', 'Engine, UI'],
    ['FR4', 'Compute each Nash decision by best-response dynamics under safety rules, and report whether equilibrium was reached.', 'Engine'],
    ['FR5', 'Show the live payoff matrix and best-response rounds for any pair of neighbouring junctions.', 'UI'],
    ['FR6', 'Let the user tune ω, σ, λ and κ while the simulation runs.', 'UI'],
    ['FR7', 'Inject a blocked approach and an ambulance live, identically for all controllers.', 'Engine, UI'],
    ['FR8', 'Enumerate all joint plans, count Nash equilibria, and report equilibrium efficiency.', 'Engine, UI'],
    ['FR9', 'Run multi-seed benchmarks, with and without disruptions, with paired t-tests and a 95th-percentile delay.', 'UI'],
    ['FR10', 'Sweep the spillback penalty and suggest the best value.', 'UI'],
    ['FR11', 'Export results as CSV and JSON, keep a run history, share scenarios as links.', 'UI'],
    ['FR12', 'Provide light and dark themes and keyboard shortcuts for presenting.', 'UI'],
  ], 'Functional requirements'),
  sec('3.3 Non-Functional Requirements'),
  bullets([
    '**Safety:** conflicting greens must be impossible; yellow, all-red and minimum green apply to every controller. Tests check zero red-light entries and zero vehicle overlaps.',
    '**Reproducibility:** the same seed gives the same traffic; adding analysis or visual mode does not change results (tested).',
    '**Performance:** three simulations and the exact equilibrium analysis run in real time at up to 8× speed on a laptop.',
    '**Explainability:** every decision can be traced to a payoff matrix and a list of best-response rounds.',
    '**Portability:** a single HTML file that works offline; no installation, no server.',
    '**Honesty:** limitations are stated in the application and in this report.',
  ]),
  sec('3.4 Why This Is a Complex Engineering Problem (WP1 to WP7)'),
  para('Complex Engineering Problems are characterised by the complex problem-solving attributes WP1 to WP7 of the Washington Accord graduate attributes. The table below relates each attribute to this project; a problem should satisfy WP1 and some of the others.'),
  table([700, 1700, 2600, 4026], ['WP', 'Attribute', 'Meaning', 'Evidence in this project'], wpRows, 'Complex engineering problem attributes WP1 to WP7', { size: 19 }),
  sec('3.5 Project Plan and Work Breakdown'),
  para('The project was organised as eight activities. The table lists each with its output. The simulator, the controllers and the tests were built first, so that every later claim could be measured.'),
  table([700, 2500, 3800, 2026], ['Task', 'Activity', 'Output', 'Status'], [
    ['T1', 'Problem study and literature review', 'Problem statement, game model sketch, reference list', 'Done'],
    ['T2', 'Traffic simulator', 'Vehicles, car-following, junction box rules, demand generator (src/engine.js)', 'Done'],
    ['T3', 'Game model and controllers', 'Payoff, best-response dynamics, selfish and fixed baselines', 'Done'],
    ['T4', 'Safety and correctness tests', 'Overlap and red-light invariants, regression run, feature checks (tests/)', 'Done'],
    ['T5', 'Evaluation harness', 'Common random numbers, paired t-test, benchmark tab', 'Done'],
    ['T6', 'Dynamic features (version 2)', 'Blocked approach, ambulance preemption, equilibrium enumeration, timeline, sweep, history, export, share link', 'Done'],
    ['T7', 'User interface', 'Map, panels, payoff matrix, charts, themes, shortcuts (src/ui.js, style.css)', 'Done'],
    ['T8', 'Report, presentation and repository', 'This report, presentation script, GitHub repository', 'Done'],
  ], 'Work breakdown'),
];

const ch4 = [
  ...chapter(4, 'System Design'),
  sec('4.1 Architecture Overview'),
  para('The application is a closed loop. A demand generator feeds vehicles into a microscopic simulator. Detectors summarise what each approach looks like (queue, approaching flow, waiting time, emergency vehicle, blockage). A controller chooses phases; a phase machine applies them under safety rules, and the lights change what the vehicles do. Disruptions enter the simulator directly. A measurement layer records metrics, and a presentation layer draws everything in the browser.'),
  ...figure('d1_architecture.jpg', 'System architecture', 590),
  sec('4.2 Layers and Responsibilities'),
  table([2000, 2700, 4326], ['Layer', 'Technology', 'Responsibility'], [
    ['Presentation', 'HTML, CSS, JavaScript, Canvas', 'Map, panels, charts, themes, keyboard shortcuts, links.'],
    ['Evaluation', 'JavaScript (statistics code)', 'Benchmark, paired t-test, sweep, history, CSV and JSON export.'],
    ['Control', 'JavaScript', 'Fixed-time, selfish and Nash controllers; best-response dynamics; preemption; equilibrium enumeration.'],
    ['Simulation', 'JavaScript', 'Vehicles, car-following, junction rules, demand, incidents, ambulance.'],
    ['Tests and tooling', 'Node.js, Python, Playwright, Matplotlib', 'Invariant checks, feature checks, experiments, screenshots, figures, report build.'],
  ], 'Layers of the system'),
  sec('4.3 The Decision Cycle'),
  para('Once per simulated second every adaptive controller runs one decision cycle (Figure 2). It reads the detector data, starts from the junctions’ current phases (junctions already in yellow or all-red are committed to their next phase and cannot change), lets each free junction in turn pick its best response, repeats until a full sweep changes nothing, and finally applies the result through the phase machine.'),
  ...figure('d2_decision_cycle.jpg', 'One decision cycle of the Nash controller', 590),
  sec('4.4 State and Data'),
  table([2500, 6526], ['Object', 'Contents'], [
    ['Junction', 'Row, column, phase (0 = North–South, 1 = East–West), status (green, yellow, all-red), timers.'],
    ['Vehicle', 'Axis, lane, position, speed, length, type, colour, entry time, distance, stop counters, turning random numbers, emergency flag.'],
    ['Detector reading (per junction, per approach)', 'q: queued vehicles near the stop line; m: vehicles approaching; w: accumulated waiting time of the queue; e: emergency vehicles approaching; blocked flag.'],
    ['Incident', 'Junction, approach, start and end time.'],
    ['Metrics', 'Exited trips, delay sums, stops, stopped time, queue integral, throughput, switches, ambulance trips, equilibrium statistics.'],
    ['Time series', 'Samples every 5 s for the live chart; one phase sample per second for the timeline.'],
  ], 'Main state of the simulator'),
  sec('4.5 Safety Design'),
  bullets([
    '**One green axis per junction.** Only one of the two phases can be green; a yellow (2.5 s) and an all-red (1 s) interval separate phases for every controller.',
    '**Minimum and maximum green.** 8 s and 45 s apply to all adaptive control. Preemption may shorten the minimum green to 3 s but never skips yellow or all-red.',
    '**No box blocking.** A vehicle does not enter a junction unless there is room to leave it.',
    '**Safe following.** Vehicles never move faster than the speed from which they can stop in the free distance ahead.',
    '**Automated checks.** Two invariant scripts count vehicle overlaps and stop-line crossings against red, on three controllers over 6,000 steps (10 simulated minutes); both counts are zero.',
  ]),
  sec('4.6 Reproducibility Design'),
  para('Random numbers come from a seeded generator, and every random decision about a vehicle (type, colour, speed factor, turning choices) is drawn when the vehicle is created. Controllers therefore never consume random numbers, so for a given seed the three controllers see identical arrival times, vehicle types and turning choices. Emergency vehicles use fixed values instead of random draws. A test confirms that switching on equilibrium analysis and visual mode does not change the simulation outcome.'),
];

const ch5 = [
  ...chapter(5, 'Game-Theoretic Methodology'),
  sec('5.1 The Signal Game'),
  para('The game is Γ = ( N, {A_i}, {u_i} ). The **players** N are the signalised junctions: four on a 2×2 grid and nine on a 3×3 grid. The **actions** are A_i = { North–South green, East–West green }. Each player chooses which road gets the next green. The **payoffs** u_i depend on the player’s own action and on its neighbours’ actions, which makes the game genuinely coupled.'),
  sec('5.2 Observations'),
  para('For each approach k ∈ {N, S, E, W} of junction i the detectors give q_k (stopped vehicles within 150 px, about 45 m, of the stop line), m_k (moving vehicles within 260 px, about 78 m), w_k (the sum of the time each queued vehicle has already been stationary) and e_k (emergency vehicles within 260 px). A blocked approach is flagged.'),
  sec('5.3 The Payoff Function'),
  para('The payoff of junction i for choosing phase a, given the others’ phases, is'),
  eq('u_i(a, a_−i) = Σ_{k∈a} ( q_k + 0.4 m_k + ω w_k/30 + E e_k )  −  σ · 1[a ≠ current]'),
  eq('− λ Σ_{j∈down(i,a)} q_{j←i} (1 − 0.7 · 1[a_j = a])'),
  eq('+ κ Σ_{j∈up(i,a)} 0.6 q_{j→i} · 1[a_j = a]'),
  table([1700, 2200, 5126], ['Term', 'Default', 'Meaning'], [
    ['q_k + 0.4 m_k', 'weights 1 and 0.4', 'Gain for vehicles that can be cleared now (queued) and soon (approaching).'],
    ['ω w_k / 30', 'ω = 1.0', 'Fairness: long-waiting queues pull the green towards them.'],
    ['E e_k', 'E = 60', 'Emergency vehicle waiting on the phase (zero unless preemption is on). Blocked approaches contribute nothing.'],
    ['σ', 'σ = 2.0', 'Switching cost (lost time): discourages flip-flopping.'],
    ['λ', 'λ = 0.6', 'Spillback penalty: reluctance to send vehicles into a neighbour whose queue on that link is full, reduced by 70% if the neighbour is also serving that road.'],
    ['κ', 'κ = 0.5', 'Coordination bonus: reward for matching a neighbour that is releasing a platoon towards the junction on the same road.'],
  ], 'Terms of the payoff function'),
  sec('5.4 Equilibrium by Best-Response Dynamics'),
  para('A profile a* is a pure-strategy Nash equilibrium if u_i(a*_i, a*_−i) ≥ u_i(a_i, a*_−i) for every player i and every action a_i. The controller finds one as follows:'),
  ...numbered([
    'Read the detector data q, m, w, e and the blocked flags.',
    'Start from the current phases. Junctions in yellow or all-red are committed to their next phase and take no part.',
    'Sweep the free junctions in a fixed order. Each picks the action with the higher payoff given everyone else’s current action; a tie keeps the current action.',
    'Repeat sweeps until a whole sweep changes nothing. That profile is a pure Nash equilibrium. A cycle is cut off after 8 rounds.',
    'Apply the profile through the phase machine: a junction may start switching only if its green has lasted at least the minimum green (8 s, or 3 s when preempting for an ambulance), and a junction is forced to switch after the maximum green (45 s) if the other road has demand.',
  ], 'num2'),
  para('Because the payoff is built from congestion-style terms, the dynamics settle quickly: in our experiments they reached equilibrium in 100% of decisions, in about 1.6 to 1.7 rounds on average in the 2×2 balanced scenario. This is an empirical observation for this payoff design, not a proof. The simulator reports the convergence rate for every run.'),
  sec('5.5 Baselines'),
  table([2000, 7026], ['Controller', 'Rule'], [
    ['Fixed-time', '20 s North–South, 20 s East–West, with yellow and all-red between. No sensing; cannot see blockages or ambulances.'],
    ['Selfish adaptive', 'The same game with λ = κ = 0. Each junction maximises only its own local benefit; the best responses are independent.'],
    ['Nash game', 'The full coupled payoff above; the equilibrium of the whole network.'],
  ], 'Controllers compared'),
  sec('5.6 Emergency-Vehicle Preemption'),
  para('When an ambulance is within 260 px of a stop line, the term E e_k (E = 60) is added to the payoff of the phase that serves its approach. The value is far above typical queue sums, so the best response flips to the ambulance’s road. In the phase machine the minimum green is relaxed from 8 s to 3 s, but only for a junction whose current phase does **not** serve the ambulance, and yellow (2.5 s) and all-red (1 s) are always observed. The selfish and Nash controllers both preempt (the user can switch preemption off); fixed-time has no sensing and cannot.'),
  sec('5.7 Blocked Approaches'),
  para('An incident closes one approach of one junction for 60 to 180 s: vehicles queue at that stop line and cannot cross. The detector flags the approach as blocked. The payoff gain is zero for a blocked approach (a green there would clear nothing), and the maximum-green demand test ignores it. The queue on the blocked link is still visible to the upstream neighbour through the spillback term, so the neighbour becomes reluctant to send more traffic into it. Fixed-time cannot see the flag and keeps granting green to the blocked stop line.'),
  sec('5.8 Exact Equilibrium Analysis'),
  para('To measure the quality of the equilibrium, every second the simulator enumerates all 2^F joint plans of the F free junctions (16 for a 2×2 grid; at most 512 for 3×3). For each plan it computes the total payoff W = Σ_i u_i, and checks the Nash condition for every free player. It then records the number of pure equilibria, the best and worst total payoff, and the rank of the plan chosen by best-response dynamics.'),
  sec('5.9 Equilibrium Efficiency'),
  para('Payoffs can be negative, so a ratio-based price of anarchy is not meaningful. We define'),
  eq('efficiency = ( W(chosen) − W(worst) ) / ( W(best) − W(worst) )'),
  para('which is 100% when the equilibrium found is also the best joint plan and 0% if it is the worst. The measure is reported live on the Game model tab and averaged over decisions in the experiments.'),
  sec('5.10 Worked Example'),
  para('Figure 3 shows the live payoff matrix for junctions J1 and J2, which share the East–West road, at one instant in a 2×2 run. J1’s payoff is −0.3 if it serves North–South and 0.8 if it serves East–West, whatever J2 does, so East–West is J1’s best response in both columns. J2 earns 2.0 serving North–South and −1.6 serving East–West, whatever J1 does, so North–South is its best response in both rows. The only cell where both payoffs are underlined is (J1: East–West, J2: North–South): the unique pure Nash equilibrium, with payoffs 0.8 and 2.0. When both junctions’ best responses do not depend on the other’s action the game at that instant is effectively decoupled; the coupling terms λ and κ matter when neighbouring links are close to full.'),
  ...figure('f15_payoff_matrix.jpg', 'Live payoff matrix for J1 and J2 with the pure Nash equilibrium shaded', 440),
  ...figure('f16_best_response_rounds.jpg', 'Best-response rounds at the latest decision: the profile is stable after one change round', 520),
];

const ch6 = [
  ...chapter(6, 'Simulation Model and Experimental Design'),
  sec('6.1 Road Network'),
  para('An N×N grid of junctions (N = 2 or 3) connected by two-way roads with one lane per direction and left-hand traffic. Vehicles enter at the 4N border roads and leave at the far border. About a quarter turn left or right at each junction they cross (turning probability 0.25).'),
  sec('6.2 Vehicles and Car Following'),
  table([1700, 1300, 1300, 4726], ['Type', 'Share', 'Length', 'Notes'], [
    ['Car', '55%', '18 px', 'Free speed factor about 1.0'],
    ['Two-wheeler', '25%', '10 px', 'Slightly faster (1.05)'],
    ['Auto-rickshaw', '12%', '14 px', 'Slower (0.9)'],
    ['Bus', '8%', '32 px', 'Slowest (0.85), longest'],
    ['Ambulance', 'on demand', '20 px', 'Fast (1.25); never turns'],
  ], 'Vehicle types'),
  para('Each vehicle accelerates (16 px/s²) towards its desired speed (about 45 px/s) but never faster than √(2 b d), where b = 26 px/s² is the braking rate and d the free distance to the vehicle ahead or to the stop line it must obey. A 5 px minimum gap is kept. Scale: 1 px ≈ 0.3 m, so the free speed is about 49 km/h; the time step is 0.1 s.'),
  sec('6.3 Demand'),
  para('Arrivals at each border road follow a Poisson process with a configurable rate (2 to 14 vehicles per minute), a direction mix (East–West versus North–South, ±60%) and an optional rush-hour wave in which the rate varies between 0.5 and 1.5 times the base over 15 minutes. A vehicle that cannot enter because the road end is occupied waits in an entry queue and is counted in the delay.'),
  sec('6.4 Metrics'),
  table([3300, 5726], ['Metric', 'Definition'], [
    ['Average delay (s)', 'Trip time minus free-flow time, over finished trips, vehicles still on the map and vehicles waiting to enter. A controller cannot look good by leaving cars outside.'],
    ['95th percentile delay (s)', 'The delay below which 95% of vehicles fall: a fairness / worst-case view.'],
    ['Vehicles stopped', 'Time average of the number of vehicles moving slower than 2 px/s.'],
    ['Stops per trip', 'Number of stop-and-go events per finished trip.'],
    ['Throughput (trips/min)', 'Finished trips per minute.'],
    ['Idling time (vehicle-hours)', 'Sum of the stopped time of all vehicles. An illustrative CO₂ estimate multiplies it by 0.8 L/h idle fuel burn and 2.31 kg CO₂ per litre of petrol; it is an indicator, not a measurement.'],
    ['Ambulance trip (s)', 'From dispatch to leaving the network, including any wait to enter.'],
    ['Equilibrium efficiency', 'See Chapter 5.9.'],
  ], 'Metrics'),
  sec('6.5 Experimental Design'),
  bullets([
    '**Seeds and duration.** Ten seeds (1000, 1101, …, 1909), each 15 simulated minutes (9,000 steps).',
    '**Common random numbers.** For a given seed all controllers see identical arrivals and vehicle properties.',
    '**Scenarios.** 2×2 balanced (8 vehicles/min per entry), 2×2 East–West heavier by 45%, 2×2 heavy (11/min), 2×2 rush-hour wave, 3×3 balanced and 3×3 heavy.',
    '**Disruptions.** Blocked approaches at 240 s (J1, from the north) and 540 s (last junction, from the south), 120 s each; ambulances at 180 s, 480 s and 720 s on different roads. The same events are injected for every controller.',
    '**Statistics.** Paired two-sided t-test across seeds; p < 0.05 is treated as significant. Standard deviations over seeds are reported.',
    '**Game weights.** ω = 1.0, σ = 2.0, λ = 0.6, κ = 0.5 unless a sweep varies them.',
  ]),
  para('Everything in Chapter 8 is produced by one command, **node tests/experiments.js**, which writes docs/results.json; the report tables are generated from that file.'),
];

const ch7 = [
  ...chapter(7, 'Implementation'),
  sec('7.1 Tools and Technologies'),
  table([2200, 2800, 4026], ['Area', 'Tool', 'Use in the project'], [
    ['Language', 'JavaScript (ES2020)', 'Simulator, controllers, statistics and user interface in one code base.'],
    ['Rendering', 'HTML5 Canvas, CSS', 'Animated map, charts, themes, responsive layout.'],
    ['Build', 'Python 3 (build.py)', 'Bundles src/ into one self-contained index.html.'],
    ['Testing', 'Node.js', 'Invariant checks, feature checks, experiments.'],
    ['Screenshots and figures', 'Playwright, Matplotlib, Pillow', 'Reproducible screenshots and result charts for this report.'],
    ['Report', 'docx (Node), Times New Roman layout', 'Generated from the results file so numbers cannot drift.'],
    ['Version control', 'Git, GitHub', REPO],
  ], 'Tools used'),
  sec('7.2 Project Structure'),
  table([3000, 6026], ['Path', 'Contents'], [
    ['index.html', 'Built single-file application (generated).'],
    ['src/engine.js', 'Simulator, controllers, best-response dynamics, equilibrium enumeration, disruptions, statistics.'],
    ['src/ui.js', 'Rendering, panels, benchmark, sweep, history, export, shortcuts, links.'],
    ['src/body.html, src/style.css', 'Page markup (including the in-app report) and light and dark styling.'],
    ['build.py', 'Bundles the sources into index.html.'],
    ['tests/test.js, inv.js, inv2.js', 'Headless benchmark; overlap and red-light invariants.'],
    ['tests/features.js', 'Checks for incidents, preemption and equilibrium analysis (17 checks).'],
    ['tests/experiments.js', 'Reproduces every number in the report; writes docs/results.json.'],
    ['docs/', 'This report, its build scripts, figures and screenshots, and the presentation script.'],
  ], 'Project structure'),
  sec('7.3 User Interface'),
  para('The interface has four tabs: Live simulation, Game model, Benchmark and Project report. The figures below are captured from the running application by a script, in a reproducible state.'),
  sub('Live simulation'),
  ...figure('f01_live_simulation.jpg', 'Live simulation tab: map, key indicators, scenario controls and the disruption panel', 585),
  para('The map shows signal heads, queue heat, green corridors (two junctions serving the same road) and the controller chosen by the user. The three controllers run side by side on identical arrivals in the background, and the chart compares them live.'),
  ...figure('f03_three_controllers_chart.jpg', 'Average delay of the three controllers over time on identical traffic', 520),
  ...figure('f06_inspector.jpg', 'Junction inspector: queues per approach, payoff of each action and the reason for the decision', 420),
  sub('Dynamic features'),
  ...figure('f08_incident_map.jpg', 'A blocked approach at J2 (striped barrier with countdown); the junction no longer wastes green on it', 440),
  ...figure('f10_ambulance_map.jpg', 'An ambulance (flashing lights, red halo) approaching J1 from the west under preemption', 440),
  ...figure('f11_ambulance_result.jpg', 'Ambulance panel after five runs: mean trip times of the three controllers', 360),
  ...figure('f09_event_log.jpg', 'Event log of the incident', 440),
  ...figure('f04_timeline_nash.jpg', 'Signal timeline for the Nash controller: greens stretch and shrink with demand', 520),
  ...figure('f05_timeline_fixed.jpg', 'Signal timeline for the fixed-time controller: a regular pattern', 520),
  ...figure('f13_grid_3x3.jpg', 'The 3×3 grid with nine players', 440),
  sub('Game model'),
  ...figure('f19_signal_game_model.jpg', 'Game model tab: players, strategies, payoff and equilibrium', 480),
  ...figure('f17_tune_game.jpg', 'Live tuning of ω, σ, λ and κ', 440),
  ...figure('f18_equilibrium_analysis.jpg', 'Equilibrium analysis: all 16 joint plans of a 2×2 grid ranked by total payoff', 480),
  sub('Benchmark and evidence'),
  ...figure('f20_bench_summary.jpg', 'Benchmark summary written in plain language from the data', 585),
  ...figure('f21_bench_table.jpg', 'Benchmark results table with paired t-tests (10 seeds, 15 minutes, 2×2 balanced)', 585),
  ...figure('f22_bench_bars.jpg', 'Comparison bars with standard deviation', 585),
  ...figure('f25_bench_disruptions_table.jpg', 'Benchmark with blocked approaches and ambulance runs', 585),
  ...figure('f26_lambda_sweep.jpg', 'Parameter sweep of the spillback penalty λ', 585),
  ...figure('f27_run_history.jpg', 'Run history stored in the browser', 585),
  ...figure('f28_dark_theme.jpg', 'Dark theme', 585),
];

/* ---- results tables from results.json */
const scRows = SC.map(s => [s.name, f1(ctl(s, 'fixed', 'delay')[0]), f1(ctl(s, 'selfish', 'delay')[0]), f1(ctl(s, 'nash', 'delay')[0]), sgn(s.tests.nashVsFixed.change) + '\n(p ' + pf(s.tests.nashVsFixed.p) + ')', sgn(s.tests.nashVsSelfish.change) + '\n(p ' + pf(s.tests.nashVsSelfish.p) + ')']);
const detRows = [['Average delay (s)', 'delay', 1], ['95th percentile delay (s)', 'p95', 1], ['Vehicles stopped (average)', 'stopped', 1], ['Stops per trip', 'stops', 2], ['Throughput (trips/min)', 'thr', 1], ['Idling time (vehicle-hours)', 'idleH', 2]]
  .map(([n, k, d]) => [n, ...['fixed', 'selfish', 'nash'].map(c => ctl(S0, c, k)[0].toFixed(d) + ' ± ' + ctl(S0, c, k)[1].toFixed(d))]);
detRows.push(['Est. CO₂ from idling (kg, illustrative)', ...['fixed', 'selfish', 'nash'].map(c => idleKg(ctl(S0, c, 'idleH')[0]).toFixed(1) + ' ± ' + idleKg(ctl(S0, c, 'idleH')[1]).toFixed(1))]);
const extra = c => ctl(DS[0], c, 'delay')[0] - ctl(S0, c, 'delay')[0];
const dsRows = [['None (2×2 balanced)', S0], ['Blocked approaches', DS[0]], ['Ambulance runs', DS[1]], ['Both', DS[2]]].map(([n, s]) => [n, f1(ctl(s, 'fixed', 'delay')[0]), f1(ctl(s, 'selfish', 'delay')[0]), f1(ctl(s, 'nash', 'delay')[0]), sgn(s.tests.nashVsFixed.change)]);
const sw = R.sweep;
const swRows = sw[0].points.map((p, i) => [p.lam.toFixed(1), f1(p.mean) + ' ± ' + f1(p.sd), f1(sw[1].points[i].mean) + ' ± ' + f1(sw[1].points[i].sd)]);
const bestLam = s => s.points.reduce((a, b) => b.mean < a.mean ? b : a);

const ch8 = [
  ...chapter(8, 'Testing and Results'),
  sec('8.1 Test Strategy'),
  table([2500, 1500, 5026], ['Test', 'Result', 'What is checked'], [
    ['Invariants (tests/inv.js)', '0 overlaps', 'Vehicles never overlap (minimum gap 5 px kept) on all three controllers, 3×3 grid, 10 simulated minutes.'],
    ['Invariants (tests/inv2.js)', '0 violations', 'No vehicle crosses a stop line while its signal is red; crossings are counted: fixed 484, selfish 176, Nash 192.'],
    ['Regression benchmark (tests/test.js)', 'unchanged', 'Delays of the three controllers are identical to the first version when no disruption is active.'],
    ['Feature checks (tests/features.js)', '17 / 17 pass', 'No crossing of a blocked stop line; incidents expire; Nash beats fixed under an incident; every ambulance trip completes; preemption beats fixed-time and beats the same controller without it; at least one Nash equilibrium found; efficiency within [0, 1]; analysis does not alter the simulation.'],
    ['Experiments (tests/experiments.js)', 'about 500 runs', 'Every table in this chapter; also the source of the report numbers.'],
  ], 'Automated tests'),
  sec('8.2 Controllers on Six Traffic Scenarios'),
  table([2500, 1100, 1100, 1100, 1650, 1576], ['Scenario', 'Fixed (s)', 'Selfish (s)', 'Nash (s)', 'Nash vs fixed', 'Nash vs selfish'], scRows, 'Average delay per vehicle, mean over 10 seeds (15 simulated minutes)', { center: true, size: 19 }),
  ...figure('c1_delay_by_scenario.jpg', 'Average delay by scenario and controller', 560),
  para('Both adaptive controllers beat the fixed timer in every scenario. The Nash controller lowered average delay by ' + f1(rangeNashFixed[0]) + '% to ' + f1(rangeNashFixed[1]) + '%, and every paired t-test has p < 0.001 (the largest p-value is ' + maxPFixed.toExponential(1) + '). The gain is largest when one direction is much busier than the other (East–West +45%: ' + f1(-SC[1].tests.nashVsFixed.change) + '%), where a fixed 20 s / 20 s split is badly mismatched. It is smallest under heavy load and in the rush-hour wave, where the network is close to saturation and there is little slack for any controller to exploit.'),
  ...figure('c2_gain_vs_fixed.jpg', 'Reduction in average delay of the Nash controller relative to fixed-time', 560),
  sub('The Nash game versus the selfish controller'),
  para('**The coupled Nash game was not significantly better than the selfish adaptive controller in any scenario.** The difference in average delay ranged from ' + sgn(Math.min(...nsCh)) + ' to ' + sgn(Math.max(...nsCh)) + ', with p-values between ' + f2(Math.min(...nsP)) + ' and ' + f2(Math.max(...nsP)) + '. We therefore draw the following conclusions and no stronger ones: (1) most of the benefit over fixed-time comes from reacting to queues at all; (2) the spillback and coordination terms did not measurably help at these loads on grids of this size, where links are short but rarely blocked; (3) the value of the game formulation here lies in the decision rule being explainable, equilibria being checkable (Section 8.7), and the extension to preemption and incidents fitting naturally into the payoff.'),
  sec('8.3 Detailed Results for the Balanced 2×2 Scenario'),
  table([3300, 1900, 1900, 1926], ['Metric', 'Fixed-time', 'Selfish', 'Nash game'], detRows, 'All metrics for 2×2 balanced, mean ± SD over 10 seeds', { center: true, size: 19 }),
  para('Relative to fixed-time the Nash controller reduced the 95th percentile delay by ' + f1(-S0.tests.p95NashVsFixed.change) + '%, so the improvement is not bought by sacrificing the slowest vehicles. Idling time fell by ' + f1(-S0.tests.idleNashVsFixed.change) + '%, which corresponds to the illustrative CO₂ figures in the table. Adaptive controllers switch signals much more often than the fixed timer (about 265 switches per junction per hour versus 148) which is a cost in wear and driver expectation that the delay figures do not show.'),
  sec('8.4 Disruptions'),
  table([2900, 1400, 1400, 1400, 1926], ['Disruption', 'Fixed (s)', 'Selfish (s)', 'Nash (s)', 'Nash vs fixed'], dsRows, 'Average delay with disruptions injected identically for all controllers (2×2 balanced, 10 seeds)', { center: true, size: 19 }),
  ...figure('c5_disruptions.jpg', 'Average delay under disruptions', 520),
  para('Blocked approaches raised delay for everyone, since vehicles on a blocked approach simply cannot move. The increase in average delay was +' + f1(extra('fixed')) + ' s for fixed-time, +' + f1(extra('selfish')) + ' s for selfish and +' + f1(extra('nash')) + ' s for Nash: the adaptive controllers absorbed the disruption with about ' + f0((1 - extra('nash') / extra('fixed')) * 100) + '% less extra delay, because they stopped giving green to a stop line that could not use it. The relative advantage over fixed-time (' + sgn(DS[0].tests.nashVsFixed.change) + ') stayed close to the undisturbed value (' + sgn(S0.tests.nashVsFixed.change) + '): the disruption hurt everybody, and the adaptive controllers started from, and kept, a lower level.'),
  sec('8.5 Emergency Vehicle Preemption'),
  table([3600, 2200, 3226], ['Configuration', 'Ambulance trip (s)', 'Comment'], [
    ['Fixed-time', f1(PRE.fixed[0]) + ' ± ' + f1(PRE.fixed[1]), 'No sensing'],
    ['Nash, preemption off', f1(PRE.off[0]) + ' ± ' + f1(PRE.off[1]), 'Treats the ambulance like any vehicle'],
    ['Nash, preemption on', f1(PRE.on[0]) + ' ± ' + f1(PRE.on[1]), sgn(PRE.change) + ' vs off (paired p ' + pf(PRE.pOnVsOff) + ')'],
  ], 'Ambulance trip time, three runs per seed at 180 s, 480 s and 720 s (10 seeds)', { center: true }),
  ...figure('c4_ambulance.jpg', 'Ambulance trip time with and without preemption', 400),
  para('Preemption cut the mean ambulance trip by ' + f0(-PRE.change) + '% compared with the same controller without it, and by ' + f0((1 - PRE.on[0] / PRE.fixed[0]) * 100) + '% compared with fixed-time. Without preemption the Nash controller is only slightly better than fixed-time for the ambulance (' + f1(PRE.off[0]) + ' s versus ' + f1(PRE.fixed[0]) + ' s), because it does not know the vehicle is special. The trip time includes any wait to enter the network. The single-run view on the live tab is noisy: one ambulance can be lucky with fixed-time signals, which is why the application reports a running mean and the Benchmark tab averages over seeds.'),
  sec('8.6 Sensitivity to the Spillback Penalty λ'),
  table([1700, 3500, 3826], ['λ', '2×2 balanced: delay (s)', '3×3 heavy: delay (s)'], swRows, 'Average delay of the Nash controller against λ (mean ± SD over 10 seeds; fixed-time: ' + f1(sw[0].fixed) + ' s and ' + f1(sw[1].fixed) + ' s)', { center: true, size: 19 }),
  ...figure('c3_lambda_sweep.jpg', 'Delay against the spillback penalty λ', 560),
  para('For both scenarios the curve is flat for λ up to about 1.2 (the lowest means are at λ = ' + bestLam(sw[0]).lam.toFixed(1) + ' and λ = ' + bestLam(sw[1]).lam.toFixed(1) + ', and the differences are well inside the seed-to-seed spread). For large λ delay rises: at λ = 3 delay on the 2×2 grid is ' + f1(sw[0].points[7].mean) + ' s against ' + f1(sw[0].points[0].mean) + ' s at λ = 0 (' + sgn((sw[0].points[7].mean / sw[0].points[0].mean - 1) * 100) + '), because junctions become over-cautious and hold back vehicles to protect neighbours. This is the trade-off between private and network benefit: neighbour-awareness is harmless in moderation and harmful in excess.'),
  sec('8.7 Quality of the Equilibrium'),
  table([2300, 1900, 2400, 2426], ['Scenario', 'Converged', 'Pure NE per decision', 'Efficiency / best plan'], EQ.map(e => [e.name, f1(e.converged * 100) + '%', f2(e.nashCount[0]), f1(e.efficiency[0] * 100) + '% / ' + f0(e.bestPlanShare[0] * 100) + '%']), 'Exact enumeration of all joint plans every second (10 seeds, 15 minutes)', { center: true }),
  ...figure('c6_equilibrium_quality.jpg', 'Equilibrium efficiency and share of decisions where the equilibrium is the best plan', 520),
  para('Best-response dynamics reached an equilibrium in every decision. There was almost always exactly one pure equilibrium (1.03 to 1.20 on average), so the equilibrium selection problem is mild for this payoff design. The equilibrium found was the best joint plan in ' + f0(Math.min(...EQ.map(e => e.bestPlanShare[0] * 100))) + '% to ' + f0(Math.max(...EQ.map(e => e.bestPlanShare[0] * 100))) + '% of decisions, and on average reached ' + f1(Math.min(...EQ.map(e => e.efficiency[0] * 100))) + '% to ' + f1(Math.max(...EQ.map(e => e.efficiency[0] * 100))) + '% of the range between the worst and the best plan. The share of best-plan decisions falls as the grid grows and loads rise, as expected: with more players and more coupling the equilibrium can differ from the optimum.'),
  sec('8.8 Threats to Validity and Limitations'),
  bullets([
    '**Synthetic demand.** Arrivals are Poisson and the network is a regular grid; real traffic has platoons, pedestrians and irregular layouts. The numbers describe controllers inside our simulator.',
    '**Simplified physics.** One lane per direction, a simple car-following rule and an abstract scale; no calibration against detector data and no validation against SUMO.',
    '**Two phases.** No left-turn phases, no pedestrian phases, no offsets between junctions.',
    '**Small grids and a single seed set.** Results are for 2×2 and 3×3 grids and ten seeds; effects too small to detect with ten seeds may exist (for example Nash versus selfish).',
    '**Equal treatment of vehicles.** The payoff counts vehicles, not people; a bus counts as one vehicle.',
    '**Disruption model.** An incident is a complete blockage of one approach for a fixed time, known to the controller through its detector.',
    '**CO₂ figure.** An illustration from stated assumptions, not a measurement.',
  ]),
];

const ch9 = [
  ...chapter(9, 'Social Impact, Ethics and Sustainability'),
  sec('9.1 Expected Impact'),
  bullets([
    '**Less time lost.** In simulation the adaptive controllers cut delay by ' + f0(rangeNashFixed[0]) + '% to ' + f0(rangeNashFixed[1]) + '%, depending on load.',
    '**Faster emergency response.** Ambulance trips are about ' + f0((1 - PRE.on[0] / PRE.fixed[0]) * 100) + '% shorter than with fixed-time.',
    '**Resilience.** Controllers that notice a blocked road stop wasting green on it.',
    '**Transparency.** The payoff matrix and equilibrium analysis let an operator see why a signal chose a phase.',
  ]),
  sec('9.2 Ethical Considerations'),
  bullets([
    '**Safety first.** No controller can break yellow and all-red clearance; preemption shortens only the minimum green.',
    '**Fairness between roads.** The fairness term ω prevents a minor road from waiting indefinitely, and a maximum green of 45 s caps any single phase. The 95th-percentile delay is reported so that improvements are not bought at the expense of the slowest vehicles.',
    '**Equal treatment of road users.** The payoff counts vehicles; a deployment should consider weighting buses, cyclists and pedestrians.',
    '**Privacy.** The system uses only anonymous vehicle counts; it stores and transmits no personal data.',
    '**Honest reporting.** The Nash-versus-selfish result is reported as it is, and the synthetic nature of demand is stated throughout.',
  ]),
  sec('9.3 Sustainability'),
  para('Reducing idling lowers fuel use and local emissions. In the balanced 2×2 scenario the Nash controller cut idling by ' + f0(-S0.tests.idleNashVsFixed.change) + '%. The software itself is lightweight: the full set of about 500 simulated runs behind this report completes in under three minutes on a laptop, and the application runs in a browser without a server.'),
];

const ch10 = [
  ...chapter(10, 'Mapping to Course Outcomes, Programme Outcomes, Knowledge Profiles and WP'),
  para('This chapter relates the project to the outcomes of the Data Science course and to the programme outcomes (PO), knowledge profiles (WK) and complex problem-solving attributes (WP) used for Complex Engineering Problems. Course-outcome numbers follow the order of topics in the course; adjust them to the official list if it differs.'),
  sec('10.1 Course Outcome Mapping'),
  table([900, 4400, 3726], ['CO', 'Outcome (summary)', 'Where it is demonstrated'], [
    ['CO1', 'Generate, collect and prepare data for analysis.', 'Chapter 6: seeded synthetic demand, common random numbers, metric definitions.'],
    ['CO2', 'Explore and summarise data with descriptive statistics and visualisation.', 'Chapter 8 and Chapter 7: means, standard deviations, percentiles, charts, timelines.'],
    ['CO3', 'Build and apply models and algorithms to a problem.', 'Chapter 5: game model, best-response dynamics, equilibrium enumeration.'],
    ['CO4', 'Evaluate models and draw statistically sound inferences.', 'Chapter 8: paired t-tests, sweeps, honest handling of non-significant results.'],
    ['CO5', 'Build, present and communicate a data-driven application for a real-world problem.', 'Chapters 4, 7: complete application; report; presentation script.'],
  ], 'Course outcome mapping'),
  sec('10.2 Programme Outcome Mapping'),
  table([900, 3000, 3200, 1926], ['PO', 'Programme outcome', 'Evidence', 'Level'], [
    ['PO1', 'Engineering knowledge', 'Game theory, traffic flow, probability and statistics, algorithms.', 'High'],
    ['PO2', 'Problem analysis', 'Decomposed the problem into players, strategies, payoffs, safety rules and metrics (Chapters 3, 5).', 'High'],
    ['PO3', 'Design and development of solutions', 'Architecture, controllers, simulator, interface (Chapters 4 to 7).', 'High'],
    ['PO4', 'Investigation of complex problems', 'Controlled experiments, sweeps, equilibrium analysis, threats to validity (Chapter 8).', 'High'],
    ['PO5', 'Modern tool usage', 'JavaScript, Node.js, Python, Playwright, Matplotlib, Git and GitHub.', 'High'],
    ['PO6', 'The engineer and society', 'Congestion, emergency response, SDG 11 (Chapters 1.5, 9).', 'High'],
    ['PO7', 'Environment and sustainability', 'Idling reduction and emissions estimate (Chapter 9.3).', 'Medium'],
    ['PO8', 'Ethics', 'Safety-first design, fairness, honest reporting (Chapter 9.2).', 'Medium'],
    ['PO9', 'Individual and team work', 'Three-member team with a shared repository.', 'Medium'],
    ['PO10', 'Communication', 'This report, presentation script, README, in-app report.', 'High'],
    ['PO11', 'Project management and finance', 'Work breakdown, version control, automated tests, no paid services (Chapter 3.5).', 'Medium'],
    ['PO12', 'Life-long learning', 'Self-learning of game theory, simulation and statistics beyond the syllabus.', 'Medium'],
  ], 'Programme outcome mapping'),
  sec('10.3 Knowledge Profile (WK) Mapping'),
  table([900, 3300, 4826], ['WK', 'Knowledge profile', 'Evidence'], [
    ['WK2', 'Mathematics, statistics and computer science', 'Probability (Poisson arrivals), game theory, hypothesis testing, algorithms.'],
    ['WK3', 'Engineering fundamentals', 'Vehicle kinematics (safe-stopping speed), queueing behaviour at signals.'],
    ['WK4', 'Specialist engineering knowledge', 'Traffic signal control, multi-agent systems, simulation.'],
    ['WK5', 'Engineering design', 'System architecture, decision cycle, interface design.'],
    ['WK6', 'Engineering practice', 'Testing, version control, reproducible experiments.'],
    ['WK7', 'Engineering in society', 'Urban mobility, emergency services, SDG 11.'],
    ['WK8', 'Research literature', 'Webster, max-pressure, potential games, multi-agent traffic control (References).'],
    ['WK9', 'Ethics, inclusive behaviour and conduct', 'Safety, fairness, privacy, honest reporting of limitations.'],
  ], 'Knowledge profile mapping'),
  sec('10.4 Complex Problem-Solving Attributes (WP) Mapping'),
  para('The complete justification of WP1 to WP7 is in Chapter 3.4. In summary, WP1, WP2, WP3, WP4, WP6 and WP7 are strongly addressed and WP5 is partly addressed: signal clearance practice applies, but there is no code of practice for the simulation model itself.'),
];

const ch11 = [
  ...chapter(11, 'Conclusion and Future Scope'),
  sec('11.1 Conclusion'),
  para('This project set out to show that traffic signals can be treated as rational players in a game, that the equilibrium of that game is cheap enough to compute every second, and that the resulting control beats a fixed timer. In our simulator it does: across six scenarios the Nash controller reduced average delay by ' + f0(rangeNashFixed[0]) + '% to ' + f0(rangeNashFixed[1]) + '% with every paired t-test below 0.001, and it kept the 95th-percentile delay down as well. Version 2 made the system dynamic: users can block a road or send an ambulance while it runs, and the controllers respond; with preemption the ambulance trip fell from ' + f1(PRE.off[0]) + ' s to ' + f1(PRE.on[0]) + ' s. An exact enumeration of all joint plans showed that best-response dynamics reached an equilibrium every time, that the equilibrium was nearly always unique, and that it captured ' + f0(Math.min(...EQ.map(e => e.efficiency[0] * 100))) + '% to ' + f0(Math.max(...EQ.map(e => e.efficiency[0] * 100))) + '% of the best possible joint payoff.'),
  para('The work also made limits clear. The coupled Nash game was not significantly better than the selfish adaptive controller in any scenario, so we attribute the gain over fixed-time to adaptivity, not to coordination. Demand is synthetic and the model is not validated against real data, so the figures describe the controllers in our simulator and not a real road network. The value of the project is therefore the complete, explainable, testable and reproducible system, together with an honest statement of what it does and does not show.'),
  sec('11.2 Future Scope'),
  bullets([
    'Calibrate demand and parameters with real detector or video counts from a Navi Mumbai corridor, and validate against SUMO.',
    'Larger networks with heterogeneous link lengths, multiple lanes, left-turn and pedestrian phases, and offsets between junctions.',
    'Learn the payoff weights with multi-agent reinforcement learning, and compare with max-pressure control [3].',
    'Bayesian games with uncertain demand; priorities for buses and non-motorised road users.',
    'Test whether coordination terms pay off on larger grids, with link capacities closer to the limit, using a much larger number of seeds.',
    'Connect to live detectors and a real signal controller through a safe supervisory interface.',
  ]),
];

const refs = [
  ...unnumbered('References'),
  ...[
    '[1] United Nations, "Transforming our world: the 2030 Agenda for Sustainable Development," General Assembly resolution A/RES/70/1, 2015.',
    '[2] F. V. Webster, "Traffic signal settings," Road Research Technical Paper No. 39, HMSO, London, 1958.',
    '[3] P. Varaiya, "Max pressure control of a network of signalized intersections," Transportation Research Part C, vol. 36, pp. 177-195, 2013.',
    '[4] J. Nash, "Equilibrium points in n-person games," Proceedings of the National Academy of Sciences, vol. 36, no. 1, pp. 48-49, 1950.',
    '[5] D. Monderer and L. S. Shapley, "Potential games," Games and Economic Behavior, vol. 14, no. 1, pp. 124-143, 1996.',
    '[6] A. L. C. Bazzan, "Opportunities for multiagent systems and multiagent reinforcement learning in traffic control," Autonomous Agents and Multi-Agent Systems, vol. 18, pp. 342-375, 2009.',
    '[7] S. Krauss, P. Wagner and C. Gawron, "Metastable states in a microscopic model of traffic flow," Physical Review E, vol. 55, no. 5, pp. 5597-5602, 1997.',
    '[8] A. M. Law, Simulation Modeling and Analysis, 5th ed. New York: McGraw-Hill, 2015.',
    '[9] D. C. Montgomery and G. C. Runger, Applied Statistics and Probability for Engineers, 7th ed. Hoboken, NJ: Wiley, 2018.',
    '[10] T. Roughgarden and É. Tardos, "How bad is selfish routing?" Journal of the ACM, vol. 49, no. 2, pp. 236-259, 2002.',
    '[11] Y. Shoham and K. Leyton-Brown, Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations. Cambridge University Press, 2008.',
    '[12] Indian Roads Congress, "Guidelines on Design and Installation of Road Traffic Signals," IRC:93.',
    '[13] Project source code, GitHub repository. ' + REPO,
  ].map(r => new Paragraph({ spacing: { after: 100, line: 300 }, indent: { left: 540, hanging: 540 }, alignment: AlignmentType.JUSTIFIED, children: [t(r, { size: 22 })] })),
];

const appA = [
  ...unnumbered('Appendix A: Running the Project'),
  para('Source code: **' + REPO + '**'),
  para('The application needs no installation. Open index.html in a browser. To rebuild after editing the sources, and to run the tests, open a terminal in the project folder:'),
  ...['python build.py', 'node tests/features.js', 'node tests/experiments.js'].map(c => new Paragraph({ spacing: { after: 60 }, indent: { left: 540 }, children: [t(c, { font: 'Consolas', size: 22 })] })),
  table([4000, 5026], ['Command', 'Effect'], [
    ['python build.py', 'Bundle src/ into index.html.'],
    ['node tests/test.js \'{"n":2,"rate":8,"bias":0}\'', 'Headless benchmark of the three controllers (5 seeds).'],
    ['node tests/inv.js ; node tests/inv2.js', 'Overlap and red-light invariants.'],
    ['node tests/features.js', '17 checks of incidents, preemption and equilibrium analysis.'],
    ['node tests/experiments.js', 'All experiments in the report; writes docs/results.json (about 3 minutes).'],
    ['python docs/capture_screenshots.py', 'Recaptures the report screenshots (needs a local web server and Playwright).'],
  ], 'Commands'),
  ...unnumbered('Appendix B: Parameters'),
  table([3200, 1500, 4326], ['Parameter', 'Value', 'Meaning'], [
    ['Time step', '0.1 s', 'Simulation step.'],
    ['Decision interval', '1 s', 'The controllers decide once per simulated second.'],
    ['Yellow / all-red', '2.5 s / 1.0 s', 'Clearance between phases.'],
    ['Minimum / maximum green', '8 s / 45 s', 'Safety limits for adaptive control.'],
    ['Preemption minimum green', '3 s', 'Only for a junction holding an ambulance back.'],
    ['Fixed-time green', '20 s each', 'Baseline plan.'],
    ['Detector ranges', '150 px / 260 px', 'Queue detection and approach detection (about 45 m and 78 m).'],
    ['ω, σ, λ, κ, E', '1.0, 2.0, 0.6, 0.5, 60', 'Payoff weights.'],
    ['Free speed, acceleration, braking', '45, 16, 26 px/s (px/s²)', 'Vehicle dynamics.'],
    ['Turning probability', '0.25', 'Share of vehicles that turn at a junction.'],
    ['Best-response cap', '8 rounds', 'Cut-off for cycling dynamics.'],
    ['Idle fuel, CO₂ factor', '0.8 L/h, 2.31 kg/L', 'Assumptions for the illustrative emissions estimate.'],
  ], 'Parameters'),
];

/* ---------------------------------------------------------------- document */
const contents = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 280 }, children: [bold('Table of Contents', { size: 32 })] }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
];
const doc = new Document({
  creator: 'Team G2', title: TITLE, description: 'Data Science CEP report, Team G2',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: L.FONT, size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: L.FONT, size: 32, bold: true }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: L.FONT, size: 28, bold: true }, paragraph: { outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: L.FONT, size: 24, bold: true }, paragraph: { outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: ['bul'].map(ref => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }))
      .concat(['num', 'num1', 'num2'].map(ref => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })))
  },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: [...cover, new Paragraph({ children: [new L.D.PageBreak()] }), ...titlePage].flat(Infinity) },
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1300, left: 1440, right: 1440 }, pageNumbers: { start: 1 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t('Traffic Signal Game Theory · Team G2 · Data Science CEP · ', { size: 18 }), new TextRun({ children: [PageNumber.CURRENT], font: L.FONT, size: 18 })] })] }) },
      children: [...ack, ...abstract, ...contents, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...ch8, ...ch9, ...ch10, ...ch11, ...refs, ...appA].flat(Infinity)
    }
  ]
});
Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, 'Traffic_Signal_Game_Theory_Report.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, (buf.length / 1e6).toFixed(1) + ' MB');
});
