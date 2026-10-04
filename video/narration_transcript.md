# Narration transcript (what the video says, with timestamps)

Use this to rehearse: say each paragraph while doing what the bracketed action describes on screen.


## Opening

**[0:02]** Hello everyone. We are Team G2, and this is our Data Science complex engineering problem: Smart Traffic Signal Optimization using Game Theory. It supports Sustainable Development Goal eleven, sustainable cities, in particular safe and sustainable transport. In this video I will explain the idea, show the live system, and show what the data says, including what it does not say.


## The problem

**[0:32]** Let us start with the problem. Most traffic signals run on a fixed timer: twenty seconds for one road, twenty for the other, whatever the traffic.

**[0:44]** The timer cannot see that one road is empty, so cars wait at red in front of an empty cross street. And a signal that only looks at its own queue can push cars into a neighbouring junction that is already full, which then blocks that junction too. We call this spillback.

**[1:05]** And an ambulance has no way to ask for priority. It waits in the queue like everyone else.


## The idea: signals as players

**[1:13]** Here is our idea. Treat every junction as a player in a game. Each signal controls only its own phase, but its result depends on what its neighbours do. That is exactly the structure of a non-cooperative game. The players are the junctions: four on a two by two grid, nine on a three by three grid.

**[1:38]** Each player has two strategies: give the next green to North-South, or to East-West.

**[1:46]** Each player has a payoff, which is a score. It gains for every vehicle it can clear, and for waiting time it relieves. It loses a little for switching, because switching wastes time. It loses for pushing cars into a neighbour whose road is already full; that is the spillback penalty, lambda. And it gains a bonus for matching a neighbour that is sending it a platoon of cars; that is kappa.

**[2:15]** The solution concept is a Nash equilibrium: a set of choices where no junction can do better by changing only its own choice. That is stable, because nobody has a reason to deviate.


## How the equilibrium is found

**[2:29]** How do we find that equilibrium every second? Each junction reads its detectors: how many vehicles are queued, how many are approaching, how long they have waited, and whether an ambulance or a blockage is there.

**[2:45]** Then, one after another, each junction picks the phase with the higher payoff, given what the others are currently doing. This is called best-response dynamics.

**[2:58]** We repeat until a full round changes nothing. That is a pure Nash equilibrium. In our experiments this happened in every single decision, usually within two rounds.

**[3:12]** Then a safety layer applies: yellow two and a half seconds, all-red one second, minimum green eight seconds, maximum forty-five. Conflicting greens are impossible. We compare against two baselines: a fixed timer, and a selfish controller, which is the same game with the neighbour terms switched off.


## Live simulation

**[3:35]** Now the live system. This is a traffic simulator with cars, bikes, auto-rickshaws and buses, driving on the left. The traffic lights are the players. The red tint shows queues, and the blue band is a green corridor, where two neighbouring junctions are serving the same road.

**[3:57]** Below the map, the three controllers run side by side in the background, on exactly the same vehicle arrivals, so the comparison is fair. The map shows whichever one I select. After a minute or two you can see the fixed timer in grey has the highest delay, and the adaptive controllers are lower.

**[4:20]** The tiles show average delay, vehicles stopped, throughput, and how often the equilibrium was reached. Idling time and a carbon dioxide figure are there too, but that figure is only an illustration.

**[4:36]** The signal timeline shows every junction's phases. Here is the fixed timer: a regular pattern. Now the Nash controller: the greens stretch and shrink to follow the queues.

**[4:50]** Clicking a junction opens the inspector: the queue on every approach, the payoff of each action, and the reason for the decision.


## Game model and equilibrium analysis

**[5:00]** The Game model tab shows the game itself, live. Here is the payoff formula, and sliders to tune the weights while the simulation is running.

**[5:11]** This is the payoff matrix for two neighbouring junctions. Each cell shows both payoffs. The underlined number is the best response to what the other player does. The shaded cell, where both are underlined, is the Nash equilibrium.

**[5:30]** Below it are the best-response rounds: junctions take turns, and by the second round nobody wants to change.

**[5:38]** New in version two is the equilibrium analysis. Every second the simulator lists all the joint plans, sixteen for four junctions, checks which are Nash equilibria, and finds the plan with the highest total payoff. The highlighted row is the plan the controller chose.

**[5:59]** Over ten seeds, the dynamics reached an equilibrium every time, there was almost always exactly one, and it captured ninety-seven to ninety-eight percent of the best possible joint payoff. It was the very best plan in fifty-seven to eighty-four percent of decisions. That gap is the price of anarchy of this game, and we measure it instead of assuming it.


## Dynamic features: blocked road and ambulance

**[6:26]** Now let us make it dynamic. I go back to the simulation, select junction J2, and block its approach from the west for a hundred and twenty seconds, like an accident or road work.

**[6:39]** The striped barrier on the map is the blockage, with a countdown. The adaptive controllers see it through their detectors, so they stop giving that approach green, and the upstream junctions hold traffic back. The fixed timer cannot see it, and keeps giving green to a stop line nobody can cross. The event log records it.

**[7:04]** Next, an ambulance. I send one from the west on row one. It has flashing lights and a red halo. Under preemption, a large priority term is added to the payoff of its road, and the minimum green is cut to three seconds. Yellow and all-red are never skipped, so it stays safe.

**[7:27]** The event log shows junctions pre-empting for the ambulance. One run is noisy, so I will send a few more, on different roads, to get a mean.

**[7:51]** The panel shows the latest and the mean trip time for each controller. Fixed-time is slower, because it cannot respond. Now I switch preemption off and send one more. A single run is noisy, so the fair comparison is the average over many seeds, which we will see in the benchmark: about fifty seconds for fixed-time, forty-three for the adaptive controller without preemption, and thirty-two with it.


## Benchmark, sweep, history

**[8:21]** To make this rigorous, we use the Benchmark tab. It runs all three controllers on the same traffic, for ten seeds of fifteen simulated minutes. For each seed, every controller sees identical arrivals; this is called common random numbers. We inject blocked roads and ambulances, the same events for every controller, and compare with a paired t-test.

**[8:49]** Here is the result. The Nash controller lowers average delay by about a quarter against the fixed timer, with p below zero point zero zero one, and it shortens the ambulance trip. Delay counts every vehicle, including those still waiting to enter, so a controller cannot look good by leaving cars outside.

**[9:13]** But look at the last column. Nash against selfish: the difference is small and not statistically significant. We will come back to that, because it is the most important honest finding.

**[9:28]** The lambda sweep varies the spillback penalty. It stays flat for small values, and rises when lambda is large, because the junctions become over-cautious and hold traffic back to protect their neighbours.

**[9:44]** Every run is saved in the history, and can be downloaded as CSV or JSON, so the numbers are reproducible.


## Results and honesty

**[9:53]** Across six traffic scenarios, the adaptive controllers cut average delay by eight to sixty-three percent against the fixed timer, and every paired test has p below zero point zero zero one. The gain is largest when one direction is much busier, and smallest under heavy load, where the whole network is near saturation. With preemption, the ambulance trip falls from about fifty seconds to about thirty-two.

**[10:24]** Now what we did not find. The coupled Nash game was not significantly better than the selfish adaptive controller in any scenario. So most of the gain comes from reacting to queues at all. What the game formulation gives us is an explainable decision rule, an equilibrium we can verify by enumeration, and a natural way to add emergency priority and incidents. And all of this is on synthetic demand, in a model not yet calibrated against real data.


## Complex problem attributes and SDG

**[10:59]** This is a complex engineering problem. It needs game theory, traffic modelling, statistics and web engineering together. Its requirements conflict: a junction's own benefit against the network's, ambulance priority against everyone else's wait. There is no standard solution, the stakeholders have different needs, and the parts are strongly interdependent. The report maps all of this to the complex problem attributes, W P one to W P seven, and to Sustainable Development Goal eleven.


## Summary

**[11:37]** To summarise: signals as players in a game, a Nash equilibrium of their payoffs every second, better than a fixed timer by eight to sixty-three percent in simulation, faster for ambulances, resilient to blocked roads, and honest about what the data does and does not show. It is built with JavaScript and the browser canvas, tested with Node, and the code, report and this script are on GitHub. Thank you. We are happy to take your questions.

