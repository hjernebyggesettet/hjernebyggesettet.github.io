import createGameTimer from './game-timer'
import createNeuralNetworkWorkspace from './views'
import createNeuralNetwork from './models'
import createAdjustmentMenu from './adjustments'
import createToolMenu, { createTool } from './tool-menu'

const gameTimer = createGameTimer()

const state = {
  // Selectors
  hoveringOverNeuron: false,
  hoverNeuronID: 0,

  selectingNeuron: false,
  selectedNeuronID: 0,

  // Actions
  draggingNeuron: false,
  draggingNeuronID: 0,
  creatingSynapse: false,
  creatingSynapseAxonID: 0,
  displayingTools: false,
  displayingToolsID: 0,
  deletingSynapse: false,
  deletingSynapseAxonID: 0,
  draggingView: false,
  adjustingNeuron: false,
  adjustingNeuronID: 0,

  // Other
  dragOffsetX: 0,
  dragOffsetY: 0,

  lastWorkspaceX: 0,
  lastWorkspaceY: 0,
}

const appElement = document.getElementById('app')

const workspace = createNeuralNetworkWorkspace(
  document.getElementById('workspace'), 
  {
    color: {
      excitatory: '#24CC76',
      inhibitory: '#f94b4a',
      background: 'white',
      tooling: '#353535',
      actionPotential: '#F3F1B7',
      adjusting: '#9a449b' 
    },
    neuron: {
      radius: 15,
      adjustRingThickness: 2,
      adjustRingRadius: 30
    },
    synapse: {
      startRadius: 15,
      stopRadius: 5,
      buttonRadius: 15,
      actionPotentialRadius: 3
    },
    tools: {
      radius: 90,
      buttonRadius: 25,
      lineThickness: 1
    }
  }
)

const toolMenu = createToolMenu(document.getElementById('tools'))

toolMenu.addTool('Flytte', {
  press: (mouse) => {
    if (state.hoveringOverNeuron) {
      const n = network.get(state.hoverNeuronID)
      state.dragOffsetX = n.x - mouse.x
      state.dragOffsetY = n.y - mouse.y 
      state.draggingNeuron = true
    }
  },
  move: (mouse) => {
    if (state.draggingNeuron) {
      const n = network.get(state.selectedNeuronID)
      n.x = mouse.x + state.dragOffsetX
      n.y = mouse.y + state.dragOffsetY
    }
  },
  release: () => {
    state.draggingNeuron = false
  }
})

toolMenu.addTool('Lag nevron', {
  press: (mouse) => {
    network.createNeuron({x: mouse.x, y: mouse.y})
  }
})

toolMenu.addTool('Lag synapse', {
  press: () => {
    if (state.selectingNeuron) {
      state.creatingSynapse = true
      state.creatingSynapseAxonID = state.selectedNeuronID
    }
  },
  release: () => {
    if (state.creatingSynapse) {
      if (state.hoveringOverNeuron) {
        if (state.hoverNeuronID !== state.creatingSynapseAxonID) {
          network.createSynapse(state.creatingSynapseAxonID, state.hoverNeuronID)
        }
      }
      state.creatingSynapse = false
    }
  }
})

toolMenu.addTool('Fjern nevron', {
  press: () => {
    if (state.hoveringOverNeuron) {
      network.deleteNeuron(state.hoverNeuronID)
    }
  }
})

toolMenu.addTool('Fjern synapse', {
  activate: () => {
    state.deletingSynapse = true
  },
  deactivate: () => {
    state.deletingSynapse = false
  },
  press: () => {
    network.getAll().forEach(an => {
      const dendriteIndex = workspace.mouseOverSynapseButtons(
        an.x, 
        an.y, 
        network.get(an.synapses).map(dn => ({x: dn.x, y: dn.y}))
      )
      if (dendriteIndex !== undefined) {
        network.deleteSynapse(an.id, an.synapses[dendriteIndex])
      }
    })
  }
})

toolMenu.addTool('Aksjonspotensial', {
  press: () => {
    if (state.hoveringOverNeuron) {
      network.generateActionPotential(state.hoverNeuronID)
    }
  }
})

toolMenu.addTool('Konfigurer', {
  deactivate: () => {
    state.adjustingNeuron = false
    adjustments.hide()
  },
  press: () => {
    if (state.selectingNeuron) {
      state.adjustingNeuron = true
      state.adjustingNeuronID = state.selectedNeuronID
      adjustments.show()
      const n = network.get(state.adjustingNeuronID)
      adjustments.setValue('restingPotential', n.restingPotential)
      adjustments.setValue('thresholdPotential', n.thresholdPotential)
      adjustments.setValue('afterHyperPolarizationPotential', n.afterHyperPolarizationPotential)
      adjustments.setValue('membraneTau', n.membraneTau)
      adjustments.setValue('dendriteWeight', n.dendriteWeight)
      adjustments.setValue('spontaneousRestingFrequency', n.spontaneousRestingFrequency)
      adjustments.setValue('spontaneousFrequencyScale', n.spontaneousFrequencyScale)
      adjustments.setValue('inhibitory', n.inhibitory)
      adjustments.setValue('spontaneous', n.spontaneous)
    } else {
      state.adjustingNeuron = false
      adjustments.hide()
    }
  }
})

    // {
    //   name: 'Create neuron',
    //   action: (mouse) => {
    //     const newNeuronID = network.createNeuron({x: mouse.x, y: mouse.y})
    //     network.createSynapse(state.displayingToolsID, newNeuronID)
        
    //     state.draggingNeuron = true
    //     state.draggingNeuronID = newNeuronID
    //     state.dragOffsetX = 0
    //     state.dragOffsetY = 0
    //     state.displayingTools = false
    //   }
    // },
    // {
    //   name: 'Create synapse',
    //   action: () => {
    //     state.creatingSynapse = true
    //     state.creatingSynapseAxonID = state.displayingToolsID
    //     state.displayingTools = false
    //   }
    // },
    // {
    //   name: 'Delete neuron',
    //   action: () => {
    //     if (network.getAll().length > 1) {
    //       network.deleteNeuron(state.displayingToolsID)
    //       state.displayingTools = false
    //       if (state.adjustingNeuron === true && state.adjustingNeuronID === state.displayingToolsID) {
    //         state.adjustingNeuron = false
    //         adjustments.hide()
    //       }
    //     }
    //   }
    // },
    // {
      
    //   name: 'Delete synapse',
    //   action: () => {
    //     state.deletingSynapse = true
    //     state.deletingSynapseAxonID = state.displayingToolsID
    //     state.displayingTools = false
    //   }
    // },
    // {
    //   name: 'Toggle type',
    //   action: () => {
    //     const n = network.get(state.displayingToolsID)
    //     n.inhibitory = !n.inhibitory
    //   }
    // },
    // {
    //   name: 'Toggle spontaneous activity',
    //   action: () => {
    //     const n = network.get(state.displayingToolsID)
    //     n.spontaneous = !n.spontaneous
    //   }
    // },
    // {
    //   name: 'Generate action potential',
    //   action: () => {
    //     network.generateActionPotential(state.displayingToolsID)
    //   }
    // },
    // {
    //   name: 'Adjust parameters',
    //   action: () => {
    //     state.adjustingNeuron = true
    //     state.adjustingNeuronID = state.displayingToolsID
    //     const n = network.get(state.adjustingNeuronID)
    //     adjustments.setValue('restingPotential', n.restingPotential)
    //     adjustments.setValue('thresholdPotential', n.thresholdPotential)
    //     adjustments.setValue('afterHyperPolarizationPotential', n.afterHyperPolarizationPotential)
    //     adjustments.setValue('membraneTau', n.membraneTau)
    //     adjustments.setValue('dendriteWeight', n.dendriteWeight)
    //     adjustments.setValue('spontaneousRestingFrequency', n.spontaneousRestingFrequency)
    //     adjustments.setValue('spontaneousFrequencyScale', n.spontaneousFrequencyScale)

    //     adjustments.show()
    //   }
    // },

const adjustments = createAdjustmentMenu(document.getElementById('adjustments'))
adjustments.addProperty('Hvilepotensiale', 'restingPotential', -100, 0, 1)
adjustments.addProperty('Terskelpotensiale', 'thresholdPotential', -100, 100, 1)
adjustments.addProperty('AHP-potensiale', 'afterHyperPolarizationPotential', -200, 0, 1)
adjustments.addProperty('Membranets tidskonstant', 'membraneTau', 0.1, 10, 0.1)
adjustments.addProperty('Synaptisk vekting', 'dendriteWeight', 0, 100, 1)
adjustments.addProperty('Hvilefrekvens', 'spontaneousRestingFrequency', 0, 10, 0.1)
adjustments.addProperty('Frekvensskalering (Hz pr. mV)', 'spontaneousFrequencyScale', 0, 1, 0.01)
adjustments.addBooleanProperty('Hemmende', 'inhibitory')
adjustments.addBooleanProperty('Spontanaktivitet', 'spontaneous')

let network = createNeuralNetwork()
network.createNeuron({x: 0, y: 0})

// Logic
workspace.onMouseMove(mouse => {
  // Selecting neuron
  let hoverNeuron = network.getAll().find(n => workspace.mouseOverNeuron(n.x, n.y))
  if (hoverNeuron !== undefined) {
    state.hoveringOverNeuron = true
    state.hoverNeuronID = hoverNeuron.id
  } else {
    state.hoveringOverNeuron = false
  }


  toolMenu.toolMove(mouse)
  // Dragging neuron
  // if (state.draggingNeuron) {
  //   const n = network.get(state.draggingNeuronID)
  //   n.x = mouse.x + state.dragOffsetX
  //   n.y = mouse.y + state.dragOffsetY
  // }

  // if (state.draggingView) {
  //   workspace.setOffsetX(state.lastWorkspaceX + (mouse.x - state.dragOffsetX))
  //   workspace.setOffsetY(state.lastWorkspaceY + (mouse.y - state.dragOffsetY))
  // }
})

workspace.onMousePressed(mouse => {
  state.selectingNeuron = false

  if (state.hoveringOverNeuron) {
    state.selectingNeuron = true
    state.selectedNeuronID = state.hoverNeuronID
  }

  toolMenu.toolPress(mouse)
  // let hoveringOverTool = false
  // if (state.selectingNeuron) {
  //   const n = network.get(state.displayingToolsID)
  //   const toolIndex = workspace.mouseOverTools(n.x, n.y, tools.length)
  //   if (toolIndex !== undefined) {
  //     hoveringOverTool = true
  //     tools[toolIndex].action(mouse)
  //   }
  // }

  // if (!hoveringOverTool) {
  //   if (state.hoveringOverNeuron) {
  //     state.displayingTools = true
  //     state.displayingToolsID = state.hoverNeuronID
        
  //     state.draggingNeuron = true
  //     state.draggingNeuronID = state.hoverNeuronID

  //     const n = network.get(state.draggingNeuronID)
  //     state.dragOffsetX = n.x - mouse.x
  //     state.dragOffsetY = n.y - mouse.y
  //   } else {
  //     state.displayingTools = false
  //     state.draggingView = true
  //     state.dragOffsetX = mouse.x
  //     state.dragOffsetY = mouse.y 
  //     state.lastWorkspaceX = workspace.getOffsetX()
  //     state.lastWorkspaceY = workspace.getOffsetY()
  //   }
  // }
})

workspace.onMouseReleased(mouse => {
  toolMenu.toolRelease(mouse)
  // if (state.hoveringOverNeuron) {
  //   if (state.creatingSynapse && state.hoverNeuronID !== state.hoverSynapseAxonID) {
  //     network.createSynapse(state.creatingSynapseAxonID, state.hoverNeuronID)
  //   }
  // }

  // if (state.deletingSynapse) {
  //   const n = network.get(state.deletingSynapseAxonID)
  //   const dendriteIndex = workspace.mouseOverSynapseButtons(
  //     n.x, 
  //     n.y, 
  //     network.get(n.synapses).map(dn => ({x: dn.x, y: dn.y}))
  //   )
  //   if (dendriteIndex !== undefined) {
  //     network.deleteSynapse(state.deletingSynapseAxonID, n.synapses[dendriteIndex])
  //   }
  // } 

  // state.creatingSynapse = false
  // state.draggingNeuron = false
  // state.deletingSynapse = false
  // state.draggingView = false
})

adjustments.onSubmit(parameters => {
  if (network.getAll().length > 0) {
    const n = network.get(state.adjustingNeuronID)
    parameters.forEach(p => n[p.name] = p.value)
  }
})

gameTimer.update((deltaTime) => {
  network.updateMembranePotentials(deltaTime)
  network.updateSpontaneousActivity(deltaTime)
  network.updateActionPotentials(deltaTime)
})

// View

gameTimer.render(() => {
  workspace.clearCanvas()

  // Synapses
  network.getAll().forEach(n => {
    workspace.drawSynapseCluster(
      n.x, 
      n.y, 
      network.get(n.synapses).map(dn => ({x: dn.x, y: dn.y})),
      n.inhibitory, 
      n.actionPotentials,
      state.creatingSynapse && state.creatingSynapseAxonID === n.id,
      state.deletingSynapse
    )
  })

  // Neurons
  network.getAll().forEach(n => {
    workspace.drawNeuron(
      n.x, 
      n.y, 
      n.inhibitory, 
      n.membranePotential, 
      state.adjustingNeuron && state.adjustingNeuronID === n.id
    )
  })

  // Tools
  if (state.displayingTools) {
    const n = network.get(state.displayingToolsID)
    workspace.drawTools(n.x, n.y, tools.map(tool => tool.name))
  }
  
  // Debug
  workspace.drawObject(state, 10, 10)
})

gameTimer.start()