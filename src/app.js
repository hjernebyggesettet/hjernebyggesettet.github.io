const app = {
	network: {
		// alt som har med det nåværende nevrale nettet å gjøre legges i et objekt
		potentialThreshold: 100,
		potentialPulseIncrement: 80,
		potentialPulseDecrement: 80,
		potentialLimit: 200,

		baseFrequency: 2, // Hz
		frequencyStabilize: 1, // Hz/s
		frequencyIncrement: 1,
		frequencyDecrement: 1,
		frequencyLimit: 10,

		decayMode: "linear",
		exponentialDecay: 2, // Antall sekunder
		linearDecay: 60, // Potensial per sekund

		pulseMode: "synapseLengthIndependent",
		pulseDuration: 1000, // Millisekunder
		pulseDistance: 500, // Hvor mange pixler pulsen skal bevege seg per sekund, gjelder bare når synapsen er lengdeavhengig
		pulseLightDuration: 2000,

		neurons: [],

		previousMillis: 0, // Tellevarabel, holder på antall millisekunder fra forrige frame til nåværende
	},

	workspace: undefined,
	toolBanner: undefined,
	toolBannerHeight: 40,
	toolBannerWidth: 20,

	neuronRadius: 20,
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
				ellipse(mouseX, mouseY, app.neuronRadius * 2, app.neuronRadius * 2);
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
				this.masterNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.masterNeuron = null;
					return;
				}
				if (this.masterNeuron == null) {
					this.masterNeuron = neuron;
				} else if (neuron !== this.masterNeuron) {
					this.masterNeuron.newSynapse(neuron, "excitatory", false);
					this.masterNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.masterNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.masterNeuron) return;
				this.masterNeuron.newSynapse(neuron, "excitatory", false);
				this.masterNeuron = null;
			},
			display: function () {
				stroke(0, 240, 0);
				if (this.masterNeuron == null) return;
				const distance = dist(
					this.masterNeuron.x,
					this.masterNeuron.y,
					mouseX,
					mouseY,
				);
				const normalizedX = (mouseX - this.masterNeuron.x) / distance;
				const normalizedY = (mouseY - this.masterNeuron.y) / distance;
				for (let i = 0; i < distance; i += 6) {
					point(
						this.masterNeuron.x + normalizedX * i,
						this.masterNeuron.y + normalizedY * i,
					);
				}
			},
			inactiveDisplay: () => {},
			img: "excitatory_independent.png",
			buttonElement: undefined,

			masterNeuron: null,
		},
		{
			// Inhibitory synapse tool
			name: "Length independent inhibitory synapse tool",
			info: "Click a neuron to start making an synapse, and then click another one to complete it.",
			activate: function () {
				this.masterNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.masterNeuron = null;
					return;
				}
				if (this.masterNeuron == null) {
					this.masterNeuron = neuron;
				} else if (neuron !== this.masterNeuron) {
					this.masterNeuron.newSynapse(neuron, "inhibitory", false);
					this.masterNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.masterNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.masterNeuron) return;
				this.masterNeuron.newSynapse(neuron, "inhibitory", false);
				this.masterNeuron = null;
			},
			display: function () {
				stroke(190, 0, 0);
				if (this.masterNeuron == null) return;
				const distance = dist(
					this.masterNeuron.x,
					this.masterNeuron.y,
					mouseX,
					mouseY,
				);
				const normalizedX = (mouseX - this.masterNeuron.x) / distance;
				const normalizedY = (mouseY - this.masterNeuron.y) / distance;
				for (let i = 0; i < distance; i += 6) {
					point(
						this.masterNeuron.x + normalizedX * i,
						this.masterNeuron.y + normalizedY * i,
					);
				}
			},
			inactiveDisplay: () => {},
			img: "inhibitory_independent.png",
			buttonElement: undefined,

			masterNeuron: null,
		},
		{
			// Excitatory dependent synapse tool
			name: "Excitatory synapse tool",
			info: "Click a neuron to start making a synapse, and then click another one to complete it.",
			activate: function () {
				this.masterNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.masterNeuron = null;
					return;
				}
				if (this.masterNeuron == null) {
					this.masterNeuron = neuron;
				} else if (neuron !== this.masterNeuron) {
					this.masterNeuron.newSynapse(neuron, "excitatory", true);
					this.masterNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.masterNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.masterNeuron) return;
				this.masterNeuron.newSynapse(neuron, "excitatory", true);
				this.masterNeuron = null;
			},
			display: function () {
				if (this.masterNeuron == null) return;
				stroke(0, 240, 0);
				line(this.masterNeuron.x, this.masterNeuron.y, mouseX, mouseY);
			},
			inactiveDisplay: () => {},
			img: "excitatory_dependent.png",
			buttonElement: undefined,

			masterNeuron: null,
		},
		{
			// Inhibiory dependent synapse tool
			name: "Inhibitory synapse tool",
			info: "Click a neuron to start making a synapse, and then click another one to complete it.",
			activate: function () {
				this.masterNeuron = null;
			},
			lclick: function () {
				const neuron = mouseOverNeuron();
				if (neuron == null) {
					this.masterNeuron = null;
					return;
				}
				if (this.masterNeuron == null) {
					this.masterNeuron = neuron;
				} else if (neuron !== this.masterNeuron) {
					this.masterNeuron.newSynapse(neuron, "inhibitory", true);
					this.masterNeuron = null;
				}
			},
			rclick: () => {},
			drag: () => {},
			release: function () {
				if (this.masterNeuron == null) return;
				const neuron = mouseOverNeuron();
				if (neuron == null) return;
				if (neuron === this.masterNeuron) return;
				this.masterNeuron.newSynapse(neuron, "inhibitory", true);
				this.masterNeuron = null;
			},
			display: function () {
				if (this.masterNeuron == null) return;
				stroke(240, 0, 0);
				line(this.masterNeuron.x, this.masterNeuron.y, mouseX, mouseY);
			},
			inactiveDisplay: () => {},
			img: "inhibitory_dependent.png",
			buttonElement: undefined,

			masterNeuron: null,
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
						app.neuronRadius * 2 + 20,
						app.neuronRadius * 2 + 20,
					);
				} else {
					const synapse = mouseOverSynapse();
					if (synapse != null) {
						strokeWeight(20);
						stroke(240, 0, 0, 50);
						line(
							synapse.master.x,
							synapse.master.y,
							synapse.slave.x,
							synapse.slave.y,
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
		this.lastPulseTimestamp = -app.network.pulseLightDuration;

		this.spontaneousActivity = false;
		this.frequency = app.network.baseFrequency;
		this.frequencyCounter = this.frequency * 60;

		this.axons = [];
		this.dendrites = [];
		this.group = 0;

		this.pulses = [];
	}

	updatePotential() {
		if (this.spontaneousActivity) {
			// Sørger for at egenfrekvensen ikke blir negativ
			if (this.frequency < 0) {
				this.frequency = 0;
			} else if (this.frequency > app.network.frequencyLimit) {
				// Og at den ikke overskrider maksimal frekvens
				this.frequency = app.network.frequencyLimit;
			}

			// Fyrer med riktig frekvens hvis nevronet har egenfrekvens
			if (this.frequencyCounter < round(60 / this.frequency)) {
				++this.frequencyCounter;
			} else {
				this.newPulse();
				this.frequencyCounter = 0;
			}

			// Stabiliserer frekvensen
			if (this.frequency > app.network.baseFrequency) {
				this.frequency -= app.network.frequencyStabilize / 60;
				if (this.frequency < app.network.baseFrequency) {
					this.frequency = app.network.baseFrequency;
				}
			} else if (this.frequency < app.network.baseFrequency) {
				this.frequency += app.network.frequencyStabilize / 60;
				if (this.frequency > app.network.baseFrequency) {
					this.frequency = app.network.baseFrequency;
				}
			}
		} else {
			// Sørger for at ikke potensialet er utenfor grensene
			if (this.potential > app.network.potentialLimit) {
				this.potential = app.network.potentialLimit;
			} else if (this.potential < -app.network.potentialLimit) {
				this.potential = -app.network.potentialLimit;
			}

			// Fyrer aksonet om potensialet er over grensepotensialet
			if (this.potential >= app.network.potentialThreshold) {
				// fyrer
				this.newPulse();
				this.potential = -app.network.linearDecay;
			}

			// Får potensialet til å nærme seg hvilepotensialet (0)
			if (app.network.decayMode === "linear") {
				if (this.potential > 0) {
					this.potential -=
						(app.network.linearDecay * (millis() - app.previousMillis)) / 1000;
					if (this.potential < 0) {
						this.potential = 0;
					}
				} else if (this.potential < 0) {
					this.potential +=
						(app.network.linearDecay * (millis() - app.previousMillis)) / 1000;
					if (this.potential > 0) {
						this.potential = 0;
					}
				}
			} else if (app.network.decayMode === "exponential") {
				this.potential *= app.network.exponentialDecayBase;
			}

			this.potentialCompletion = constrain(
				this.potential / app.network.potentialThreshold,
				-1,
				1,
			);
		}
	}

	updatePulses() {
		for (const synapse of this.axons) {
			synapse.propagatePulses();
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
			millis() - this.lastPulseTimestamp <= app.network.pulseLightDuration
		) {
			stroke(240, 240, 0);
		} else {
			stroke(240);
		}

		fill(20);
		ellipse(this.x, this.y, app.neuronRadius * 2, app.neuronRadius * 2);

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
			ellipse(
				this.x,
				this.y,
				2 * app.neuronRadius * this.potentialCompletion,
				2 * app.neuronRadius * this.potentialCompletion,
			);
		} else if (this.potential < 0) {
			fill(120, 0, 0);
			ellipse(
				this.x,
				this.y,
				2 * app.neuronRadius * -this.potentialCompletion,
				2 * app.neuronRadius * -this.potentialCompletion,
			);
		}
		if (!this.group) return;
		// Tegner sirkel som indikerer at nevronet er i en gruppe
		stroke(240, 240, 0);
		noFill();
		ellipse(this.x, this.y, app.neuronRadius * 4, app.neuronRadius * 4);
	}

	inhibitoryFire() {
		if (!this.spontaneousActivity) {
			this.potential -= app.network.potentialPulseDecrement;
		} else {
			this.frequency -= app.network.frequencyDecrement;
		}
	}

	excitatoryFire() {
		if (!this.spontaneousActivity) {
			this.potential += app.network.potentialPulseIncrement;
		} else {
			this.frequency += app.network.frequencyIncrement;
		}
	}

	newPulse() {
		// Ganger varigheten (i sekunder) med framerate for at timingen skal bli riktig
		//this.pulses.push(round(app.pulseDuration));
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

	newSynapse(slaveNeuron, type, lengthDependent) {
		const newSynapse = new Synapse(this, slaveNeuron, type, lengthDependent);
		this.axons.push(newSynapse);
		slaveNeuron.dendrites.push(newSynapse);
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
	constructor(master, slave, type, lengthDependent) {
		this.master = master;
		this.slave = slave;
		this.type = type; // 'excitatory' eller 'inhibitory'
		this.lengthDependent = lengthDependent; // Om signalene som sendes gjennom sypapsen skal ta hensyn til lengden på synapsen eller ikke

		this.distance = 0;
		this.normalizedX = 0;
		this.normalizedY = 0;
		this.updateNeuronPosition();

		this.pulses = [];
	}

	addPulse() {
		this.pulses.push(0);
	}

	propagatePulses() {
		const isLengthDependent = this.lengthDependent;
		const isExcitatory = this.type === "excitatory";
		const distance = this.distance;
		const dendriteNeuron = this.slave;
		const deltaMillis = millis() - app.previousMillis;
		const increment =
			deltaMillis /
			(isLengthDependent
				? (1000 * distance) / app.network.pulseDistance
				: app.network.pulseDuration);

		this.pulses = this.pulses
			.filter((pulse) => {
				if ((isLengthDependent && distance <= 0) || pulse >= 1) {
					if (isExcitatory) {
						dendriteNeuron.excitatoryFire();
					} else {
						dendriteNeuron.inhibitoryFire();
					}
					return false;
				}
				return true;
			})
			.map((pulse) => pulse + increment);
	}

	updateNeuronPosition() {
		this.distance = dist(
			this.master.x,
			this.master.y,
			this.slave.x,
			this.slave.y,
		);
		this.normalizedX = (this.slave.x - this.master.x) / this.distance;
		this.normalizedY = (this.slave.y - this.master.y) / this.distance;
		this.distance -= app.neuronRadius * 2;
	}

	display() {
		const paddedRadius = app.neuronRadius * 1.25;

		// synapsen farges grønn hvis eksitatorisk, rød hvis inhibitorisk
		if (this.type === "excitatory") {
			stroke(0, 170, 0);
		} else if (this.type === "inhibitory") {
			stroke(190, 0, 0);
		}
		noFill();

		if (this.distance <= 0) return;
		if (this.lengthDependent) {
			line(
				this.master.x + this.normalizedX * paddedRadius,
				this.master.y + this.normalizedY * paddedRadius,
				this.slave.x - this.normalizedX * paddedRadius,
				this.slave.y - this.normalizedY * paddedRadius,
			);
		} else {
			for (
				let i = app.neuronRadius;
				i < this.distance + app.neuronRadius * 0.75;
				i += 6
			) {
				point(
					this.master.x + this.normalizedX * i,
					this.master.y + this.normalizedY * i,
				);
			}
		}
		line(
			this.slave.x - this.normalizedX * paddedRadius + this.normalizedY * 6,
			this.slave.y - this.normalizedY * paddedRadius - this.normalizedX * 6,
			this.slave.x - this.normalizedX * paddedRadius - this.normalizedY * 6,
			this.slave.y - this.normalizedY * paddedRadius + this.normalizedX * 6,
		);

		// Tegner pulsense som beveger seg over synapsen
		stroke(240, 240, 0);
		for (const pulse of this.pulses) {
			line(
				this.master.x +
					this.normalizedX * (app.neuronRadius + pulse * this.distance) +
					this.normalizedY * 5,
				this.master.y +
					this.normalizedY * (app.neuronRadius + pulse * this.distance) -
					this.normalizedX * 5,
				this.master.x +
					this.normalizedX * (app.neuronRadius + pulse * this.distance) -
					this.normalizedY * 5,
				this.master.y +
					this.normalizedY * (app.neuronRadius + pulse * this.distance) +
					this.normalizedX * 5,
			);
		}
	}

	delete() {
		this.master.axons = this.master.axons.filter((s) => s !== this);
		this.master.dendrites = this.master.dendrites.filter((s) => s !== this);
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
			pointOverCircle(mouseX, mouseY, neuron.x, neuron.y, app.neuronRadius),
		) || null
	);
}

function mouseOverSynapse() {
	return (
		app.network.neurons
			.flatMap((neuron) => neuron.axons)
			.find((synapse) =>
				pointOverLine(
					synapse.master.x,
					synapse.master.y,
					synapse.slave.x,
					synapse.slave.y,
					20,
					mouseX,
					mouseY,
				),
			) || null
	);
}

function getExponentialDecayBase() {
	return Math.exp(Math.log(0.01) / 60 / exponentialDecayTargetSeconds);
}

function getLinearDecayCoefficient() {
	return linearDecayPotentialPerSec / 60;
}

function setup() {
	// Skrur av høyreklikk-menyen
	document.body.oncontextmenu = () => false;

	app.workspace = createCanvas(200, 200);
	app.workspace.position(0, app.toolBannerHeight);
	app.toolBanner = createDiv("");
	app.toolBanner.id("toolBanner");
	app.toolBanner.style("height", `${String(app.toolBannerHeight)}px`);

	for (let i = 0; i < app.tools.length; ++i) {
		app.tools[i].buttonElement = createDiv("");
		app.tools[i].buttonElement.position(i * app.toolBannerHeight, 0);
		app.tools[i].buttonElement.size(app.toolBannerHeight, app.toolBannerHeight);
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
	background(20);

	// Oppdaterer pulser
	for (const neuron of app.network.neurons) {
		neuron.updatePulses();
	}
	// Oppdaterer potensialet og tegner nevroner + aksoner
	for (const neuron of app.network.neurons) {
		neuron.updatePotential();
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
	app.previousMillis = millis();
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
	resizeCanvas(window.innerWidth, window.innerHeight - app.toolBannerHeight);
}

window.addEventListener("resize", updateWorkspaceSize);
