
/**
 * Calculates the distance between two points
 * @param {Number} x1 
 * @param {Number} y1 
 * @param {Number} x2 
 * @param {Number} y2 
 */
export function distance (x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Normalizes vector from point 1 to 2
 * @param {Number} x1 
 * @param {Number} y1 
 * @param {Number} x2 
 * @param {Number} y2 
 */
export function normalize (x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1)
  return {
    x: (x2 - x1) / distance,
    y: (y2 - y1) / distance
  }
}


export function quadraticBezier (x0, y0, x1, y1, x2, y2, t) {
  const term0 = Math.pow(1 - t, 2)
  const term1 = 2 * (1 - t) * t
  const term2 = t * t
  
  return {
    x: term0 * x0 + term1 * x1 + term2 * x2,
    y: term0 * y0 + term1 * y1 + term2 * y2
  }
}

export function insertElement (parent, tag, className) {
  const element = document.createElement(tag)
  if (className !== undefined) element.className = className
  parent.appendChild(element)
  return element
}
