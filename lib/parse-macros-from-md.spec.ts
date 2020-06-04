import { parseMacrosFromMd } from "@lib/parse-macros-from-md";
import assert from "assert";
import { ParsedMacros } from "./entries";

export async function test(): Promise<void> {
	describe( 'parseMacrosFromMd', () => {
        it('works with no args', () => {
			const macroText: string = `[[sampleMacro]]`;
			const macros: ParsedMacros = parseMacrosFromMd(macroText);
			assert.deepEqual(macros.custom, [{
				name: 'sampleMacro',
				args: {},
				fullMatch: macroText,
			}])
		});

		it('works with a single macro with one arg', () => {
			const macroText: string = `[[youtube url="test"]]`;
			const macros: ParsedMacros = parseMacrosFromMd(macroText);
			assert.deepEqual(macros.custom, [{
				name: 'youtube',
				args: {url: 'test'},
				fullMatch: macroText,
			}])
		});

		it('can parse multi-line arguments', () => {
			const macroText: string = `[[youtube
				url="test"
				arg1="val1"
			]]`;
			const macros: ParsedMacros = parseMacrosFromMd(macroText);
			assert.deepEqual(macros.custom, [{
				name: 'youtube',
				args: {url: 'test', arg1: 'val1'},
				fullMatch: macroText,
			}])
		});

		it('captures multiple macros', () => {
			const macro0Text: string = `[[youtube url="test1"]]`;
			const macro1Text: string = `[[youtube
				url="test2"
				arg1="val1"
			]]`;
			const md: string = `
				test string ${macro0Text}
				test string ${macro1Text}
			`;
			const macros: ParsedMacros = parseMacrosFromMd(md);
			assert.deepEqual(macros.custom[0], {
				name: 'youtube',
				args: {url: 'test1'},
				fullMatch: macro0Text,
			});

			assert.deepEqual(macros.custom[1], {
				name: 'youtube',
				args: {url: 'test2', arg1: 'val1'},
				fullMatch: macro1Text,
			})
		});

		it('captures image macros', () => {
			const macro0Text: string = `![alt text](www.example.com/example.png "Title Text")`;
			const macro1Text: string = `![alt text2](www.example.com/example.png "Title Text2")`;
			const md: string = `
				test string ${macro0Text}
				test string ${macro1Text}
			`;
			const macros: ParsedMacros = parseMacrosFromMd(md);
			const expected: ParsedMacros = {
				custom: [],
				img: [{
					altText: "alt text",
					src: "www.example.com/example.png",
					title: "Title Text",
					fullMatch: macro0Text
				}, {
					altText: "alt text2",
					src: "www.example.com/example.png",
					title: "Title Text2",
					fullMatch: macro1Text
				}],
				references: {},
				links: [],
			};
			assert.deepEqual(macros, expected);
		});

		it('captures image macros with no alt and title', () => {
			const macro0Text: string = `![](www.example.com/example.png "Title Text")`;
			const macro1Text: string = `![alt text2](www.example.com/example.png)`;
			const md: string = `
				test string ${macro0Text}
				test string ${macro1Text}
			`;
			const macros: ParsedMacros = parseMacrosFromMd(md);
			const expected: ParsedMacros = {
				custom: [],
				img: [{
					altText: "",
					src: "www.example.com/example.png",
					title: "Title Text",
					fullMatch: macro0Text
				}, {
					altText: "alt text2",
					src: "www.example.com/example.png",
					title: "",
					fullMatch: macro1Text
				}],
				references: {},
				links: [],
			};
			assert.deepEqual(macros, expected);
		});

		it('captures both types of macros together', () => {
			const macro0Text: string = `![alt text](www.example.com/example.png "Title Text")`;
			const macro1Text: string = `[[youtube
				url="test1"
			]]`;
			const md: string = `
				test string ${macro0Text}
				test string ${macro1Text}
			`;
			const macros: ParsedMacros = parseMacrosFromMd(md);
			const expected: ParsedMacros = {
				custom: [{
					name: 'youtube',
					args: {url: 'test1'},
					fullMatch: macro1Text,
				}],
				img: [{
					altText: "alt text",
					src: "www.example.com/example.png",
					title: "Title Text",
					fullMatch: macro0Text
				}],
				references: {},
				links: [],
			};
			assert.deepEqual(macros, expected);
		});

		it('captures references', () => {
			const md: string = `[arbitrary case-insensitive reference text]: https://www.mozilla.org
[1]: http://slashdot.org
[link text itself]: http://www.reddit.com
[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 2"`;
			const macros: ParsedMacros = parseMacrosFromMd(md);
			const expected: ParsedMacros = {
				custom: [],
				img: [],
				references: {
					'arbitrary case-insensitive reference text': {
						value: 'https://www.mozilla.org',
						fullMatch: '[arbitrary case-insensitive reference text]: https://www.mozilla.org',
						title: '',
					},
					'1': {
						value: 'http://slashdot.org',
						fullMatch: '[1]: http://slashdot.org',
						title: '',
					},
					'link text itself': {
						value: 'http://www.reddit.com',
						fullMatch: '[link text itself]: http://www.reddit.com',
						title: '',
					},
					'logo': {
						value: 'https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png',
						fullMatch: '[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 2"',
						title: "Logo Title Text 2",
					}
				},
				links: [],
			};
			assert.deepEqual(macros, expected);
		});

		it('captures links', () => {
			const md: string = `[hello2]([[getLink test="what"]] "test title tex2t")
[hello](www.example.com "test title text")
![huh](www.example.com/test.png "test img title text")]
[hello][wat]
![hello][wat2]

[wat]: www.example3.com
[wat2]: www.example4.com "Test title"
`;
			const macros: ParsedMacros = parseMacrosFromMd(md);
			const expected: ParsedMacros = {
				custom: [{
					args: {
						test: "what",
					},
					fullMatch: "[[getLink test=\"what\"]]",
					name: "getLink",
				}],
				img: [{
					title: 'test img title text',
					src: 'www.example.com/test.png',
					altText: 'huh',
					fullMatch: `![huh](www.example.com/test.png "test img title text")`
				}],
				references: {
					wat: {
						value: 'www.example3.com',
						title: '',
						fullMatch: '[wat]: www.example3.com',
					},
					wat2: {
						value: 'www.example4.com',
						title: 'Test title',
						fullMatch: '[wat2]: www.example4.com "Test title"',
					}
				},
				links: [{
					title: 'test title tex2t',
					href: '[[getLink test="what"]]',
					altText: 'hello2',
					fullMatch: `[hello2]([[getLink test="what"]] "test title tex2t")`
				}, {
					title: 'test title text',
					href: 'www.example.com',
					altText: 'hello',
					fullMatch: `[hello](www.example.com "test title text")`
				}],
			};
			assert.deepEqual(macros, expected);
		});
	} );
}
