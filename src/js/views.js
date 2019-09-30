import { normalize, quadraticBezier } from './utilities'

/**
 * A simple module for drawing on an HTML Canvas element.
 *
 * Animation system stolen from Meth Meth Method (@pomle)
 * https://github.com/meth-meth-method/game-timer
 *
 * @author Trym Sneltvedt
 */

export default function createNeuralNetworkWorkspace (parentElement, config) {
  const canvas = document.createElement('canvas')
  parentElement.appendChild(canvas)
  const context = canvas.getContext('2d')

  console.log(parentElement.clientWidth, parentElement.clientHeight)

  window.addEventListener('resize', scaleToParent)
  scaleToParent()
  
  
  let offsetX = canvas.width / 2
  let offsetY = canvas.height / 2
  let scale = 1

  let mouseX = 0
  let mouseY = 0
  let prevMouseX = 0
  let prevMouseY = 0
  
  const viewport = {
    offsetX: canvas.width / 2,
    offsetY: canvas.height / 2,
    scale: 1,
    X: (x) => x * viewport.scale + viewport.offsetX,
    Y: (y) => y * viewport.scale + viewport.offsetY,
    R: (r) => r * viewport.scale
  }

  

  ////////////////////////////
  //     DOM Management     //
  ////////////////////////////

  function scaleToParent() {
    canvas.width = parentElement.clientWidth
    canvas.height = parentElement.clientHeight
  }

  function onMousePressed(callback) {
    canvas.addEventListener('mousedown', () => {
      callback({x: mouseX, y: mouseY, px: prevMouseX, py: prevMouseY})
    })
  }

  function onMouseReleased(callback) {
    canvas.addEventListener('mouseup', () => {
      callback({x: mouseX, y: mouseY, px: prevMouseX, py: prevMouseY})
    })
  }

  function onMouseMove(callback) {
    canvas.addEventListener('mousemove', event => {
      prevMouseX = mouseX
      prevMouseY = mouseY
      const rectangle = canvas.getBoundingClientRect()
      mouseX = event.pageX - rectangle.left - offsetX
      mouseY = event.pageY - rectangle.top - offsetY
      callback({x: mouseX, y: mouseY, px: prevMouseX, py: prevMouseY})
    })
  }

  ////////////////////////////
  //   Viewport Management  //
  ////////////////////////////
  
  function getOffsetX() {
    return offsetX
  }

  function getOffsetY() {
    return offsetY
  }

  function setOffsetX(newOffsetX) {
    offsetX = newOffsetX
  }

  function setOffsetY(newOffsetY) {
    offsetY = newOffsetY
  }

  function mouseOverCircle(x, y, radius) {
    return (Math.hypot(x - mouseX, y - mouseY) <= radius)
  }
  
  function mouseOverNeuron(x, y) {
    return mouseOverCircle(x, y, config.neuron.radius)
  }

  function mouseOverTools(x, y, toolNumber) {
    return toolButtonPositions(x, y, toolNumber).reduce((selectedIndex, pos, index) => {
      if (mouseOverCircle(pos.x, pos.y, config.tools.buttonRadius)) {
        return index
      }
      return selectedIndex
    }, undefined)
  }

  function mouseOverSynapseButtons(x, y, dendritePositions) {
    return synapseClusterPositions(x, y, dendritePositions, [], false).reduce((selectedIndex, pos, index) => {
      if (mouseOverCircle(pos.buttonX, pos.buttonY, config.synapse.buttonRadius)) {
        return index
      }
      return selectedIndex
    }, undefined)
  }

  /**
   * Returns an array of points corresponding to tool button positions.
   * @param {Number} x 
   * @param {Number} y 
   * @param {Array} tools 
   */
  function toolButtonPositions(x, y, toolNumber) {
    let positions = []
    for (let i=0; i<toolNumber; i++) {
      positions.push({
        x: x + Math.cos(2 * Math.PI / toolNumber * i) * config.tools.radius,
        y: y + Math.sin(2 * Math.PI / toolNumber * i) * config.tools.radius
      })
    }
    return positions
  }

  /**
   * 
   * @param {Object} axonX 
   * @param {Array} dendriteNeurons 
   */
  function synapseClusterPositions(axonX, axonY, dendritePositions, actionPotentials, creatingSynapse) {
    if (creatingSynapse) {
      dendritePositions.push({x: mouseX, y: mouseY})
    }
    const dendriteNum = dendritePositions.length
    const startStopAverage = dendritePositions.reduce((total, pos) => {
      return {
        x: (total.x + pos.x) / (dendriteNum + 1), 
        y: (total.y + pos.y) / (dendriteNum + 1)
      }
    }, {
      x: axonX / (dendriteNum + 1),
      y: axonY / (dendriteNum + 1)
    })
    return dendritePositions.map(pos => {
      const ctrlX = (axonX + pos.x + startStopAverage.x) / 3
      const ctrlY = (axonY + pos.y + startStopAverage.y) / 3
      const buttonPosition = quadraticBezier(axonX, axonY, ctrlX, ctrlY, pos.x, pos.y, 0.5)
      return {
        x: pos.x, 
        y: pos.y,
        ctrlX,
        ctrlY,
        buttonX: buttonPosition.x,
        buttonY: buttonPosition.y,
        actionPotentialPositions: actionPotentials.map(progress => {
          return quadraticBezier(axonX, axonY, ctrlX, ctrlY, pos.x, pos.y, progress)
        })
      }
    })
  }

  ////////////////////////////
  //         Drawing        //
  ////////////////////////////
  
  function clearCanvas () {
    context.fillStyle = config.color.background
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  function drawNeuron (x, y, inhibitory, membranePotential, adjusting) {
    context.fillStyle = adjusting ? config.color.adjusting : (inhibitory ? config.color.inhibitory : config.color.excitatory)
    context.beginPath()
    context.arc(
      x * scale + offsetX,
      y * scale + offsetY,
      config.neuron.radius * scale,
      0, 
      2 * Math.PI
    )
    context.fill()
    context.strokeStyle = config.color.background
    context.beginPath()
    context.lineWidth = 3 * viewport.scale
    context.arc(
      x * scale + offsetX,
      y * scale + offsetY,
      config.neuron.radius * 0.618 * scale,
      0, 
      2 * Math.PI
    )
    context.stroke()
    context.lineWidth = 1

    context.fillStyle = config.color.tooling
    context.textAlign = 'center'
    context.fillText(
      membranePotential.toPrecision(3) + 'mV', 
      x * scale + offsetX, 
      (y - config.neuron.radius * 1.1) * scale + offsetY
    )
    context.textAlign = 'start'
  }

  function drawSynapseButton(x, y) { 
    context.beginPath()
    context.arc(
      x * scale + offsetX, 
      y * scale + offsetY, 
      config.synapse.buttonRadius,
      0,
      2 * Math.PI
    )
    context.fillStyle = config.color.tooling
    context.fill()
    context.beginPath()
    const crossSize = config.synapse.buttonRadius * 0.5
    context.moveTo(
      (x - crossSize) * scale + offsetX, 
      (y - crossSize) * scale + offsetY 
    )
    context.lineTo(
      (x + crossSize) * scale + offsetX, 
      (y + crossSize) * scale + offsetY 
    )
    context.moveTo(
      (x + crossSize) * scale + offsetX, 
      (y - crossSize) * scale + offsetY 
    )
    context.lineTo(
      (x - crossSize) * scale + offsetX, 
      (y + crossSize) * scale + offsetY 
    )
    context.strokeStyle = config.color.background
    context.stroke()
  }

  function drawSynapse (startX, startY, ctrlX, ctrlY, stopX, stopY, color) {
    const normStartCtrl = normalize(startX, startY, ctrlX, ctrlY)
    const normCtrlStop = normalize(ctrlX, ctrlY, stopX, stopY)
    const normStartStop = normalize(startX, startY, stopX, stopY)
    const ctrlRadius = (config.synapse.startRadius + config.synapse.stopRadius) / 2
         
    context.beginPath()
    context.moveTo(
      (startX + normStartCtrl.y * config.synapse.startRadius) * scale + offsetX,
      (startY - normStartCtrl.x * config.synapse.startRadius) * scale + offsetY
    )
    context.quadraticCurveTo(
      (ctrlX + normStartStop.y * ctrlRadius) * scale + offsetX,
      (ctrlY - normStartStop.x * ctrlRadius) * scale + offsetY, 
      (stopX + normCtrlStop.y * config.synapse.stopRadius) * scale + offsetX, 
      (stopY - normCtrlStop.x * config.synapse.stopRadius) * scale + offsetY
    )
    context.lineTo(
      (stopX - normCtrlStop.y * config.synapse.stopRadius) * scale + offsetX, 
      (stopY + normCtrlStop.x * config.synapse.stopRadius) * scale + offsetY
    )
    context.quadraticCurveTo(
      (ctrlX - normStartStop.y * ctrlRadius) * scale + offsetX, 
      (ctrlY + normStartStop.x * ctrlRadius) * scale + offsetY,
      (startX - normStartCtrl.y * config.synapse.startRadius) * scale + offsetX,
      (startY + normStartCtrl.x * config.synapse.startRadius) * scale + offsetY
    )
    context.closePath()
    context.fillStyle = color
    context.fill()
  }

  function drawSynapseCluster(axonX, axonY, dendritePositions, inhibitory, actionPotentials, creatingSynapse, displayButtons) {
    synapseClusterPositions(axonX, axonY, dendritePositions, actionPotentials, creatingSynapse).forEach(position => {
      drawSynapse(
        axonX, 
        axonY, 
        position.ctrlX, 
        position.ctrlY, 
        position.x, 
        position.y, 
        inhibitory ? config.color.inhibitory : config.color.excitatory
      )

      context.fillStyle = config.color.actionPotential
      position.actionPotentialPositions.forEach(pos => {
        context.beginPath()
        context.arc(
          pos.x * scale + offsetX,
          pos.y * scale + offsetY,
          config.synapse.actionPotentialRadius,
          0,
          Math.PI * 2
        )
        context.fill()
      })

      if (displayButtons) {
        drawSynapseButton(position.buttonX, position.buttonY)
      }
    })
  }

  function drawTools(x, y, toolNames) {
    context.lineWidth = config.tools.lineThickness
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    toolButtonPositions(x, y, toolNames.length).forEach((pos, index) => {
      context.beginPath()
      context.arc(
        pos.x * scale + offsetX,
        pos.y * scale + offsetY,
        config.tools.buttonRadius * scale,
        0,
        2 * Math.PI
      )
      context.strokeStyle = config.color.tooling
      context.fillStyle = config.color.background
      context.fill()
      context.stroke()

      context.fillStyle = config.color.tooling
      context.fillText(
        toolNames[index], 
        pos.x * scale + offsetX,
        pos.y * scale + offsetY
      )
    })
    context.lineWidth = 1
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'  
  }

  function drawObject(object, x, y) {
      // Debug panel
    context.fillStyle = config.color.tooling
    context.textAlign = 'start'
    Object.entries(object).forEach((entry, index) => {
      context.fillText(entry[0] + ': ' + entry[1], x, y + 15 * index)
    })
  }
  
  return {
    onMousePressed,
    onMouseReleased,
    onMouseMove,

    getOffsetX,
    getOffsetY,
    setOffsetX,
    setOffsetY,
    mouseOverNeuron,
    mouseOverTools,
    mouseOverSynapseButtons,

    clearCanvas,
    drawNeuron,
    drawSynapseCluster,
    drawTools,
    drawObject
  }
}

