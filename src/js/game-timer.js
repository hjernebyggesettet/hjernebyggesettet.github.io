export default function createGameTimer() {
  let updateIncrement = 1 / 120
  let lastTime = 0
  let accumulator = 0
  let tick = 0
  let frameId = null

  let updateCallback = () => {}
  let renderCallback = () => {}

  /**
   * Helper function for timing simulation and rendering
   * @param {number} time Current time (since application start)
   */
  function onFrame(time) {
    if (lastTime !== null) {
      accumulator += (time - lastTime) / 1000
      while (accumulator > updateIncrement) {
        updateCallback(updateIncrement, tick)
        tick++
        accumulator -= updateIncrement
      }
    }
    lastTime = time
    renderCallback()
    frameId = requestAnimationFrame(onFrame)
  }

  function render(callback) {
    renderCallback = callback
  }

  function update(callback) {
    updateCallback = callback
  }

  function setUpdateFrequency(frequency) {
    updateIncrement = 1 / frequency
  }

  /**
   * Method for starting animation (rendering) and simulation (update).
   */
  function start() {
    lastTime = null
    frameId = requestAnimationFrame(onFrame)
  }

  /**
   * Stops animation and simulation.
   */
  function stop() {
    cancelAnimationFrame(frameId)
  }

  return {
    render,
    update,
    setUpdateFrequency,
    start,
    stop
  }
} 