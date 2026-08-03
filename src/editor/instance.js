export default function (instanceClass) {
  return class extends instanceClass {
    constructor(sdkType, inst) {
      super(sdkType, inst);
    }

    Release() {}

    OnCreate() {}

    // NOTE: the editor SDK has no way to enable/disable or grey out individual
    // Properties Bar entries (no SetPropertyEnabled on any base class). "Dim Opacity"
    // is therefore always shown; it simply has no effect when "Dim Layer" is blank,
    // which its description states. Property values, when needed, are read via
    // this._inst.GetPropertyValue(id) — never this.GetPropertyValue(id).
    OnPropertyChanged(id, value) {}
  };
}
