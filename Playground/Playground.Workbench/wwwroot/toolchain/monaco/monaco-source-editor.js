const monacoBasePath = "./_content/Playground.Workbench/lib/monaco/vs";
const editors = new Map();
const assetVersion = new URL(import.meta.url).searchParams.get("v") ?? "";

let loadPromise;
let instructionDocsPromise;
let nextEditorId = 1;
let asm6502HoverProviderRegistered = false;
let instructionDocs = {};

export async function createEditor(container, dotNetReference, value) {
    await Promise.all([loadMonaco(), loadInstructionDocs()]);
    registerAsm6502Language();

    const editor = monaco.editor.create(container, {
        value: value ?? "",
        language: "asm6502",
        theme: "vs-dark",
        automaticLayout: true,
        fontFamily: "Consolas, 'Cascadia Mono', monospace",
        fontSize: 15,
        lineHeight: 22,
        minimap: { enabled: false },
        glyphMargin: true,
        folding: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        roundedSelection: false,
        tabSize: 4,
        insertSpaces: true,
        wordBasedSuggestions: "off",
    });

    const id = `asm6502-${nextEditorId++}`;
    const host = {
        editor,
        changeSubscription: null,
        activeDecorations: [],
        suppressChange: false,
    };

    host.changeSubscription = editor.onDidChangeModelContent(() => {
        if (host.suppressChange) {
            return;
        }

        dotNetReference.invokeMethodAsync("OnEditorTextChanged", editor.getValue());
    });

    editors.set(id, host);

    return id;
}

export function setValue(id, value) {
    const host = getEditorHost(id);
    const nextValue = value ?? "";
    if (host.editor.getValue() === nextValue) {
        return;
    }

    host.suppressChange = true;
    host.editor.setValue(nextValue);
    host.suppressChange = false;
}

export function setActiveLine(id, lineNumber) {
    const host = getEditorHost(id);
    const editor = host.editor;
    const model = editor.getModel();
    const normalizedLineNumber = Number(lineNumber);

    if (!model || !Number.isInteger(normalizedLineNumber) || normalizedLineNumber < 1 || normalizedLineNumber > model.getLineCount()) {
        host.activeDecorations = editor.deltaDecorations(host.activeDecorations, []);
        return;
    }

    host.activeDecorations = editor.deltaDecorations(host.activeDecorations, [
        {
            range: new monaco.Range(normalizedLineNumber, 1, normalizedLineNumber, 1),
            options: {
                isWholeLine: true,
                className: "current-instruction-line",
                glyphMarginClassName: "current-instruction-glyph",
                linesDecorationsClassName: "current-instruction-line-number",
                lineNumberClassName: "current-instruction-line-number",
            },
        },
    ]);

    editor.revealLineInCenterIfOutsideViewport(normalizedLineNumber);
}

export function disposeEditor(id) {
    const host = editors.get(id);
    if (!host) {
        return;
    }

    host.changeSubscription.dispose();
    host.editor.dispose();
    editors.delete(id);
}

function getEditorHost(id) {
    const host = editors.get(id);
    if (!host) {
        throw new Error(`Unknown Monaco editor '${id}'.`);
    }

    return host;
}

function loadMonaco() {
    loadPromise ??= new Promise((resolve, reject) => {
        if (globalThis.monaco) {
            resolve();
            return;
        }

        const loader = document.createElement("script");
        loader.src = withAssetVersion(`${monacoBasePath}/loader.js`, document.baseURI);
        loader.onload = () => {
            const requireConfig = { paths: { vs: monacoBasePath } };
            if (assetVersion) {
                requireConfig.urlArgs = `v=${encodeURIComponent(assetVersion)}`;
            }

            globalThis.require.config(requireConfig);
            globalThis.require(["vs/editor/editor.main"], resolve, reject);
        };
        loader.onerror = () => reject(new Error("Failed to load Monaco editor."));
        document.head.appendChild(loader);
    });

    return loadPromise;
}

function loadInstructionDocs() {
    instructionDocsPromise ??= import(withAssetVersion("./6502-instruction-docs.js"))
        .then((module) => {
            instructionDocs = module.instructionDocs ?? {};
        });

    return instructionDocsPromise;
}

function withAssetVersion(path, baseUrl = import.meta.url) {
    const url = new URL(path, baseUrl);
    if (assetVersion) {
        url.searchParams.set("v", assetVersion);
    }

    return url.href;
}

function registerAsm6502Language() {
    const languageExists = monaco.languages.getLanguages().some((language) => language.id === "asm6502");
    if (!languageExists) {
        monaco.languages.register({ id: "asm6502" });
        monaco.languages.setMonarchTokensProvider("asm6502", {
            defaultToken: "",
            ignoreCase: true,
            tokenizer: {
                root: [
                    [/;.*/, "comment"],
                    [/\.[a-z_][\w.]*/, "keyword"],
                    [/[a-z_.$@?][\w.$@?]*:/, "type.identifier"],
                    [/\b(lda|ldx|ldy|sta|stx|sty|tax|tay|txa|tya|tsx|txs|pha|php|pla|plp|and|eor|ora|bit|adc|sbc|cmp|cpx|cpy|inc|inx|iny|dec|dex|dey|asl|lsr|rol|ror|jmp|jsr|rts|brk|rti|bcc|bcs|beq|bmi|bne|bpl|bvc|bvs|clc|cld|cli|clv|sec|sed|sei|nop)\b/, "keyword"],
                    [/#?\$[0-9a-f]+/, "number.hex"],
                    [/#?%[01]+/, "number.binary"],
                    [/#?\b\d+\b/, "number"],
                    [/"[^"]*"/, "string"],
                    [/[,:#()+\-*/]/, "delimiter"],
                ],
            },
        });
    }

    if (!asm6502HoverProviderRegistered) {
        monaco.languages.registerHoverProvider("asm6502", {
            provideHover(model, position) {
                const word = model.getWordAtPosition(position);
                if (!word) {
                    return null;
                }

                const mnemonic = word.word.toUpperCase();
                const doc = instructionDocs[mnemonic];
                if (!doc || isInsideComment(model, position, word) || isLabelDefinition(model, position.lineNumber, word)) {
                    return null;
                }

                return {
                    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                    contents: buildInstructionHoverContents(mnemonic, doc),
                };
            },
        });
        asm6502HoverProviderRegistered = true;
    }
}

function buildInstructionHoverContents(mnemonic, doc) {
    const contents = [
        { value: `**${mnemonic} - ${doc.title}**` },
        { value: doc.summary },
        { value: `**Operation:** \`${doc.operation}\`` },
        { value: `**Touches:** ${doc.touches}` },
        { value: buildAddressingModesTable(doc.modes) },
    ];

    if (doc.notes?.length) {
        contents.push({ value: `**Notes:**\n${doc.notes.map((note) => `- ${note}`).join("\n")}` });
    }

    contents.push({
        value: `[6502 reference](${doc.referenceUrl})`,
        isTrusted: true,
    });

    return contents;
}

function buildAddressingModesTable(modes) {
    const rows = modes.map((item) => {
        const notes = item.notes ? ` ${item.notes}` : "";
        return `| ${item.name} | \`${item.syntax || " "}\` | \`${item.opcode}\` | ${item.bytes} | ${item.cycles}${notes} |`;
    });

    return [
        "| Mode | Syntax | Opcode | Bytes | Cycles |",
        "| --- | --- | --- | ---: | --- |",
        ...rows,
    ].join("\n");
}

function isInsideComment(model, position, word) {
    const line = model.getLineContent(position.lineNumber);
    const commentIndex = line.indexOf(";");
    return commentIndex >= 0 && commentIndex < word.startColumn - 1;
}

function isLabelDefinition(model, lineNumber, word) {
    const line = model.getLineContent(lineNumber);
    const beforeWord = line.slice(0, word.startColumn - 1);
    const afterWord = line.slice(word.endColumn - 1);
    return beforeWord.trim().length === 0 && afterWord.trimStart().startsWith(":");
}
