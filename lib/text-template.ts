export const TEXT_TEMPLATE_EXAMPLE_TIME = "12:00 PM";

export function renderTextTemplate(
  template: string,
  values: { time: string; address: string }
): string {
  return template.replace(/\{time\}/g, values.time).replace(/\{address\}/g, values.address);
}
