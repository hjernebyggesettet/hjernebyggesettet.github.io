export default function createNeuralNetwork() {
  const Neuron = {
    id: 0,
    x: 0,
    y: 0,
    inhibitory: false,
    
    synapses: [],
    
    restingPotential: -70,
    thresholdPotential: -55,
    afterHyperPolarizationPotential: -80,
    membraneOnLastStimulus: -70,
    timeSinceLastStimulus: 0,
    membranePotential: -70,
    membraneTau: 1,

    dendriteWeight: 8,
    
    actionPotentialStrength: 30,
    actionPotentials: [],
    actionPotentialPropagationTime: 2,

    spontaneous: false,
    spontaneousRestingFrequency: 2, // Hz
    spontaneousFrequencyScale: 1/10, // Hz/mV
    timeSinceLastSpontaneousFire: 0,
  }
  
  let neurons = []

  function createNeuron(initialstate) {
    if (initialstate === undefined) initialstate = {}
    let newID = 0
    while (neurons.map(neuron => neuron.id).reduce((taken, id) => {
      return (id === newID) || taken
    }, false)) {
      newID++
    }  
    initialstate.id = newID
    const newNeuron = Object.assign({}, Neuron, initialstate)
    neurons = neurons.concat(newNeuron)
    return newID
  }

  function createSynapse(axonID, dendriteID) {
    neurons = neurons.map(neuron => {
      if (neuron.id === axonID) {
        neuron.synapses = neuron.synapses.concat(dendriteID)
      }
      return neuron
    })
  }

  function deleteNeuron(id) {
    neurons = neurons.filter(neuron => neuron.id !== id)
    neurons = neurons.map(neuron => {
      neuron.synapses = neuron.synapses.filter(dendriteID => dendriteID !== id)
      return neuron
    })
  }

  function deleteSynapse (axonID, dendriteID) {
    neurons = neurons.map(neuron => {
      if (neuron.id === axonID) {
        neuron.synapses = neuron.synapses.filter(id => id !== dendriteID)
      }
      return neuron
    })
  }

  function getAll() {
    return neurons
  }

  function get(id) {
    if (Array.isArray(id)) {
      return id.map(currentID => {
        let neuron = neurons.find(n => n.id === currentID)
        if (neuron === undefined) throw Error('No neuron with id ' + currentID)
        return neuron
      })
    } else if (Number.isInteger(id)) {
      let neuron = neurons.find(n => n.id === id)
      if (neuron === undefined) throw Error('No neuron with id ' + id)
      return neuron
    } else {
      throw Error('Invalid id')
    }
  }

  function generateActionPotential(id) {
    const neuron = get(id)
    neuron.actionPotentials.push(0)
  }

  function updateMembranePotentials(deltaTime) {
    neurons.forEach(neuron => {
      neuron.timeSinceLastStimulus += deltaTime
      if (neuron.timeSinceLastStimulus <= 5 * neuron.membraneTau) {
        neuron.membranePotential =
          neuron.restingPotential +
          (neuron.membraneOnLastStimulus - neuron.restingPotential) *
          Math.exp(-neuron.timeSinceLastStimulus / neuron.membraneTau);
      } else {
        neuron.membranePotential = neuron.restingPotential;
      }
    })
  }

  function updateSpontaneousActivity(deltaTime) {
    neurons.forEach(neuron => {
      if (neuron.spontaneous) {
        neuron.timeSinceLastSpontaneousFire += deltaTime
        const currentFrequency = Math.max(0, neuron.spontaneousRestingFrequency + 
          (neuron.membranePotential - neuron.restingPotential) * neuron.spontaneousFrequencyScale)
        if (neuron.timeSinceLastSpontaneousFire >= 1 / currentFrequency) {
          neuron.timeSinceLastSpontaneousFire = 0
          generateActionPotential(neuron.id)
        }
      }
    })
  }

  function updateActionPotentials(deltaTime) {
    neurons.forEach(neuron => {
      neuron.actionPotentials = neuron.actionPotentials.map(progress =>
        progress + deltaTime / neuron.actionPotentialPropagationTime
      ).filter(progress => {
        if (progress >= 1) {
          neuron.synapses.forEach(dendriteID => {
            stimulateMembranePotential(dendriteID, neuron.inhibitory)
          })
          return false
        }
        return true
      })
    })
  }

  function stimulateMembranePotential(id, inhibitory) {
    const neuron = get(id)
    neuron.timeSinceLastStimulus = 0
    neuron.membranePotential += inhibitory ? -neuron.dendriteWeight : neuron.dendriteWeight
    if (neuron.membranePotential >= neuron.thresholdPotential) {
      neuron.membranePotential = neuron.afterHyperPolarizationPotential
      if (!neuron.spontaneous) {
        generateActionPotential(neuron.id)
      }
    }
    neuron.membraneOnLastStimulus = neuron.membranePotential
  }

  return {
    // CRUD
    createNeuron,
    createSynapse,
    deleteNeuron,
    deleteSynapse,
    get,
    getAll,

    updateMembranePotentials,
    updateSpontaneousActivity,
    updateActionPotentials,
    generateActionPotential,
    stimulateMembranePotential
  }
}



/**
 * Creates a new neuron
 * @param {Array} takenIDs List of unavailable IDs
 * @param {Number} x Initial x-pos of neuron
 * @param {Number} y Initial y-pos of neuron
 */
export function createNeuron(takenIDs, x, y) {
  let newID = 0
  while (takenIDs.reduce((taken, id) => {
    return (id === newID) || taken
  }, false)) {
    newID++
  } 

  const newNeuron = Object.assign({}, Neuron)
  newNeuron.id = newID
  newNeuron.x = x
  newNeuron.y = y
  return newNeuron
}

/**
 * Returns neuron with specified ID from given list
 * @param {Array} neuronList List of neurons
 * @param {Number} neuronID ID of wanted neuron
 */
export function getNeuron(neuronList, neuronID) {
  const neuron = neuronList.find(n => n.id === neuronID)
  if (neuron === undefined) throw Error('No neuron with that ID!')
  return Object.assign({}, neuron)
}

/**
 * Returns a new version of the neuron list, with the set neuron
 * @param {Array} neuronList List of neurons
 * @param {Object} neuron Neuron to be set
 */
export function setNeuron(neuronList, neuron) {
  getNeuron(neuronList, neuron.id)
  return neuronList.map(n => {
    if (n.id === neuron.id)
      return neuron
    return n
  }) 
}

/**
 * Returns a version of the given list without specified neuron
 * @param {Array} neuronList List of neurons
 * @param {Number} neuronID ID of wanted neuron
 */
export function deleteNeuron(neuronList, neuronID) {
  let list = neuronList.slice(0)
  if (list.length < 2) throw Error('One neuron must remain!')
  getNeuron(list, neuronID)
  list = list.map(n => {
    n.synapses = n.synapses.filter(id => id !== neuronID)
    return n
  })
  return list.filter(n => n.id !== neuronID)
}

/**
 * Returns a neuron list where synapse has been added
 * @param {Array} neuronList List of neurons
 * @param {Number} axonID ID of axon neurons
 * @param {Number} dendriteID ID of dendrite neuron
 */
export function createSynapse(neuronList, axonID, dendriteID) {
  const axon = getNeuron(neuronList, axonID)
  getNeuron(neuronList, dendriteID)
  axon.synapses = axon.synapses.concat(dendriteID)
  return setNeuron(neuronList, axon)
}

/**
 * Returns a new neuron list where specified synapse has been removed
 * @param {Array} neuronList List of neuron
 * @param {Number} axonID ID of axon neuron
 * @param {Number} dendriteID ID of dendrite neuron
 */
export function deleteSynapse(neuronList, axonID, dendriteID) {
  let list = neuronList.slice(0)
  const axon = getNeuron(list, axonID)
  axon.synapses = axon.synapses.filter(id => id !== dendriteID)
  return setNeuron(list, axon)
}

export function updatePotentials(neuronList, deltaTime) {
  neuronList.forEach(neuron => {
    // Membrane potentials
    neuron.timeSinceLastStimulus += deltaTime
    if (neuron.timeSinceLastStimulus <= 5 * neuron.membraneTau) {
      neuron.membranePotential =
        neuron.restingPotential +
        (neuron.membraneOnLastStimulus - neuron.restingPotential) *
        Math.exp(-neuron.timeSinceLastStimulus / neuron.membraneTau);
    } else {
      neuron.membranePotential = neuron.restingPotential;
    }

    // Action potentials
    const updatedActionPotentials = neuron.actionPotentials.map(progress =>
      progress + deltaTime / neuron.actionPotentialPropagationTime
    )
    neuron.actionPotentials = updatedActionPotentials.filter(progress => progress < 1)
  })
}

export function generateActionPotential(neuronList, neuronID) {
  const neuron = getNeuron(neuronList, neuronID)
  neuron.actionPotentials.push(0)

}

function stimulateMembranePotential (stimulus) {
  this.membranePotential += stimulus
  if (this.membranePotential >= this.thresholdPotential) {
    this.membranePotential = this.afterHyperPolarizationPotential
    this.generateActionPotential()
  }
  this.membraneOnLastStimulus = this.membranePotential
  this.timeSinceLastStimulus
}


// function changeMembranePotential(neuron, deltaPotential) {
//   neuron.membranePotential += deltaPotential;
//   if (neuron.membranePotential >= neuron.thresholdPotential) {
//     neuron.membranePotential = neuron.afterHyperPolarizationPotential;
//     generateActionPotential(neuron);
//   }
//   neuron.lastChangeMembranePotential = neuron.membranePotential;
//   neuron.timeSinceLastChange = 0;
// }

// function generateActionPotential(neuron) {
//   neuron.actionPotentials.push(0);
// }

// export function simulateMembranePotential(neuron, deltaTime) {
//   neuron.timeSinceLastChange += deltaTime;
//   if (neuron.timeSinceLastChange < 5 * neuron.membraneTau) {
//     neuron.membranePotential =
//       neuron.restingPotential +
//       (neuron.lastChangeMembranePotential - neuron.restingPotential) *
//       Math.exp(-neuron.timeSinceLastChange / neuron.membraneTau);
//   } else {
//     neuron.membranePotential = neuron.restingPotential;
//   }
// }

// export function simulateActionPotential(neuron, deltaTime) {
//   neuron.actionPotentials = neuron.actionPotentials
//     .map(
//       actionPotential =>
//         actionPotential + deltaTime / neuron.actionPotentialPropagationTime
//     )
//     .filter(actionPotential => {
//       if (actionPotential >= 1) {
//         neuron.dendriteNeurons.forEach(dendriteNeuron => {
//           changeMembranePotential(dendriteNeuron, neuron.deltaPotential);
//         });
//         return false;
//       }
//       return true;
//     });
// }