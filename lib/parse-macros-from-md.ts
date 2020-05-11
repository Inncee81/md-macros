import cheerio from 'cheerio';
import { Macro } from 'lib/typedefs';

const macroRegex: RegExp = /\[\[((?:[\n]|[^\]])+)\]\]/gm;
export function parseMacrosFromMd(md: string): Macro[] {
	const macros: Macro[] = [];
	let match: RegExpExecArray = macroRegex.exec(md);
	while (match) {
		const macroText: string = match[1].trim();
		const fullMatch: string = match[0];
		let firstSpaceIndex: number = macroText.indexOf(' ');
		if (firstSpaceIndex === -1) {
			firstSpaceIndex = macroText.indexOf('\n');
		}
		const name: string = macroText.substr(0, firstSpaceIndex).trim();
		const argsString: string = macroText
			.substr(firstSpaceIndex + 1, macroText.length)
			.trim()
			.replace(/\n/g, ' ')
			.replace(/\t/g, ' ')
			.replace(/ {2}/g, ' ')
			.trim();
		const $: cheerio = cheerio.load(`<div ${argsString}></div>`);
		const args: unknown = {
			...$('div').attr()
		};
		macros.push({
			name,
			args,
			fullMatch,
		});
		match = macroRegex.exec(md);
	}
	return macros;
}