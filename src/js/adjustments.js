export default function createAdjustmentMenu(parentElement) {
  let properties = []

  const propertyContainer = document.createElement('div')
  parentElement.appendChild(propertyContainer)
  
  const buttonContainer = document.createElement('div')
  parentElement.appendChild(buttonContainer)
  
  const submitButton = document.createElement('button')
  submitButton.innerText = 'Oppdater'
  submitButton.className = 'submit'
  buttonContainer.appendChild(submitButton)  
  
  hide()

  function addProperty(label, propName, minValue, maxValue, valueStep) {
    const div = document.createElement('div')
    const nameDiv = document.createElement('div')
    nameDiv.innerText = label
    div.appendChild(nameDiv)

    const input = document.createElement('input')
    input.setAttribute('type', 'number')
    input.setAttribute('min', minValue)
    input.setAttribute('max', maxValue)
    input.setAttribute('step', valueStep)
    div.appendChild(input)

    propertyContainer.appendChild(div)
    
    properties.push({
      name: propName,
      element: input
    })
  }

  function addBooleanProperty(label, propName) {
    const div = document.createElement('div')
    const nameDiv = document.createElement('div')
    nameDiv.innerText = label
    div.appendChild(nameDiv)

    const input = document.createElement('input')
    input.setAttribute('type', 'checkbox')
    div.appendChild(input)

    propertyContainer.appendChild(div)
    
    properties.push({
      name: propName,
      element: input
    })
  }
  
  function setValue(propName, newValue) {
    const prop = properties.find(p => p.name === propName)
    if (prop === undefined) throw Error ('No field called ' + propName)
    if (prop.element.type === 'checkbox') {
      prop.element.checked = !!newValue
    } else {
      prop.element.value = newValue
    }
  }

  function onSubmit(callback) {
    submitButton.addEventListener('click', () => {
      callback(properties.map(p => {
        return {
          name: p.name,
          value: (p.element.type === 'checkbox') ? p.element.checked : Number(p.element.value)
        }
      }))
    })
  }

  function show() {
    parentElement.style.display = 'block'
  }

  function hide() {
    parentElement.style.display = 'none'
  }

  return {
    addProperty,
    addBooleanProperty,
    setValue,
    onSubmit,
    show,
    hide
  }
}