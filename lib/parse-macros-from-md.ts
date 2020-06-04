import cheerio from 'cheerio';
import { Macro, ParsedMacros, ParsedImage, ParsedReferences, ParsedLink } from '@lib/typedefs';

export function parseMacrosFromMd(md: string): ParsedMacros {
	const macroRegex: RegExp = /\[\[((?:[\n]|[^\]])+)\]\]/gm;
	const inlineImgOrLinkRegex: RegExp = /!{0,1}\[([^\]]*)\]\(([^)]+)\)/gm;
	const inlineImgPartsRexex: RegExp = /\[([^\]]*)\]\(([^)]+)\)/g;
	const referenceValsRegex: RegExp = /\[([^\]]+)\]: (.*)/gm;

	const custom: Macro[] = [];
	let macroMatch: RegExpExecArray = macroRegex.exec(md);
	while (macroMatch) {
		const macroText: string = macroMatch[1].trim();
		const fullMatch: string = macroMatch[0];
		let firstSpaceIndex: number = macroText.indexOf(' ');
		if (firstSpaceIndex === -1) {
			firstSpaceIndex = macroText.indexOf('\n');
		}
		let name: string;
		let argsString: string
		if (firstSpaceIndex === -1) {
			name = macroText;
			argsString = '';
		} else {
			name = macroText.substr(0, firstSpaceIndex).trim();
			argsString = macroText
				.substr(firstSpaceIndex + 1, macroText.length)
				.trim()
				.replace(/\n/g, ' ')
				.replace(/\t/g, ' ')
				.replace(/ {2}/g, ' ')
				.trim();
		}
		const $: cheerio = cheerio.load(`<div ${argsString}></div>`);
		const args: unknown = {
			...$('div').attr()
		};
		custom.push({
			name,
			args,
			fullMatch,
		});
		macroMatch = macroRegex.exec(md);
	}

	const img: ParsedImage[] = [];
	const links: ParsedLink[] = [];
	let imageOrLinkMatch: RegExpExecArray = inlineImgOrLinkRegex.exec(md);
	while (imageOrLinkMatch) {
		const fullMatch: string = imageOrLinkMatch[0].trim();
		inlineImgPartsRexex.lastIndex = 0;
		const partsMatch: RegExpExecArray = inlineImgPartsRexex.exec(fullMatch);
		const altText: string = partsMatch[1] || '';
		const urlAndTitle: string = partsMatch[2];
		let src: string;
		let title: string;
		if (urlAndTitle.startsWith('[[')) {
			const endOfMacroCall: number = urlAndTitle.indexOf(']]');
			src = urlAndTitle.substr(0, endOfMacroCall + 2);
			title = urlAndTitle.substr(endOfMacroCall+2, urlAndTitle.length).trim();
		} else {
			const split: string[] = urlAndTitle.split(' ');
			src = split.shift();
			title = split.join(' ').trim();
		}
		if (title.length && title.startsWith('"') && title.endsWith('"')) {
			title = title.substr(1, title.length - 2);
		} else if (title.length) {
			throw new Error(`Title should be wrapped in double quotes: ${title}`)
		}
		if (fullMatch.startsWith('!')) {
			img.push({
				src,
				title,
				altText,
				fullMatch
			});
		} else {
			links.push({
				href: src,
				title,
				altText,
				fullMatch
			});
		}
		imageOrLinkMatch = inlineImgOrLinkRegex.exec(md);
	}

	const references: ParsedReferences = {};
	let referencesMatch: RegExpExecArray = referenceValsRegex.exec(md);
	while (referencesMatch) {
		const fullMatch: string = referencesMatch[0].trim();
		const refKey: string = referencesMatch[1].trim();
		const urlAndTitle: string = referencesMatch[2].trim();
		const split: string[] = urlAndTitle.split(' ');
		const value: string = split.shift();
		let title: string = split.join(' ').trim();
		if (title.length && title.startsWith('"') && title.endsWith('"')) {
			title = title.substr(1, title.length - 2);
		} else if (title.length) {
			throw new Error(`Title should be wrapped in double quotes: ${title}`)
		}
		if (references[refKey]) {
			throw new Error(`duplicate reference key encountered ${refKey}`);
		}
		references[refKey] = {
			value,
			fullMatch,
			title
		};
		referencesMatch = referenceValsRegex.exec(md);
	}

	// TODO parse reference links, reconcile with references

	return {
		custom,
		img,
		references,
		links
	};
}
