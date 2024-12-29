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

	update(deltaSeconds) {
		for (const neuron of this.neurons) {
			neuron.update(deltaSeconds);
		}
		for (const synapse of this.neurons.flatMap((neuron) => neuron.axons)) {
			synapse.update(deltaSeconds);
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
					neuron.newPulse();
					return;
				}
				// Får alle nevroner i gruppen til å fyre
				for (const neuron of app.network.neurons) {
					if (!neuron.group) continue;
					neuron.newPulse();
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
							neuron.newPulse();
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
				app.network.neurons.push(new Neuron(mouseX, mouseY));
			},
			rclick: () => {
				const neuron = new Neuron(mouseX, mouseY);
				neuron.spontaneousActivity = true;
				app.network.neurons.push(neuron);
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
				if (neuron == null) {
					this.axonNeuron = null;
					return;
				}
				if (this.axonNeuron == null) {
					this.axonNeuron = neuron;
				} else if (neuron !== this.axonNeuron) {
					this.axonNeuron.newSynapse(neuron, true, false);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.axonNeuron) return;
				this.axonNeuron.newSynapse(neuron, true, false);
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
					this.axonNeuron.newSynapse(neuron, false, false);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.axonNeuron) return;
				this.axonNeuron.newSynapse(neuron, false, false);
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
					this.axonNeuron.newSynapse(neuron, true, true);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.axonNeuron) return;
				this.axonNeuron.newSynapse(neuron, true, true);
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
					this.axonNeuron.newSynapse(neuron, false, true);
					this.axonNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.axonNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.axonNeuron) return;
				this.axonNeuron.newSynapse(neuron, false, true);
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
				let neuron = mouseOverNeuron();
				if (neuron != null) {
					//sletter nevron
					neuron.delete();
					neuron = null;
				} else {
					let synapse = mouseOverSynapse();
					if (synapse != null) {
						// sletter synapse
						synapse.delete();
						synapse = null;
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
	constructor(ix, iy) {
		this.x = ix;
		this.y = iy;
		this.potential = 0;
		this.potentialCompletion = 0;
		this.lastPulseTimestamp = -PULSE_LIGHT_DURATION * 1000;

		this.spontaneousActivity = false;
		this.frequency = FREQUENCY_BASE;
		this.frequencyCounter = this.frequency * 60;

		this.axons = [];
		this.dendrites = [];
		this.group = 0;

		this.pulses = [];
	}

	update(deltaSeconds) {
		if (this.spontaneousActivity) {
			this.frequency = Math.max(0, Math.min(FREQUENCY_LIMIT, this.frequency));

			if (this.frequencyCounter < round(1 / (this.frequency * deltaSeconds))) {
				this.frequencyCounter++;
			} else {
				this.newPulse();
				this.frequencyCounter = 0;
			}

			this.frequency = linearConverge(
				this.frequency,
				FREQUENCY_BASE,
				FREQUENCY_DECAY * deltaSeconds,
			);
		} else {
			this.potential = Math.max(
				-POTENTIAL_LIMIT,
				Math.min(POTENTIAL_LIMIT, this.potential),
			);

			this.potential = linearConverge(
				this.potential,
				0,
				POTENTIAL_DECAY * deltaSeconds,
			);

			this.potentialCompletion = constrain(
				this.potential / POTENTIAL_THRESHOLD,
				-1,
				1,
			);
		}
	}

	fire(excitatory) {
		if (this.spontaneousActivity) {
			this.frequency += excitatory ? FREQUENCY_IMPULSE : -FREQUENCY_IMPULSE;
			return;
		}

		this.potential += excitatory ? POTENTIAL_IMPULSE : -POTENTIAL_IMPULSE;

		// Fyrer aksonet om potensialet er over grensepotensialet
		if (this.potential >= POTENTIAL_THRESHOLD) {
			// fyrer
			this.newPulse();
			this.potential = -POTENTIAL_DECAY;
		}
	}

	display() {
		// Tegner synapser
		for (const synapse of this.axons) {
			synapse.display();
		}

		// Tegner seg selv
		if (
			!this.spontaneousActivity &&
			millis() - this.lastPulseTimestamp <= PULSE_LIGHT_DURATION * 1000
		) {
			stroke(240, 240, 0);
		} else {
			stroke(240);
		}

		fill(20);
		ellipse(this.x, this.y, NEURON_RADIUS * 2, NEURON_RADIUS * 2);

		if (this.spontaneousActivity) {
			fill(240);
			noStroke();
			textAlign(CENTER, CENTER);
			textSize(10);
			text(`${this.frequency.toPrecision(2)}Hz`, this.x, this.y);
			textAlign(LEFT, TOP);
			textSize(12);
			return;
		}
		//Tegner indre sirkel som indikerer potensial-nivå
		noStroke();
		if (this.potential > 0) {
			fill(0, 120, 0);
		} else if (this.potential < 0) {
			fill(120, 0, 0);
		}
		const completionRadius =
			2 * NEURON_RADIUS * Math.abs(this.potentialCompletion);
		ellipse(this.x, this.y, completionRadius, completionRadius);

		if (!this.group) return;
		// Tegner sirkel som indikerer at nevronet er i en gruppe
		stroke(240, 240, 0);
		noFill();
		ellipse(this.x, this.y, NEURON_RADIUS * 4, NEURON_RADIUS * 4);
	}

	newPulse() {
		for (const synapse of this.axons) {
			synapse.addPulse();
		}
		this.lastPulseTimestamp = millis();
	}

	isFiring() {
		if (!this.axons.length) return false;
		return this.axons.some((synapse) => synapse.pulses.length > 0);
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
		for (const synapse of this.axons) {
			synapse.updateNeuronPosition();
		}
		for (const synapse of this.dendrites) {
			synapse.updateNeuronPosition();
		}
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

	delete() {
		//fjerner alle aksoner
		for (const synapse of this.axons) {
			synapse.delete();
		}
		// fjerner alle dendritter
		for (const synapse of this.dendrites) {
			synapse.delete();
		}
		// Fjerner seg selv fra listen med nevroner
		app.network.neurons = app.network.neurons.filter(
			(neuron) => neuron !== this,
		);
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

	distance = 0;
	normalizedX = 0;
	normalizedY = 0;

	/** @type {number[]} */
	pulses = [];

	constructor(axon, dendrite, isExcitatory, isLengthDependent) {
		this.axon = axon;
		this.dendrite = dendrite;
		this.isExcitatory = isExcitatory;
		this.isLengthDependent = isLengthDependent;

		this.updateNeuronPosition();
	}

	addPulse() {
		this.pulses.push(0);
	}

	update(deltaSeconds) {
		const increment =
			deltaSeconds /
			(this.isLengthDependent
				? this.distance / PULSE_LENGTH_INDEPENDENT_SPEED
				: PULSE_DURATION);

		this.pulses = this.pulses
			.filter((pulse) => {
				if ((this.isLengthDependent && this.distance <= 0) || pulse >= 1) {
					this.dendrite.fire(this.isExcitatory);
					return false;
				}
				return true;
			})
			.map((pulse) => pulse + increment);
	}

	updateNeuronPosition() {
		this.distance = dist(
			this.axon.x,
			this.axon.y,
			this.dendrite.x,
			this.dendrite.y,
		);
		this.normalizedX = (this.dendrite.x - this.axon.x) / this.distance;
		this.normalizedY = (this.dendrite.y - this.axon.y) / this.distance;
		this.distance -= NEURON_RADIUS * 2;
	}

	display() {
		const paddedRadius = NEURON_RADIUS * 1.25;

		if (this.isExcitatory) {
			stroke(0, 170, 0);
		} else {
			stroke(190, 0, 0);
		}
		noFill();

		if (this.distance <= 0) return;
		if (this.isLengthDependent) {
			line(
				this.axon.x + this.normalizedX * paddedRadius,
				this.axon.y + this.normalizedY * paddedRadius,
				this.dendrite.x - this.normalizedX * paddedRadius,
				this.dendrite.y - this.normalizedY * paddedRadius,
			);
		} else {
			for (
				let i = NEURON_RADIUS;
				i < this.distance + NEURON_RADIUS * 0.75;
				i += 6
			) {
				point(
					this.axon.x + this.normalizedX * i,
					this.axon.y + this.normalizedY * i,
				);
			}
		}
		line(
			this.dendrite.x - this.normalizedX * paddedRadius + this.normalizedY * 6,
			this.dendrite.y - this.normalizedY * paddedRadius - this.normalizedX * 6,
			this.dendrite.x - this.normalizedX * paddedRadius - this.normalizedY * 6,
			this.dendrite.y - this.normalizedY * paddedRadius + this.normalizedX * 6,
		);

		// Tegner pulsense som beveger seg over synapsen
		stroke(240, 240, 0);
		for (const pulse of this.pulses) {
			line(
				this.axon.x +
					this.normalizedX * (NEURON_RADIUS + pulse * this.distance) +
					this.normalizedY * 5,
				this.axon.y +
					this.normalizedY * (NEURON_RADIUS + pulse * this.distance) -
					this.normalizedX * 5,
				this.axon.x +
					this.normalizedX * (NEURON_RADIUS + pulse * this.distance) -
					this.normalizedY * 5,
				this.axon.y +
					this.normalizedY * (NEURON_RADIUS + pulse * this.distance) +
					this.normalizedX * 5,
			);
		}
	}

	delete() {
		this.axon.axons = this.axon.axons.filter((s) => s !== this);
		this.axon.dendrites = this.axon.dendrites.filter((s) => s !== this);
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
		app.network.neurons
			.flatMap((neuron) => neuron.axons)
			.find((synapse) =>
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

	for (const neuron of app.network.neurons) {
		neuron.display();
	}
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
