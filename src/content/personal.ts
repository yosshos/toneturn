/** `{name}` → the player's first name, or nothing ("Hey {name}!" → "Hey!"). */
export const personal = (text: string, name: string | null) => text.replace(/\s*\{name\}/g, name ? ` ${name}` : '').replace(/\s+([!?.,])/g, '$1');
