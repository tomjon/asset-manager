export var pristine = function(form: any, value?: boolean): void {
  if (value == undefined) value = true; // default argument value not working, weirdly
  if (! form) return;
  form['_touched'] = ! value;
  form['_pristine'] = value;
  form.form['_touched'] = ! value;
  form.form['_pristine'] = value;
  for (let k in form.form.controls) {
    form.form.controls[k]['_touched'] = ! value;
    form.form.controls[k]['_pristine'] = value;
  }
};
