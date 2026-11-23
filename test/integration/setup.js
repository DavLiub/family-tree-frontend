// Material Web form controls use ElementInternals, which happy-dom lacks.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {}
  }
}
