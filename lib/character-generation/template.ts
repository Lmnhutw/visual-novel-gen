export function renderTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
) {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, key) => {
    const value = values[key];
    return value === undefined ? placeholder : String(value);
  });
}
