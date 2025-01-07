const POTENTIAL_THRESHOLD = 100;
const POTENTIAL_IMPULSE = 100;
const POTENTIAL_LIMIT = 200;
const POTENTIAL_DECAY = 60;

const FREQUENCY_BASE = 2; // Hz
const FREQUENCY_DECAY = 1; // Hz/s
const FREQUENCY_IMPULSE = 1;
const FREQUENCY_LIMIT = 10;

const PULSE_DURATION = 1; // s
const PULSE_LENGTH_INDEPENDENT_SPEED = 500; // pixels/s
const PULSE_LIGHT_DURATION = 2; // s

const NEURON_RADIUS = 20;
const TOOL_BANNER_HEIGHT = 40;

function linearConverge(current, target, decay) {
	const delta = target - current;
	const deltaSign = Math.sign(delta);
	return target - Math.max(0, Math.abs(delta) - decay) * deltaSign;
}

class Network {
	/** @type {Neuron[]} */
	neurons = [];
	/** @type {Synapse[]} */
	synapses = [];

	// Network elements creation/deletion

	addNeuron(x, y, isSpontaneouslyActive) {
		this.neurons.push(new Neuron(x, y, isSpontaneouslyActive));
	}

	deleteNeuron(neuronToBeDeleted) {
		this.synapses = this.synapses.filter(
			(synapse) =>
				synapse.axon !== neuronToBeDeleted &&
				synapse.dendrite !== neuronToBeDeleted,
		);
		this.neurons = this.neurons.filter(
			(neuron) => neuron !== neuronToBeDeleted,
		);
	}

	addSynapse(axonNeuron, dendriteNeuron, isExcitatory, isLengthDependent) {
		if (!(axonNeuron instanceof Neuron) || !(dendriteNeuron instanceof Neuron))
			return;
		if (axonNeuron === dendriteNeuron) return;
		this.synapses.push(
			new Synapse(axonNeuron, dendriteNeuron, isExcitatory, isLengthDependent),
		);
	}

	deleteSynapse(synapseToBeDeleted) {
		this.synapses = this.synapses.filter(
			(synapse) => synapse !== synapseToBeDeleted,
		);
	}

	// Network updates

	exciteNeuron(neuron, isExcitatory) {
		if (neuron.spontaneousActivity) {
			neuron.frequency += isExcitatory ? FREQUENCY_IMPULSE : -FREQUENCY_IMPULSE;
			return;
		}

		neuron.potential += isExcitatory ? POTENTIAL_IMPULSE : -POTENTIAL_IMPULSE;

		if (neuron.potential >= POTENTIAL_THRESHOLD) {
			this.fireNeuron(neuron);
			neuron.potential = -POTENTIAL_DECAY;
		}
	}

	fireNeuron(neuron) {
		const connectedSynapses = this.synapses.filter(
			(synapse) => synapse.axon === neuron,
		);
		for (const synapse of connectedSynapses) {
			synapse.addPulse();
		}
		neuron.secondsSinceLastFire = 0;
	}

	update(deltaSeconds) {
		for (const neuron of this.neurons) {
			neuron.secondsSinceLastFire += deltaSeconds;
			if (neuron.spontaneousActivity) {
				neuron.frequency = Math.max(
					0,
					Math.min(FREQUENCY_LIMIT, neuron.frequency),
				);

				if (neuron.secondsSinceLastFire >= 1 / neuron.frequency) {
					this.fireNeuron(neuron);
				}

				neuron.frequency = linearConverge(
					neuron.frequency,
					FREQUENCY_BASE,
					FREQUENCY_DECAY * deltaSeconds,
				);
			} else {
				neuron.potential = Math.max(
					-POTENTIAL_LIMIT,
					Math.min(POTENTIAL_LIMIT, neuron.potential),
				);

				neuron.potential = linearConverge(
					neuron.potential,
					0,
					POTENTIAL_DECAY * deltaSeconds,
				);

				neuron.potentialCompletion = constrain(
					neuron.potential / POTENTIAL_THRESHOLD,
					-1,
					1,
				);
			}
		}
		for (const synapse of this.synapses) {
			const increment =
				deltaSeconds /
				(synapse.isLengthDependent
					? synapse.length() / PULSE_LENGTH_INDEPENDENT_SPEED
					: PULSE_DURATION);

			synapse.pulses = synapse.pulses
				.filter((pulse) => {
					if (
						(synapse.isLengthDependent && synapse.length() <= 0) ||
						pulse >= 1
					) {
						this.exciteNeuron(synapse.dendrite, synapse.isExcitatory);
						return false;
					}
					return true;
				})
				.map((pulse) => pulse + increment);
		}
	}

	// View

	render() {
		for (const synapse of this.synapses) {
			const paddedRadius = NEURON_RADIUS * 1.25;
			const nx = (synapse.dendrite.x - synapse.axon.x) / synapse.length();
			const ny = (synapse.dendrite.y - synapse.axon.y) / synapse.length();

			if (synapse.isExcitatory) {
				stroke(0, 170, 0);
			} else {
				stroke(190, 0, 0);
			}
			noFill();

			if (synapse.length() <= NEURON_RADIUS * 2) continue;
			if (synapse.isLengthDependent) {
				line(
					synapse.axon.x + nx * paddedRadius,
					synapse.axon.y + ny * paddedRadius,
					synapse.dendrite.x - nx * paddedRadius,
					synapse.dendrite.y - ny * paddedRadius,
				);
			} else {
				for (
					let i = paddedRadius;
					i < synapse.length() - paddedRadius;
					i += 6
				) {
					point(synapse.axon.x + nx * i, synapse.axon.y + ny * i);
				}
			}
			line(
				synapse.dendrite.x - nx * paddedRadius + ny * 6,
				synapse.dendrite.y - ny * paddedRadius - nx * 6,
				synapse.dendrite.x - nx * paddedRadius - ny * 6,
				synapse.dendrite.y - ny * paddedRadius + nx * 6,
			);

			stroke(240, 240, 0);
			for (const pulse of synapse.pulses) {
				const progression =
					paddedRadius + pulse * (synapse.length() - 2 * paddedRadius);
				line(
					synapse.axon.x + nx * progression + ny * 5,
					synapse.axon.y + ny * progression - nx * 5,
					synapse.axon.x + nx * progression - ny * 5,
					synapse.axon.y + ny * progression + nx * 5,
				);
			}
		}

		for (const neuron of this.neurons) {
			if (
				!neuron.spontaneousActivity &&
				neuron.secondsSinceLastFire <= PULSE_LIGHT_DURATION
			) {
				stroke(240, 240, 0);
			} else {
				stroke(240);
			}

			fill(20);
			ellipse(neuron.x, neuron.y, NEURON_RADIUS * 2, NEURON_RADIUS * 2);

			if (neuron.spontaneousActivity) {
				fill(240);
				noStroke();
				textAlign(CENTER, CENTER);
				textSize(10);
				text(`${neuron.frequency.toPrecision(2)}Hz`, neuron.x, neuron.y);
				textAlign(LEFT, TOP);
				textSize(12);
				continue;
			}
			//Tegner indre sirkel som indikerer potensial-nivå
			noStroke();
			if (neuron.potential > 0) {
				fill(0, 120, 0);
			} else if (neuron.potential < 0) {
				fill(120, 0, 0);
			}
			const completionRadius =
				2 * NEURON_RADIUS * Math.abs(neuron.potentialCompletion);
			ellipse(neuron.x, neuron.y, completionRadius, completionRadius);

			if (!neuron.group) continue;
			// Tegner sirkel som indikerer at nevronet er i en gruppe
			stroke(240, 240, 0);
			noFill();
			ellipse(neuron.x, neuron.y, NEURON_RADIUS * 4, NEURON_RADIUS * 4);
		}
	}
}

const app = {
	network: new Network(),
	workspace: undefined,
	toolBanner: undefined,

	tools: [
		{
			// Move tool
			name: "Move tool",
			info: "Click and drag a neuron to move it",
			activate: function () {
				this.neuron = null;
				this.dragging = false;
			},
			lclick: function () {
				this.neuron = mouseOverNeuron();
				if (this.neuron == null) return;
				this.dragging = true;
				this.offsetX = mouseX - this.neuron.x;
				this.offsetY = mouseY - this.neuron.y;
			},
			rclick: () => {},
			drag: function () {
				if (!this.dragging) return;
				this.neuron.move(mouseX - this.offsetX, mouseY - this.offsetY);
			},
			release: function () {
				if (!this.dragging) return;
				this.neuron = null;
				this.dragging = false;
			},
			display: () => {},
			inactiveDisplay: () => {},
			img: "move.png",
			buttonElement: undefined,

			neuron: null,
			dragging: false,
			offsetX: 0,
			offsetY: 0,
		},
		{
			// Excite tool
			name: "Excite tool",
			info: "Left click a neuron to make it fire.\nRight click a neuron to include/remove it from firing group.\nWhen one neuron in firing group fires, all neurons in fire group fires.",
			activate: () => {},
			lclick: () => {
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (!neuron.group) {
					app.network.fireNeuron(neuron);
					return;
				}
				// Får alle nevroner i gruppen til å fyre
				for (const neuron of app.network.neurons) {
					if (!neuron.group) continue;
					app.network.fireNeuron(neuron);
				}
			},
			rclick: () => {
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron.spontaneousActivity) return;

				if (neuron.group) {
					neuron.group = 0;
				} else {
					neuron.group = 1;
				}
			},
			drag: () => {},
			release: () => {},
			display: () => {},
			inactiveDisplay: () => {},
			img: "excite.png",
			buttonElement: undefined,
		},
		{
			// Flashlight tool
			name: "Flashlight tool",
			info: "Left click to make all neurons within range fire.",
			activate: () => {},
			lclick: function () {
				this.pressing = true;
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				this.pressing = false;
			},
			display: function () {
				noStroke();
				if (!this.pressing) {
					fill(240, 240, 0, 40);
					return;
				}

				if (this.fireCounter < 60 * this.firePeriod) {
					++this.fireCounter;
				} else {
					for (const neuron of app.network.neurons) {
						if (
							pointOverCircle(neuron.x, neuron.y, mouseX, mouseY, this.radius)
						) {
							app.network.fireNeuron(neuron);
						}
					}
					this.fireCounter = 0;
				}
				fill(240, 240, 0, 10);

				ellipse(mouseX, mouseY, this.radius * 2, this.radius * 2);
			},
			inactiveDisplay: () => {},
			img: "flashlight.png",
			buttonElement: undefined,

			pressing: false,
			radius: 100,
			firePeriod: 0.1,
			fireCounter: 0,
		},
		{
			// Neuron tool
			name: "Neuron tool",
			info: "Left click to create a neuron.\nRight click to create a neuron with a base frequency.",
			activate: () => {},
			lclick: () => {
				app.network.addNeuron(mouseX, mouseY, false);
			},
			rclick: () => {
				app.network.addNeuron(mouseX, mouseY, true);
			},
			drag: () => {},
			release: () => {},
			display: () => {
				noFill();
				stroke(120);
				ellipse(mouseX, mouseY, NEURON_RADIUS * 2, NEURON_RADIUS * 2);
			},
			inactiveDisplay: () => {},
			img: "neuron.png",
			buttonElement: undefined,
		},
		{
			// Excitatory synapse tool
			name: "Length independent excitatory synapse tool",
			info: "Click a neuron to start making a synapse, and then click another one to complete it.",
			activate: function () {
				this.axonNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (this.axonNeuron == null) {
					this.axonNeuron = neuron;
					return;
				}
				app.network.addSynapse(this.axonNeuron, neuron, true, false);
				this.axonNeuron = null;
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron === this.axonNeuron) return;
				app.network.addSynapse(this.axonNeuron, neuron, true, false);
				this.axonNeuron = null;
			},
			display: function () {
				stroke(0, 240, 0);
				if (this.axonNeuron == null) return;
				const distance = dist(
					this.axonNeuron.x,
					this.axonNeuron.y,
					mouseX,
					mouseY,
				);
				const normalizedX = (mouseX - this.axonNeuron.x) / distance;
				const normalizedY = (mouseY - this.axonNeuron.y) / distance;
				for (let i = 0; i < distance; i += 6) {
					point(
						this.axonNeuron.x + normalizedX * i,
						this.axonNeuron.y + normalizedY * i,
					);
				}
			},
			inactiveDisplay: () => {},
			img: "excitatory_independent.png",
			buttonElement: undefined,

			axonNeuron: null,
		},
		{
			// Inhibitory synapse tool
			name: "Length independent inhibitory synapse tool",
			info: "Click a neuron to start making an synapse, and then click another one to complete it.",
			activate: function () {
				this.axonNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.axonNeuron = null;
					return;
				}
				if (this.axonNeuron == null) {
					this.axonNeuron = neuron;
				} else if (neuron !== this.axonNeuron) {
					app.network.addSynapse(this.axonNeuron, neuron, false, false);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron === this.axonNeuron) return;
				app.network.addSynapse(this.axonNeuron, neuron, false, false);
				this.axonNeuron = null;
			},
			display: function () {
				stroke(190, 0, 0);
				if (this.axonNeuron == null) return;
				const distance = dist(
					this.axonNeuron.x,
					this.axonNeuron.y,
					mouseX,
					mouseY,
				);
				const normalizedX = (mouseX - this.axonNeuron.x) / distance;
				const normalizedY = (mouseY - this.axonNeuron.y) / distance;
				for (let i = 0; i < distance; i += 6) {
					point(
						this.axonNeuron.x + normalizedX * i,
						this.axonNeuron.y + normalizedY * i,
					);
				}
			},
			inactiveDisplay: () => {},
			img: "inhibitory_independent.png",
			buttonElement: undefined,

			axonNeuron: null,
		},
		{
			// Excitatory dependent synapse tool
			name: "Excitatory synapse tool",
			info: "Click a neuron to start making a synapse, and then click another one to complete it.",
			activate: function () {
				this.axonNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.axonNeuron = null;
					return;
				}
				if (this.axonNeuron == null) {
					this.axonNeuron = neuron;
				} else if (neuron !== this.axonNeuron) {
					app.network.addSynapse(this.axonNeuron, neuron, true, true);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron === this.axonNeuron) return;
				app.network.addSynapse(this.axonNeuron, neuron, true, true);
				this.axonNeuron = null;
			},
			display: function () {
				if (this.axonNeuron == null) return;
				stroke(0, 240, 0);
				line(this.axonNeuron.x, this.axonNeuron.y, mouseX, mouseY);
			},
			inactiveDisplay: () => {},
			img: "excitatory_dependent.png",
			buttonElement: undefined,

			axonNeuron: null,
		},
		{
			// Inhibiory dependent synapse tool
			name: "Inhibitory synapse tool",
			info: "Click a neuron to start making a synapse, and then click another one to complete it.",
			activate: function () {
				this.axonNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.axonNeuron = null;
					return;
				}
				if (this.axonNeuron == null) {
					this.axonNeuron = neuron;
				} else if (neuron !== this.axonNeuron) {
					app.network.addSynapse(this.axonNeuron, neuron, false, true);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron === this.axonNeuron) return;
				app.network.addSynapse(this.axonNeuron, neuron, false, true);
				this.axonNeuron = null;
			},
			display: function () {
				if (this.axonNeuron == null) return;
				stroke(240, 0, 0);
				line(this.axonNeuron.x, this.axonNeuron.y, mouseX, mouseY);
			},
			inactiveDisplay: () => {},
			img: "inhibitory_dependent.png",
			buttonElement: undefined,

			axonNeuron: null,
		},
		{
			// Delete tool
			name: "Delete tool",
			info: "Click neurons or synapses to delete them.",
			activate: () => {},
			lclick: () => {
				const neuron = mouseOverNeuron();
				if (neuron != null) {
					app.network.deleteNeuron(neuron);
				} else {
					const synapse = mouseOverSynapse();
					if (synapse != null) {
						app.network.deleteSynapse(synapse);
					}
				}
			},
			rclick: () => {},
			drag: () => {},
			release: () => {},
			display: () => {
				const neuron = mouseOverNeuron();
				if (neuron != null) {
					noStroke();
					fill(240, 0, 0, 50);
					ellipse(
						neuron.x,
						neuron.y,
						NEURON_RADIUS * 2 + 20,
						NEURON_RADIUS * 2 + 20,
					);
				} else {
					const synapse = mouseOverSynapse();
					if (synapse != null) {
						strokeWeight(20);
						stroke(240, 0, 0, 50);
						line(
							synapse.axon.x,
							synapse.axon.y,
							synapse.dendrite.x,
							synapse.dendrite.y,
						);
						strokeWeight(1);
					}
				}
			},
			inactiveDisplay: () => {},
			img: "delete.png",
			buttonElement: undefined,
		},
	],
	tool: 0,
	switchTool: function (tool) {
		if (tool < 0 || tool >= this.tools.length) return false;
		if (tool === this.tool) return false;

		this.tools[this.tool].buttonElement.removeClass("selected");
		this.tools[this.tool].buttonElement.addClass("unselected");
		this.tool = tool;
		this.tools[this.tool].buttonElement.removeClass("unselected");
		this.tools[this.tool].buttonElement.addClass("selected");
		this.tools[this.tool].activate();
		return true;
	},
};

class Neuron {
	constructor(ix, iy, isSpontaneouslyActive) {
		this.x = ix;
		this.y = iy;
		this.potential = 0;
		this.potentialCompletion = 0;
		this.secondsSinceLastFire = PULSE_LIGHT_DURATION;

		this.spontaneousActivity = isSpontaneouslyActive;
		this.frequency = FREQUENCY_BASE;

		this.group = 0;
	}

	constrainPosition() {
		if (this.x < 0) {
			this.x = 0;
		}
		if (this.x > window.innerWidth) {
			this.x = window.innerWidth;
		}
		if (this.y < 0) {
			this.y = 0;
		}
		if (this.y > window.innerHeight) {
			this.y = window.innerHeight;
		}
	}

	move(newX, newY) {
		this.x = newX;
		this.y = newY;
		this.constrainPosition();
	}

	newSynapse(dendriteNeuron, isExcitatory, isLengthDependent) {
		const newSynapse = new Synapse(
			this,
			dendriteNeuron,
			isExcitatory,
			isLengthDependent,
		);
		this.axons.push(newSynapse);
		dendriteNeuron.dendrites.push(newSynapse);
	}
}

class Synapse {
	/** @type {Neuron} */
	axon;
	/** @type {Neuron} */
	dendrite;
	/** @type {boolean} */
	isExcitatory;
	/** @type {boolean} */
	isLengthDependent;

	/** @type {number[]} */
	pulses = [];

	constructor(axon, dendrite, isExcitatory, isLengthDependent) {
		this.axon = axon;
		this.dendrite = dendrite;
		this.isExcitatory = isExcitatory;
		this.isLengthDependent = isLengthDependent;
	}

	length() {
		return Math.hypot(
			this.dendrite.y - this.axon.y,
			this.dendrite.x - this.axon.x,
		);
	}

	addPulse() {
		this.pulses.push(0);
	}

	update(deltaSeconds) {
		const increment =
			deltaSeconds /
			(this.isLengthDependent
				? this.length() / PULSE_LENGTH_INDEPENDENT_SPEED
				: PULSE_DURATION);

		this.pulses = this.pulses
			.filter((pulse) => {
				if ((this.isLengthDependent && this.length() <= 0) || pulse >= 1) {
					this.dendrite.fire(this.isExcitatory);
					return false;
				}
				return true;
			})
			.map((pulse) => pulse + increment);
	}
}

function pointOverCircle(pointX, pointY, circleX, circleY, circleRadius) {
	return sq(pointX - circleX) + sq(pointY - circleY) <= sq(circleRadius);
}

function pointOverLine(
	lineStartX,
	lineStartY,
	lineEndX,
	lineEndY,
	lineThickness,
	pointX,
	pointY,
) {
	const lineAngle = atan2(lineEndY - lineStartY, lineEndX - lineStartX);
	const pointAngle = atan2(pointY - lineStartY, pointX - lineStartX);
	const lineLength = dist(lineStartX, lineStartY, lineEndX, lineEndY);
	const pointLength = dist(lineStartX, lineStartY, pointX, pointY);
	const relX = cos(pointAngle - lineAngle) * pointLength;
	const relY = sin(pointAngle - lineAngle) * pointLength;
	const radius = lineThickness / 2;

	const isOverLine =
		relX > radius && abs(relY) < radius && relX < lineLength - radius;
	return isOverLine;
}

function mouseOverNeuron() {
	return (
		app.network.neurons.find((neuron) =>
			pointOverCircle(mouseX, mouseY, neuron.x, neuron.y, NEURON_RADIUS),
		) || null
	);
}

function mouseOverSynapse() {
	return (
		app.network.synapses.find((synapse) =>
			pointOverLine(
				synapse.axon.x,
				synapse.axon.y,
				synapse.dendrite.x,
				synapse.dendrite.y,
				20,
				mouseX,
				mouseY,
			),
		) || null
	);
}

let previousMillis = 0;

function setup() {
	// Skrur av høyreklikk-menyen
	document.body.oncontextmenu = () => false;

	app.workspace = createCanvas(200, 200);
	app.workspace.position(0, TOOL_BANNER_HEIGHT);
	app.toolBanner = createDiv("");
	app.toolBanner.id("toolBanner");
	app.toolBanner.style("height", `${String(TOOL_BANNER_HEIGHT)}px`);

	for (let i = 0; i < app.tools.length; ++i) {
		app.tools[i].buttonElement = createDiv("");
		app.tools[i].buttonElement.position(i * TOOL_BANNER_HEIGHT, 0);
		app.tools[i].buttonElement.size(TOOL_BANNER_HEIGHT, TOOL_BANNER_HEIGHT);
		app.tools[i].buttonElement.parent(app.toolBanner);
		app.tools[i].buttonElement.addClass("toolButton");
		if (i === 0) {
			app.tools[i].buttonElement.addClass("selected");
		} else {
			app.tools[i].buttonElement.addClass("unselected");
		}
		app.tools[i].buttonElement.style(
			"background-image",
			`url(${app.tools[i].img})`,
		);

		app.tools[i].buttonElement.mousePressed(() => {
			app.switchTool(i);
		});
	}
	updateWorkspaceSize();

	textSize(14);
	textAlign(LEFT, TOP);
}

function draw() {
	const deltaSeconds = (millis() - previousMillis) / 1000;
	app.network.update(deltaSeconds);

	background(20);

	app.network.render();

	// Tegner grafikk fra verktøy
	for (let i = 0; i < app.tools.length; ++i) {
		if (i === app.tool) {
			app.tools[i].display();
		} else {
			app.tools[i].inactiveDisplay();
		}
	}

	if (app.tools.length) {
		fill(240);
		noStroke();
		text(app.tools[app.tool].name, 10, 10);
		fill(180);
		text(app.tools[app.tool].info, 10, 28);
	}
	previousMillis = millis();
}

function keyPressed() {
	if (keyCode >= 49 && keyCode <= 57) {
		app.switchTool(keyCode - 49);
	}
}

function mousePressed() {
	if (mouseInsideWorkspace()) {
		if (mouseButton === LEFT) {
			app.tools[app.tool].lclick();
		} else if (mouseButton === RIGHT) {
			app.tools[app.tool].rclick();
		}
	}
}

function mouseReleased() {
	if (mouseInsideWorkspace()) {
		app.tools[app.tool].release();
	}
}

function mouseDragged() {
	if (mouseInsideWorkspace()) {
		app.tools[app.tool].drag();
	}
}

function mouseInsideWorkspace() {
	return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

function updateWorkspaceSize() {
	// sjekker at ingen nevroner havner på utsiden av vinduet
	for (const neuron of app.network.neurons) {
		neuron.constrainPosition();
	}
	resizeCanvas(window.innerWidth, window.innerHeight - TOOL_BANNER_HEIGHT);
}

window.addEventListener("resize", updateWorkspaceSize);
