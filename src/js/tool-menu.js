export default function createToolMenu(parentElement) {
  let tools = {}
  let currentToolName

  function addTool(name, {activate, deactivate, press, move, release}) {
    const div = document.createElement('div')
    div.classList.add('tool')
    if (Object.keys(tools).length === 0) {
      div.classList.add('selected')
      currentToolName = name
    }
    div.innerText = name

    div.addEventListener('click', () => {
      if (currentToolName !== name) {
        switchTool(name)
      } 
    })

    parentElement.appendChild(div)

    tools[name] = {
      element: div,
    }
    if (activate) tools[name].activate = activate
    if (deactivate) tools[name].deactivate = deactivate
    if (press) tools[name].press = press
    if (move) tools[name].move = move
    if (release) tools[name].release = release
  }

  function switchTool(newToolName) {
    if (!(newToolName in tools)) throw Error('Invalid tool name')
    if ('deactivate' in tools[currentToolName]) tools[currentToolName].deactivate()
    tools[currentToolName].element.classList.remove('selected')
    currentToolName = newToolName
    if ('activate' in tools[currentToolName]) tools[currentToolName].activate()
    tools[currentToolName].element.classList.add('selected')
  }

  function toolPress(props) {
    if ('press' in tools[currentToolName]) tools[currentToolName].press(props)
  }

  function toolMove(props) {
    if ('move' in tools[currentToolName]) tools[currentToolName].move(props)
  }

  function toolRelease(props) {
    if ('release' in tools[currentToolName]) tools[currentToolName].release(props)
  }

  return {
    addTool,
    switchTool,
    toolPress,
    toolMove,
    toolRelease,
  }
}